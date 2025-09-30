import { useState, useEffect } from "react"
import { Flex, Text } from '@radix-ui/themes'
import { supabase } from "../../lib/supabase"
import { Skeleton } from '../ui'

const ParticipantSelector = ({ workspaceId, currentUserId, selectedParticipants, onParticipantsChange }) => {
    const [workspaceMembers, setWorkspaceMembers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (workspaceId) {
            fetchWorkspaceMembers()
        }
    }, [workspaceId])

    const fetchWorkspaceMembers = async () => {
        try {
            console.log('Fetching workspace members for workspace:', workspaceId)
            console.log('Current user:', currentUserId)

            // First, get workspace members
            const { data: memberData, error: memberError } = await supabase
                .from('workspace_members')
                .select('user_id, role')
                .eq('workspace_id', workspaceId)

            if (memberError) {
                console.error('Error fetching workspace members:', memberError)
                return
            }

            console.log('Raw member data:', memberData)

            if (!memberData || memberData.length === 0) {
                console.log('No members found for workspace')
                setWorkspaceMembers([])
                return
            }

            // Get user emails for the members
            const userIds = memberData.map(member => member.user_id)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('auth_id, email')
                .in('auth_id', userIds)

            if (userError) {
                console.error('Error fetching user data:', userError)
                // Continue with member data even if user data fails
                const otherMembers = memberData.filter(member => member.user_id !== currentUserId)
                setWorkspaceMembers(otherMembers)
                return
            }

            console.log('User data:', userData)

            // Combine member and user data
            const membersWithEmails = memberData.map(member => {
                const user = userData?.find(u => u.auth_id === member.user_id)
                return {
                    ...member,
                    email: user?.email || member.user_id
                }
            })

            console.log('Combined data:', membersWithEmails)
            console.log('Current user ID (email):', currentUserId)

            // Filter out current user since they'll be added as host automatically
            // Compare by email since currentUserId is user?.email
            const otherMembers = membersWithEmails.filter(member => {
                const isCurrentUser = member.email === currentUserId
                console.log(`Comparing member ${member.email} with current user ${currentUserId}: ${isCurrentUser ? 'MATCH (filtering out)' : 'different (keeping)'}`)
                return !isCurrentUser
            })
            console.log('Other members (excluding current user):', otherMembers)

            setWorkspaceMembers(otherMembers)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleParticipantToggle = (userId) => {
        const updatedParticipants = selectedParticipants.includes(userId)
            ? selectedParticipants.filter(id => id !== userId)
            : [...selectedParticipants, userId]

        onParticipantsChange(updatedParticipants)
    }

    if (loading) {
        return (
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                    참가자 선택
                </label>
                <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-36" />
                    <Text size="1" color="gray">멤버 목록 로딩 중...</Text>
                </div>
            </div>
        )
    }

    if (workspaceMembers.length === 0) {
        return (
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                    참가자 선택
                </label>
                <div className="p-4 bg-gray-50 rounded-md">
                    <Text size="2" color="gray">
                        이 워크스페이스에 다른 멤버가 없습니다.
                    </Text>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
                참가자 초대 (선택사항)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                {workspaceMembers.map((member) => (
                    <div
                        key={member.user_id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleParticipantToggle(member.user_id)}
                    >
                        <input
                            type="checkbox"
                            checked={selectedParticipants.includes(member.user_id)}
                            onChange={() => handleParticipantToggle(member.user_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Text size="2">
                            {member.email}
                            {member.role === 'admin' && (
                                <span className="text-xs text-gray-500 ml-1">(관리자)</span>
                            )}
                        </Text>
                    </div>
                ))}
            </div>
            <Text size="1" color="gray">
                {selectedParticipants.length > 0
                    ? `${selectedParticipants.length}명을 회의에 초대합니다.`
                    : "초대할 참가자를 선택하세요."
                }
            </Text>
        </div>
    )
}

export default ParticipantSelector
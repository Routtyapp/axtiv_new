import { useState, useEffect, useCallback } from 'react'
import { User, Circle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Badge } from '../ui'
import { findOrCreateDirectChatRoom } from '../../utils/directMessageUtils'

const DirectMessageList = ({ workspaceId, currentUserId, currentUserEmail, onUserSelect, selectedUserId }) => {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [creatingChatRoom, setCreatingChatRoom] = useState(null)

    const fetchWorkspaceMembers = useCallback(async () => {
        try {
            // ✅ 최적화: JOIN으로 단일 쿼리로 변경
            const { data: membersWithUsers, error } = await supabase
                .from('workspace_members')
                .select(`
                    user_id,
                    is_online,
                    last_seen,
                    users!workspace_members_user_id_fkey (
                        email
                    )
                `)
                .eq('workspace_id', workspaceId)
                .neq('user_id', currentUserId)

            if (error) {
                console.error('Error fetching workspace members:', error)
                return
            }

            // 데이터 변환
            const membersWithDetails = (membersWithUsers || []).map(member => ({
                user_id: member.user_id,
                is_online: member.is_online,
                last_seen: member.last_seen,
                email: member.users?.email || member.user_id,
                displayName: member.users?.email?.split('@')[0] || 'Unknown User'
            }))

            setMembers(membersWithDetails)
        } catch (error) {
            console.error('Error fetching direct message users:', error)
        } finally {
            setLoading(false)
        }
    }, [workspaceId, currentUserId])

    useEffect(() => {
        if (workspaceId) {
            fetchWorkspaceMembers()
        }
    }, [workspaceId, fetchWorkspaceMembers])

    const handleUserClick = async (member) => {
        if (creatingChatRoom === member.user_id) return

        setCreatingChatRoom(member.user_id)

        try {
            const chatRoom = await findOrCreateDirectChatRoom(
                workspaceId,
                currentUserId,
                member.user_id,
                currentUserEmail,
                member.email
            )

            if (onUserSelect) {
                onUserSelect(chatRoom.id, member.displayName)
            }
        } catch (error) {
            console.error('Error creating/finding direct chat:', error)
            alert('채팅방을 생성할 수 없습니다.')
        } finally {
            setCreatingChatRoom(null)
        }
    }

    if (loading) {
        return (
            <div className="space-y-2 px-2">
                <div className="text-xs text-gray-500">멤버 목록을 불러오는 중...</div>
            </div>
        )
    }

    if (members.length === 0) {
        return (
            <div className="space-y-2 px-2">
                <div className="text-xs text-gray-500">대화할 수 있는 멤버가 없습니다.</div>
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {members.map((member) => {
                const isLoading = creatingChatRoom === member.user_id

                return (
                    <Button
                        key={member.user_id}
                        variant="ghost"
                        onClick={() => handleUserClick(member)}
                        disabled={isLoading}
                        className="w-full p-2 h-auto flex items-center justify-start hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center gap-2 w-full">
                            <div className="relative">
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="h-3 w-3 text-gray-500" />
                                </div>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium truncate">
                                    {member.displayName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {isLoading ? '채팅방 생성 중...' : member.email}
                                </div>
                            </div>
                            {/* TODO: 읽지 않은 메시지 수 표시 */}
                        </div>
                    </Button>
                )
            })}
        </div>
    )
}

export default DirectMessageList
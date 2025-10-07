import { useState, useEffect } from 'react'
import { Dialog, Input, Button, Badge } from '../ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Users, X } from 'lucide-react'

const CreateChatRoomDialog = ({
    open,
    onOpenChange,
    onRoomCreated,
    workspaceId
}) => {
    const { user } = useAuth()
    const [roomName, setRoomName] = useState('')
    const [roomDescription, setRoomDescription] = useState('')
    const [workspaceMembers, setWorkspaceMembers] = useState([])
    const [selectedMembers, setSelectedMembers] = useState([])
    const [creating, setCreating] = useState(false)
    const [loading, setLoading] = useState(true)

    // 워크스페이스 멤버 가져오기
    useEffect(() => {
        if (open && workspaceId) {
            fetchWorkspaceMembers()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, workspaceId])

    // 다이얼로그가 열릴 때마다 초기화
    useEffect(() => {
        if (open) {
            setRoomName('')
            setRoomDescription('')
            setSelectedMembers([])
            setCreating(false)
        }
    }, [open])

    const fetchWorkspaceMembers = async () => {
        setLoading(true)
        try {
            // 워크스페이스 멤버들 가져오기
            const { data: memberData, error: memberError } = await supabase
                .from('workspace_members')
                .select('user_id, role')
                .eq('workspace_id', workspaceId)

            if (memberError) {
                console.error('Error fetching workspace members:', memberError)
                return
            }

            if (!memberData || memberData.length === 0) {
                setWorkspaceMembers([])
                return
            }

            // 사용자 정보 가져오기
            const userIds = memberData.map(m => m.user_id)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('user_id, email, user_name')
                .in('user_id', userIds)

            if (userError) {
                console.error('Error fetching user data:', userError)
                return
            }

            // 데이터 결합
            const membersWithDetails = memberData
                .map(member => {
                    const userDetail = userData.find(u => u.user_id === member.user_id)
                    if (!userDetail) return null

                    return {
                        id: member.user_id,
                        email: userDetail.email,
                        displayName: userDetail.user_name || userDetail.email?.split('@')[0] || 'Unknown User',
                        role: member.role
                    }
                })
                .filter(Boolean)
                .filter(member => member.id !== user?.id) // 자신 제외

            setWorkspaceMembers(membersWithDetails)
        } catch (error) {
            console.error('Error fetching workspace members:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMemberToggle = (memberId) => {
        setSelectedMembers(prev => {
            if (prev.includes(memberId)) {
                return prev.filter(id => id !== memberId)
            } else {
                return [...prev, memberId]
            }
        })
    }

    const removeMember = (memberId) => {
        setSelectedMembers(prev => prev.filter(id => id !== memberId))
    }

    const handleCreateRoom = async () => {
        if (!roomName.trim()) {
            alert('채팅방 이름을 입력해주세요.')
            return
        }

        if (!user?.id) {
            alert('사용자 정보를 찾을 수 없습니다.')
            return
        }

        setCreating(true)
        try {
            // 1. 채팅방 생성
            const { data: roomData, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({
                    workspace_id: workspaceId,
                    name: roomName.trim(),
                    description: roomDescription.trim() || null,
                    created_by: user.id,
                    is_active: true,
                    is_default: false
                })
                .select()
                .single()

            if (roomError) {
                console.error('Error creating chat room:', roomError)
                alert('채팅방 생성 중 오류가 발생했습니다.')
                return
            }

            // 2. 생성자를 admin으로 추가
            const membersToAdd = [
                {
                    chat_room_id: roomData.id,
                    user_id: user.id,
                    role: 'admin',
                    invited_by: user.id
                },
                // 선택된 멤버들을 member로 추가
                ...selectedMembers.map(memberId => ({
                    chat_room_id: roomData.id,
                    user_id: memberId,
                    role: 'member',
                    invited_by: user.id
                }))
            ]

            const { error: membersError } = await supabase
                .from('chat_room_members')
                .insert(membersToAdd)

            if (membersError) {
                console.error('Error adding room members:', membersError)
                alert('멤버 추가 중 오류가 발생했습니다.')
                return
            }

            // 성공 처리
            alert(`"${roomName}" 채팅방이 성공적으로 생성되었습니다!`)
            onOpenChange(false)

            // 부모 컴포넌트에 새 채팅방 생성 알림
            if (onRoomCreated) {
                onRoomCreated(roomData)
            }

        } catch (error) {
            console.error('Error creating chat room:', error)
            alert('채팅방 생성 중 오류가 발생했습니다.')
        } finally {
            setCreating(false)
        }
    }

    const handleClose = () => {
        if (!creating) {
            onOpenChange(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title="새 채팅방 만들기"
            description="팀원들과 소통할 새로운 채팅방을 만들어보세요."
            confirmText={creating ? "생성 중..." : "채팅방 생성"}
            cancelText="취소"
            onConfirm={handleCreateRoom}
            onCancel={handleClose}
            confirmDisabled={creating || !roomName.trim()}
        >
            <div className="space-y-6">
                {/* 채팅방 정보 */}
                <div className="space-y-4">
                    <Input
                        label="채팅방 이름 *"
                        placeholder="채팅방 이름을 입력하세요"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        disabled={creating}
                        maxLength={50}
                    />

                    <Input
                        label="채팅방 설명 (선택사항)"
                        placeholder="채팅방에 대한 간단한 설명을 입력하세요"
                        multiline
                        rows={3}
                        value={roomDescription}
                        onChange={(e) => setRoomDescription(e.target.value)}
                        disabled={creating}
                        maxLength={200}
                    />
                </div>

                {/* 멤버 초대 */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">멤버 초대</span>
                        <span className="text-sm text-gray-500">({selectedMembers.length}명 선택)</span>
                    </div>

                    {/* 선택된 멤버 표시 */}
                    {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedMembers.map(memberId => {
                                const member = workspaceMembers.find(m => m.id === memberId)
                                return (
                                    <Badge key={memberId} variant="secondary" className="pr-1">
                                        {member?.displayName}
                                        <button
                                            onClick={() => removeMember(memberId)}
                                            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                                            disabled={creating}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )
                            })}
                        </div>
                    )}

                    {/* 멤버 선택 목록 */}
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                멤버 목록을 불러오는 중...
                            </div>
                        ) : workspaceMembers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                초대할 수 있는 멤버가 없습니다.
                            </div>
                        ) : (
                            workspaceMembers.map(member => (
                                <div
                                    key={member.id}
                                    className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer ${
                                        selectedMembers.includes(member.id) ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={() => handleMemberToggle(member.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(member.id)}
                                            onChange={() => handleMemberToggle(member.id)}
                                            className="rounded"
                                            disabled={creating}
                                        />
                                        <div>
                                            <div className="font-medium text-sm">{member.displayName}</div>
                                            <div className="text-xs text-gray-500">{member.email}</div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {member.role === 'admin' ? '워크스페이스 관리자' : '멤버'}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="text-sm text-gray-500">
                    💡 채팅방 생성 후에도 언제든지 멤버를 추가할 수 있습니다.
                </div>
            </div>
        </Dialog>
    )
}

export default CreateChatRoomDialog
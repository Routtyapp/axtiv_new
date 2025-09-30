import { useState, useEffect } from 'react'
import { LogOut, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '../ui'
import { supabase } from '../../lib/supabase'

const LeaveChatRoomDialog = ({
    open,
    onOpenChange,
    onLeaveSuccess,
    chatRoom,
    currentUserId
}) => {
    const [loading, setLoading] = useState(false)
    const [currentUserRole, setCurrentUserRole] = useState(null)
    const [roomMemberCount, setRoomMemberCount] = useState(0)
    const [adminCount, setAdminCount] = useState(0)

    // 채팅방 정보 가져오기
    useEffect(() => {
        if (open && chatRoom?.id && currentUserId) {
            fetchRoomInfo()
        }
    }, [open, chatRoom?.id, currentUserId])

    const fetchRoomInfo = async () => {
        try {
            // 현재 사용자의 역할 및 멤버 정보 가져오기
            const { data: members, error } = await supabase
                .from('chat_room_members')
                .select('user_id, role')
                .eq('chat_room_id', chatRoom.id)

            if (error) {
                console.error('Error fetching room members:', error)
                return
            }

            const currentMember = members?.find(m => m.user_id === currentUserId)
            const admins = members?.filter(m => m.role === 'admin') || []

            setCurrentUserRole(currentMember?.role || null)
            setRoomMemberCount(members?.length || 0)
            setAdminCount(admins.length)
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleLeaveChatRoom = async () => {
        if (!chatRoom?.id || !currentUserId) {
            alert('채팅방 정보를 찾을 수 없습니다.')
            return
        }

        // 기본 채팅방은 나갈 수 없음
        if (chatRoom.is_default) {
            alert('기본 채팅방은 나갈 수 없습니다.')
            return
        }

        // 마지막 admin인 경우 경고
        if (currentUserRole === 'admin' && adminCount === 1 && roomMemberCount > 1) {
            if (!confirm('당신이 마지막 관리자입니다. 나가면 채팅방에 관리자가 없게 됩니다. 계속하시겠습니까?')) {
                return
            }
        }

        setLoading(true)

        try {
            // 1. chat_room_members에서 사용자 삭제
            const { error: memberError } = await supabase
                .from('chat_room_members')
                .delete()
                .eq('chat_room_id', chatRoom.id)
                .eq('user_id', currentUserId)

            if (memberError) {
                console.error('Error leaving chat room:', memberError)
                alert('채팅방 나가기 중 오류가 발생했습니다.')
                return
            }

            // 2. 읽음 상태 삭제 (선택사항)
            const { error: readStatusError } = await supabase
                .from('chat_read_status')
                .delete()
                .eq('chat_room_id', chatRoom.id)
                .eq('user_id', currentUserId)

            if (readStatusError) {
                console.error('Error deleting read status:', readStatusError)
                // 읽음 상태 삭제 실패는 치명적이지 않으므로 계속 진행
            }

            // 3. 마지막 멤버인 경우 채팅방 삭제
            if (roomMemberCount === 1) {
                // 3-1. 채팅방의 모든 메시지 삭제
                const { error: messagesError } = await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('chat_room_id', chatRoom.id)

                if (messagesError) {
                    console.error('Error deleting chat messages:', messagesError)
                    // 메시지 삭제 실패는 치명적이지 않으므로 계속 진행
                }

                // 3-2. 채팅방의 모든 읽음 상태 삭제
                const { error: allReadStatusError } = await supabase
                    .from('chat_read_status')
                    .delete()
                    .eq('chat_room_id', chatRoom.id)

                if (allReadStatusError) {
                    console.error('Error deleting all read status:', allReadStatusError)
                    // 읽음 상태 삭제 실패는 치명적이지 않으므로 계속 진행
                }

                // 3-3. 채팅방 삭제
                const { error: deleteChatRoomError } = await supabase
                    .from('chat_rooms')
                    .delete()
                    .eq('id', chatRoom.id)

                if (deleteChatRoomError) {
                    console.error('Error deleting chat room:', deleteChatRoomError)
                    // 채팅방 삭제 실패는 치명적이지 않으므로 계속 진행
                }
            }

            // 성공
            onOpenChange(false)
            if (onLeaveSuccess) {
                onLeaveSuccess(chatRoom.id)
            }
        } catch (error) {
            console.error('Error:', error)
            alert('채팅방 나가기 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        if (!loading) {
            onOpenChange(false)
        }
    }

    if (!chatRoom) return null

    // 기본 채팅방인 경우
    if (chatRoom.is_default) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            기본 채팅방
                        </DialogTitle>
                        <DialogDescription>
                            기본 채팅방은 나갈 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-gray-600">
                            "{chatRoom.name}"는 워크스페이스의 기본 채팅방입니다.
                            모든 멤버가 참여해야 하므로 나갈 수 없습니다.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>
                            확인
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    // 일반 채팅방 나가기
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LogOut className="h-5 w-5 text-red-600" />
                        채팅방 나가기
                    </DialogTitle>
                    <DialogDescription>
                        정말로 이 채팅방을 나가시겠습니까?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                            {chatRoom.name}
                        </p>
                        {chatRoom.description && (
                            <p className="text-xs text-gray-500">
                                {chatRoom.description}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            현재 멤버: {roomMemberCount}명
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                            • 채팅방을 나가면 이전 메시지를 볼 수 없습니다.
                        </p>
                        <p className="text-sm text-gray-600">
                            • 다시 참여하려면 다른 멤버의 초대가 필요합니다.
                        </p>
                        {currentUserRole === 'admin' && adminCount === 1 && roomMemberCount > 1 && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-800">
                                    당신이 마지막 관리자입니다. 나가면 채팅방에 관리자가 없게 됩니다.
                                </p>
                            </div>
                        )}
                        {roomMemberCount === 1 && (
                            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-orange-800">
                                    당신이 마지막 멤버입니다. 나가면 채팅방이 완전히 삭제됩니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleLeaveChatRoom}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        {loading ? '나가는 중...' : '채팅방 나가기'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default LeaveChatRoomDialog
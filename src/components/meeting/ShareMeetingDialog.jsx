import { useState, useEffect } from "react"
import { Hash, Share2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '../ui'
import MeetingMessageCard from './MeetingMessageCard'

const ShareMeetingDialog = ({
    open,
    onOpenChange,
    meeting,
    workspaceId,
    currentUserId
}) => {
    const [chatRooms, setChatRooms] = useState([])
    const [selectedRoomId, setSelectedRoomId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [fetchingRooms, setFetchingRooms] = useState(true)
    const [currentUserName, setCurrentUserName] = useState('')

    // 채팅방 목록 가져오기
    useEffect(() => {
        if (open && workspaceId) {
            fetchChatRooms()
            fetchCurrentUserName()
        }
    }, [open, workspaceId])

    const fetchChatRooms = async () => {
        setFetchingRooms(true)
        try {
            const { data: rooms, error } = await supabase
                .from('chat_rooms')
                .select('id, name, description, is_default')
                .eq('workspace_id', workspaceId)
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching chat rooms:', error)
                return
            }

            setChatRooms(rooms || [])

            // 기본 채팅방이 있으면 자동 선택
            const defaultRoom = rooms?.find(room => room.is_default)
            if (defaultRoom) {
                setSelectedRoomId(defaultRoom.id)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setFetchingRooms(false)
        }
    }

    const fetchCurrentUserName = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('email')
                .eq('auth_id', currentUserId)
                .single()

            if (!error && data) {
                setCurrentUserName(data.email?.split('@')[0] || 'Anonymous')
            }
        } catch (error) {
            console.error('Error fetching user name:', error)
            setCurrentUserName('Anonymous')
        }
    }

    // 회의 정보를 JSON으로 변환
    const formatMeetingData = () => ({
        type: "meeting_share",
        meeting_id: meeting.id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        location: meeting.location || null,
        participants: meeting.meeting_participants || [],
        description: meeting.description || null
    })

    // 채팅방에 회의 정보 공유
    const handleShare = async () => {
        if (!selectedRoomId) {
            alert('공유할 채팅방을 선택해주세요.')
            return
        }

        setLoading(true)

        try {
            const meetingData = formatMeetingData()
            const messageContent = JSON.stringify(meetingData)

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    workspace_id: workspaceId,
                    chat_room_id: selectedRoomId,
                    sender_id: currentUserId,
                    sender_name: currentUserName,
                    content: messageContent,
                    message_type: 'meeting_share',
                    has_files: false
                })

            if (error) {
                console.error('Error sharing meeting:', error)
                alert('회의 정보 공유 중 오류가 발생했습니다.')
                return
            }

            // 성공
            onOpenChange(false)
            setSelectedRoomId(null)
        } catch (error) {
            console.error('Error:', error)
            alert('회의 정보 공유 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setSelectedRoomId(null)
        onOpenChange(false)
    }

    if (!meeting) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        회의 정보 공유
                    </DialogTitle>
                    <DialogDescription>
                        채팅방에 회의 정보를 공유합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 채팅방 선택 */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">
                            공유할 채팅방 선택 *
                        </label>

                        {fetchingRooms ? (
                            <div className="text-sm text-gray-500">채팅방 목록을 불러오는 중...</div>
                        ) : chatRooms.length === 0 ? (
                            <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-500">
                                공유할 수 있는 채팅방이 없습니다.
                            </div>
                        ) : (
                            <div className="border border-gray-300 rounded-md divide-y max-h-48 overflow-y-auto">
                                {chatRooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            selectedRoomId === room.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                        }`}
                                        onClick={() => setSelectedRoomId(room.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={selectedRoomId === room.id}
                                                onChange={() => setSelectedRoomId(room.id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <Hash className="h-4 w-4 text-gray-500" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900">{room.name}</span>
                                                    {room.is_default && (
                                                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                                            기본
                                                        </span>
                                                    )}
                                                </div>
                                                {room.description && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{room.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 미리보기 */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">
                            미리보기
                        </label>
                        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                            <MeetingMessageCard meetingData={formatMeetingData()} />
                        </div>
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
                        onClick={handleShare}
                        disabled={loading || !selectedRoomId || fetchingRooms}
                        className="min-w-[100px] flex items-center gap-2"
                    >
                        <Share2 className="h-4 w-4" />
                        {loading ? '공유 중...' : '공유하기'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ShareMeetingDialog
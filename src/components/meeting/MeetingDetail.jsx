import { useState } from "react"
import { Clock, MapPin, Users, Edit, Trash2, Calendar, User, Share2 } from 'lucide-react'
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase } from "../../lib/supabase"
import { Button, Card, Badge, Separator } from '../ui'
import EditMeetingDialog from './EditMeetingDialog'
import ShareMeetingDialog from './ShareMeetingDialog'

const MeetingDetail = ({ meeting, currentUserId, onMeetingDeleted, onMeetingUpdated }) => {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showShareDialog, setShowShareDialog] = useState(false)

    if (!meeting) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">회의를 선택해주세요</h3>
                <p className="text-gray-500">
                    왼쪽 목록에서 회의를 클릭하면 상세 정보를 확인할 수 있습니다.
                </p>
            </div>
        )
    }

    const formatDateTime = (dateTimeString) => {
        const date = new Date(dateTimeString)
        return format(date, 'yyyy년 M월 d일 (EEE) HH:mm', { locale: ko })
    }

    const getMeetingStatus = (startTime, endTime) => {
        const now = new Date()
        const start = new Date(startTime)
        const end = new Date(endTime)

        if (now < start) {
            return { status: 'upcoming', label: '예정', color: 'blue' }
        } else if (now >= start && now <= end) {
            return { status: 'ongoing', label: '진행중', color: 'green' }
        } else {
            return { status: 'completed', label: '완료', color: 'gray' }
        }
    }

    const isHost = () => {
        return meeting.meeting_participants?.some(
            participant => participant.user_id === currentUserId && participant.role === 'host'
        )
    }

    const handleDeleteMeeting = async () => {
        if (!confirm('정말 이 회의를 삭제하시겠습니까?')) {
            return
        }

        setIsDeleting(true)

        try {
            const { error } = await supabase
                .from('meetings')
                .delete()
                .eq('id', meeting.id)

            if (error) {
                console.error('Error deleting meeting:', error)
                alert('회의 삭제 중 오류가 발생했습니다.')
                return
            }

            onMeetingDeleted(meeting.id)
        } catch (error) {
            console.error('Error:', error)
            alert('회의 삭제 중 오류가 발생했습니다.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEditMeeting = () => {
        setShowEditDialog(true)
    }

    const handleMeetingUpdated = () => {
        setShowEditDialog(false)
        onMeetingUpdated()
    }

    const { status, label, color } = getMeetingStatus(meeting.start_time, meeting.end_time)
    const userIsHost = isHost()

    return (
        <div className="h-full overflow-y-auto">
            <Card className="h-full">
                <div className="p-6 space-y-6">
                    {/* 헤더 */}
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
                                <Badge variant="outline" className={`border-${color}-200 text-${color}-700 bg-${color}-50`}>
                                    {label}
                                </Badge>
                                {userIsHost && (
                                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                                        호스트
                                    </Badge>
                                )}
                            </div>
                            {meeting.description && (
                                <p className="text-gray-600 leading-relaxed">{meeting.description}</p>
                            )}
                        </div>

                        <div className="flex gap-2 ml-4">
                            {/* 채팅 공유 버튼 - 모든 참가자에게 표시 */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowShareDialog(true)}
                                className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                <Share2 className="h-4 w-4" />
                                채팅 공유
                            </Button>

                            {/* 수정/삭제 버튼 - 호스트이면서 예정된 회의만 */}
                            {userIsHost && status === 'upcoming' && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEditMeeting}
                                        className="flex items-center gap-2"
                                    >
                                        <Edit className="h-4 w-4" />
                                        수정
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeleteMeeting}
                                        disabled={isDeleting}
                                        className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {isDeleting ? '삭제 중...' : '삭제'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* 회의 정보 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 시간 정보 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                일정
                            </h3>
                            <div className="space-y-3 pl-7">
                                <div>
                                    <p className="text-sm text-gray-500">시작 시간</p>
                                    <p className="text-gray-900 font-medium">{formatDateTime(meeting.start_time)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">종료 시간</p>
                                    <p className="text-gray-900 font-medium">{formatDateTime(meeting.end_time)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">소요 시간</p>
                                    <p className="text-gray-900 font-medium">
                                        {Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / (1000 * 60))}분
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 장소 정보 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                장소
                            </h3>
                            <div className="pl-7">
                                <p className="text-gray-900 font-medium">
                                    {meeting.location || '장소가 지정되지 않았습니다'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* 참가자 정보 */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            참가자 ({meeting.meeting_participants?.length || 0}명)
                        </h3>
                        <div className="pl-7">
                            {meeting.meeting_participants && meeting.meeting_participants.length > 0 ? (
                                <div className="space-y-3">
                                    {meeting.meeting_participants.map((participant, index) => (
                                        <div key={`${participant.user_id}-${participant.role}-${index}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                <User className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {participant.User?.email || participant.user_id}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {participant.role === 'host' ? '호스트' : '참가자'}
                                                </p>
                                            </div>
                                            {participant.role === 'host' && (
                                                <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                                                    호스트
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">참가자가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    {status === 'ongoing' && (
                        <div className="pt-4">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => alert("화상회의 참여 기능은 준비 중입니다.")}
                            >
                                회의 참여하기
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* 수정 다이얼로그 */}
            <EditMeetingDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                onMeetingUpdated={handleMeetingUpdated}
                meeting={meeting}
                currentUserId={currentUserId}
            />

            {/* 공유 다이얼로그 */}
            <ShareMeetingDialog
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                meeting={meeting}
                workspaceId={meeting?.workspace_id}
                currentUserId={currentUserId}
            />
        </div>
    )
}

export default MeetingDetail
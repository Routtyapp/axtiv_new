import { useState } from "react"
import { Flex, Text, Grid } from '@radix-ui/themes'
import { supabase } from "../../lib/supabase"
import { Button, Card, Badge, Tooltip } from '../ui'

const MeetingList = ({ meetings, onMeetingDeleted, currentUserId, onMeetingSelect, selectedMeetingId }) => {
    const [deletingMeetingId, setDeletingMeetingId] = useState(null)

    const formatDateTime = (dateTimeString) => {
        const date = new Date(dateTimeString)
        return {
            date: date.toLocaleDateString('ko-KR'),
            time: date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            })
        }
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

    const isHost = (meeting) => {
        return meeting.meeting_participants?.some(
            participant => participant.user_id === currentUserId && participant.role === 'host'
        )
    }

    const handleDeleteMeeting = async (meetingId) => {
        if (!confirm('정말 이 회의를 삭제하시겠습니까?')) {
            return
        }

        setDeletingMeetingId(meetingId)

        try {
            const { error } = await supabase
                .from('meetings')
                .delete()
                .eq('id', meetingId)

            if (error) {
                console.error('Error deleting meeting:', error)
                alert('회의 삭제 중 오류가 발생했습니다.')
                return
            }

            onMeetingDeleted(meetingId)
        } catch (error) {
            console.error('Error:', error)
            alert('회의 삭제 중 오류가 발생했습니다.')
        } finally {
            setDeletingMeetingId(null)
        }
    }

    const upcomingMeetings = meetings.filter(meeting =>
        getMeetingStatus(meeting.start_time, meeting.end_time).status === 'upcoming'
    )

    const ongoingMeetings = meetings.filter(meeting =>
        getMeetingStatus(meeting.start_time, meeting.end_time).status === 'ongoing'
    )

    const completedMeetings = meetings.filter(meeting =>
        getMeetingStatus(meeting.start_time, meeting.end_time).status === 'completed'
    )

    if (meetings.length === 0) {
        return (
            <Card>
                <Flex justify="center" align="center" p="8">
                    <Text color="gray" size="3">
                        아직 생성된 회의가 없습니다. 첫 번째 회의를 만들어보세요!
                    </Text>
                </Flex>
            </Card>
        )
    }

    const renderMeetingCard = (meeting) => {
        const { status, label, color } = getMeetingStatus(meeting.start_time, meeting.end_time)
        const startDateTime = formatDateTime(meeting.start_time)
        const endDateTime = formatDateTime(meeting.end_time)
        const isUserHost = isHost(meeting)

        return (
            <Card
                key={meeting.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedMeetingId === meeting.id
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'hover:bg-gray-50'
                }`}
                onClick={() => onMeetingSelect && onMeetingSelect(meeting)}
            >
                <Flex direction="column" gap="3" p="4">
                    <Flex justify="between" align="start">
                        <Flex direction="column" gap="2" style={{ flex: 1 }}>
                            <Flex align="center" gap="2">
                                <Text size="4" weight="bold">{meeting.title}</Text>
                                <Badge variant="soft" color={color}>{label}</Badge>
                                {isUserHost && (
                                    <Badge variant="soft" color="purple">호스트</Badge>
                                )}
                            </Flex>

                            {meeting.description && (
                                <Text size="2" color="gray">{meeting.description}</Text>
                            )}

                            <Flex direction="column" gap="1">
                                <Text size="2">
                                    <strong>시작:</strong> {startDateTime.date} {startDateTime.time}
                                </Text>
                                <Text size="2">
                                    <strong>종료:</strong> {endDateTime.date} {endDateTime.time}
                                </Text>
                                {meeting.location && (
                                    <Text size="2">
                                        <strong>장소:</strong> {meeting.location}
                                    </Text>
                                )}
                                <div>
                                    <Text size="2" color="gray">
                                        <strong>참가자 ({meeting.meeting_participants?.length || 0}명):</strong>
                                    </Text>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {meeting.meeting_participants?.map((participant) => (
                                            <span
                                                key={participant.user_id}
                                                className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                                    participant.role === 'host'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {participant.User?.email || participant.user_id}
                                                {participant.role === 'host' && ' (호스트)'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Flex>
                        </Flex>

                        {isUserHost && status === 'upcoming' && (
                            <Flex gap="1">
                                <Tooltip content="회의 삭제">
                                    <Button
                                        variant="soft"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation() // 카드 클릭 이벤트 방지
                                            handleDeleteMeeting(meeting.id)
                                        }}
                                        disabled={deletingMeetingId === meeting.id}
                                        className="bg-red-100 hover:bg-red-200 text-red-700"
                                    >
                                        🗑️
                                    </Button>
                                </Tooltip>
                            </Flex>
                        )}
                    </Flex>

                    {status === 'ongoing' && (
                        <Button
                            variant="solid"
                            color="green"
                            size="2"
                            onClick={(e) => {
                                e.stopPropagation() // 카드 클릭 이벤트 방지
                                alert("화상회의 참여 기능은 준비 중입니다.")
                            }}
                        >
                            회의 참여하기
                        </Button>
                    )}
                </Flex>
            </Card>
        )
    }

    return (
        <Flex direction="column" gap="4">
            {ongoingMeetings.length > 0 && (
                <div>
                    <Text size="3" weight="bold" mb="2">진행 중인 회의</Text>
                    <Grid columns="1" gap="3">
                        {ongoingMeetings.map(renderMeetingCard)}
                    </Grid>
                </div>
            )}

            {upcomingMeetings.length > 0 && (
                <div>
                    <Text size="3" weight="bold" mb="2">예정된 회의</Text>
                    <Grid columns="1" gap="3">
                        {upcomingMeetings.map(renderMeetingCard)}
                    </Grid>
                </div>
            )}

            {completedMeetings.length > 0 && (
                <div>
                    <Text size="3" weight="bold" mb="2">완료된 회의</Text>
                    <Grid columns="1" gap="3">
                        {completedMeetings.slice(0, 5).map(renderMeetingCard)}
                    </Grid>
                    {completedMeetings.length > 5 && (
                        <Text size="2" color="gray" align="center" mt="2">
                            최근 5개의 완료된 회의만 표시됩니다.
                        </Text>
                    )}
                </div>
            )}
        </Flex>
    )
}

export default MeetingList
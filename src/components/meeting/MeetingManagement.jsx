import { useState, useEffect } from "react"
import { Info, List } from 'lucide-react'
import { supabase } from "../../lib/supabase"
import { useUser } from "../../hooks/useUser"
import { Button, Card, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent } from '../ui'
import CreateMeetingDialog from './CreateMeetingDialog'
import MeetingList from './MeetingList'
import MeetingDetail from './MeetingDetail'

const MeetingManagement = ({ workspaceId, onMeetingCreated }) => {
    const { user, getId } = useUser()
    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [activeTab, setActiveTab] = useState("list")
    const [selectedMeeting, setSelectedMeeting] = useState(null)

    useEffect(() => {
        if (workspaceId && user) {
            fetchMeetings()
        }
    }, [workspaceId, user])

    const fetchMeetings = async () => {
        try {
            console.log('Fetching meetings for workspace:', workspaceId)

            // First, get meetings with participants
            const { data: meetingData, error: meetingError } = await supabase
                .from('meetings')
                .select(`
                    *,
                    meeting_participants (
                        user_id,
                        role
                    )
                `)
                .eq('workspace_id', workspaceId)
                .order('start_time', { ascending: true })

            if (meetingError) {
                console.error('Error fetching meetings:', meetingError)
                return
            }

            console.log('Raw meeting data:', meetingData)

            if (!meetingData || meetingData.length === 0) {
                console.log('No meetings found')
                setMeetings([])
                return
            }

            // Get all unique user IDs from participants
            const allUserIds = [...new Set(
                meetingData.flatMap(meeting =>
                    meeting.meeting_participants?.map(p => p.user_id) || []
                )
            )]

            console.log('All participant user IDs:', allUserIds)

            // Get user emails
            let userData = []
            if (allUserIds.length > 0) {
                const { data: userEmailData, error: userError } = await supabase
                    .from('users')
                    .select('user_id, email')
                    .in('user_id', allUserIds)

                if (userError) {
                    console.error('Error fetching user emails:', userError)
                    // Continue without user emails
                } else {
                    userData = userEmailData || []
                    console.log('User email data:', userData)
                }
            }

            // Combine meeting data with user emails
            const meetingsWithEmails = meetingData.map(meeting => ({
                ...meeting,
                meeting_participants: meeting.meeting_participants?.map(participant => ({
                    ...participant,
                    User: userData.find(u => u.user_id === participant.user_id) || { email: participant.user_id }
                })) || []
            }))

            console.log('Final meetings with emails:', meetingsWithEmails)
            setMeetings(meetingsWithEmails)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMeetingCreated = () => {
        setShowCreateDialog(false)
        fetchMeetings()
        // 상위 컴포넌트에도 알림
        if (onMeetingCreated) {
            onMeetingCreated()
        }
    }

    const handleMeetingDeleted = (meetingId) => {
        setMeetings(meetings.filter(meeting => meeting.id !== meetingId))
        // 삭제된 회의가 현재 선택된 회의라면 선택 해제
        if (selectedMeeting && selectedMeeting.id === meetingId) {
            setSelectedMeeting(null)
        }
    }

    const handleMeetingSelect = (meeting) => {
        setSelectedMeeting(meeting)
        setActiveTab("detail") // 회의 정보 탭으로 전환
    }

    const handleMeetingUpdated = () => {
        // 전체 회의 목록을 다시 가져와서 최신 데이터로 업데이트
        fetchMeetings()
    }

    if (loading) {
        return (
            <Card>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-9 w-20" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                    <p className="text-xs text-gray-500 text-center">회의 목록을 불러오는 중...</p>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">회의 관리</h2>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        variant="default"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        새 회의 만들기
                    </Button>
                </div>

                <p className="text-sm text-gray-500">
                    워크스페이스의 회의를 생성하고 관리할 수 있습니다.
                </p>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="list" className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            목록 보기
                        </TabsTrigger>
                        <TabsTrigger value="detail" className="flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            회의 정보
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list">
                        <MeetingList
                            meetings={meetings}
                            onMeetingDeleted={handleMeetingDeleted}
                            currentUserId={getId()}
                            onMeetingSelect={handleMeetingSelect}
                            selectedMeetingId={selectedMeeting?.id}
                        />
                    </TabsContent>

                    <TabsContent value="detail">
                        <MeetingDetail
                            meeting={selectedMeeting}
                            currentUserId={getId()}
                            onMeetingDeleted={handleMeetingDeleted}
                            onMeetingUpdated={handleMeetingUpdated}
                        />
                    </TabsContent>
                </Tabs>

                <CreateMeetingDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    onMeetingCreated={handleMeetingCreated}
                    workspaceId={workspaceId}
                    currentUserId={user?.email}
                    defaultDate={new Date()}
                />
            </div>
        </Card>
    )
}

export default MeetingManagement
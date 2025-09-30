import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { Card, Badge } from '../ui'
import { Users, Calendar as CalendarIcon, MessageCircle, TrendingUp } from 'lucide-react'

const DashboardView = ({ workspaceId, workspace }) => {
    const { user } = useAuth()
    const [teamStats, setTeamStats] = useState({
        totalMembers: 0,
        activeMembers: 0
    })
    const [recentMessages, setRecentMessages] = useState([])
    const [upcomingMeetings, setUpcomingMeetings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (workspaceId && user) {
            fetchDashboardData()
        }
    }, [workspaceId, user])

    const fetchDashboardData = async () => {
        try {
            await Promise.all([
                fetchTeamStats(),
                fetchRecentMessages(),
                fetchUpcomingMeetings()
            ])
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchTeamStats = async () => {
        const { data, error } = await supabase
            .from('workspace_members')
            .select('user_id, is_online')
            .eq('workspace_id', workspaceId)

        if (!error && data) {
            setTeamStats({
                totalMembers: data.length,
                activeMembers: data.filter(m => m.is_online).length
            })
        }
    }

    const fetchRecentMessages = async () => {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('id, content, sender_name, created_at')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(5)

        if (!error && data) {
            setRecentMessages(data)
        }
    }

    const fetchUpcomingMeetings = async () => {
        const { data, error } = await supabase
            .from('meetings')
            .select('id, title, start_time, location')
            .eq('workspace_id', workspaceId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3)

        if (!error && data) {
            setUpcomingMeetings(data)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500">대시보드를 불러오는 중...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b flex-shrink-0">
                <h2 className="text-2xl font-bold">📊 워크스페이스 대시보드</h2>
                <p className="text-gray-600 mt-2">
                    {workspace?.name}의 활동 현황을 확인하세요
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 통계 카드들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">팀 멤버</p>
                                <p className="text-2xl font-bold">{teamStats.totalMembers}</p>
                            </div>
                            <Users className="h-8 w-8 text-purple-500" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">온라인 멤버</p>
                                <p className="text-2xl font-bold">{teamStats.activeMembers}</p>
                            </div>
                            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">최근 메시지</p>
                                <p className="text-2xl font-bold">{recentMessages.length}</p>
                            </div>
                            <MessageCircle className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">예정된 회의</p>
                                <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                            </div>
                            <CalendarIcon className="h-8 w-8 text-orange-500" />
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 최근 메시지 */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            최근 채팅 메시지
                        </h3>
                        {recentMessages.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">최근 메시지가 없습니다.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentMessages.map((message) => (
                                    <div key={message.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-semibold text-blue-600">
                                                {message.sender_name?.charAt(0).toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">{message.sender_name}</p>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message.content}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(message.created_at).toLocaleDateString()} {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* 예정된 회의 */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            예정된 회의
                        </h3>
                        {upcomingMeetings.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">예정된 회의가 없습니다.</p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingMeetings.map((meeting) => (
                                    <div key={meeting.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <CalendarIcon className="h-5 w-5 text-orange-500 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{meeting.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(meeting.start_time).toLocaleDateString()} {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {meeting.location && (
                                                <p className="text-xs text-gray-500 mt-1">📍 {meeting.location}</p>
                                            )}
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            예정
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* 워크스페이스 정보 */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">워크스페이스 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">이름</p>
                            <p className="font-medium">{workspace?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">생성일</p>
                            <p className="font-medium">
                                {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : '-'}
                            </p>
                        </div>
                        {workspace?.description && (
                            <div className="md:col-span-2">
                                <p className="text-sm text-gray-600">설명</p>
                                <p className="font-medium">{workspace.description}</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}

export default DashboardView
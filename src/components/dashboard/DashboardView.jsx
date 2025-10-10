import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import { Card, Badge, Avatar, AvatarFallback, ScrollArea, Dialog, DialogContent, DialogHeader, DialogTitle, Separator, Tooltip, TooltipTrigger, TooltipContent } from '../ui'
import { Users, Calendar as CalendarIcon, MessageCircle, TrendingUp, Mail, Shield, Clock } from 'lucide-react'

const DashboardView = ({ workspaceId, workspace }) => {
    const { user } = useAuth()
    const [teamMembers, setTeamMembers] = useState([])
    const [recentMessages, setRecentMessages] = useState([])
    const [upcomingMeetings, setUpcomingMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedMember, setSelectedMember] = useState(null)
    const [showProfileDialog, setShowProfileDialog] = useState(false)

    useEffect(() => {
        if (workspaceId && user) {
            fetchDashboardData()
        }
    }, [workspaceId, user])

    const fetchDashboardData = async () => {
        try {
            // 🚀 최적화: 4개 쿼리 → 1개 RPC 함수 호출로 변경
            const { data, error } = await supabase.rpc('get_dashboard_data', {
                p_workspace_id: workspaceId,
                p_user_id: user.id
            })

            if (error) {
                console.error('Error fetching dashboard data:', error)
                return
            }

            // 데이터 파싱 및 상태 업데이트
            if (data) {
                // 팀 멤버
                setTeamMembers(data.teamMembers || [])

                // 최근 메시지 (chat_rooms 구조 맞추기)
                const messages = (data.recentMessages || []).map(msg => ({
                    ...msg,
                    chat_rooms: { name: msg.chat_room_name }
                }))
                setRecentMessages(messages)

                // 예정된 회의
                setUpcomingMeetings(data.upcomingMeetings || [])
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMemberClick = (member) => {
        setSelectedMember(member)
        setShowProfileDialog(true)
    }

    const formatLastSeen = (timestamp) => {
        if (!timestamp) return '알 수 없음'
        const date = new Date(timestamp)
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)

        if (diffInSeconds < 60) return '방금 전'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
        return date.toLocaleDateString('ko-KR')
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
                <p className="text-gray-600 dark:text-white mt-2">
                    {workspace?.name}의 활동 현황을 확인하세요
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 통계 카드들 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-white">전체 멤버</p>
                                <p className="text-2xl font-bold">{teamMembers.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-white">최근 메시지</p>
                                <p className="text-2xl font-bold">{recentMessages.length}</p>
                            </div>
                            <MessageCircle className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-white">예정된 회의</p>
                                <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                            </div>
                            <CalendarIcon className="h-8 w-8 text-orange-500" />
                        </div>
                    </Card>
                </div>

                {/* 팀 멤버 목록 */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        팀 멤버 ({teamMembers.length}명)
                    </h3>
                    {teamMembers.length === 0 ? (
                        <p className="text-gray-500 dark:text-white text-center py-4">팀 멤버가 없습니다.</p>
                    ) : (
                        <ScrollArea className="h-80">
                            <div className="space-y-2 pr-4">
                                {teamMembers.map((member) => (
                                    <Tooltip key={member.user_id}>
                                        <TooltipTrigger asChild>
                                            <div
                                                onClick={() => handleMemberClick(member)}
                                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <Avatar>
                                                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white font-semibold">
                                                        {member.user_name?.charAt(0).toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {member.user_name}
                                                        </p>
                                                        {member.workspace_role === 'admin' && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                관리자
                                                            </Badge>
                                                        )}
                                                        {member.user_role === 'owner' && (
                                                            <Badge variant="default" className="text-xs">
                                                                오너
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-white truncate">
                                                        {member.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            클릭하여 프로필 보기
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 최근 메시지 */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            최근 채팅 메시지
                        </h3>
                        {recentMessages.length === 0 ? (
                            <p className="text-gray-500 dark:text-white text-center py-4">최근 메시지가 없습니다.</p>
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
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-700 dark:text-white">{message.sender_name}</p>
                                                <Badge variant="outline" className="text-xs">
                                                    #{message.chat_rooms?.name || '알 수 없음'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-white mt-1 line-clamp-2">{message.content}</p>
                                            <p className="text-xs text-gray-500 dark:text-white mt-1">
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
                            <p className="text-gray-500 dark:text-white text-center py-4">예정된 회의가 없습니다.</p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingMeetings.map((meeting) => (
                                    <div key={meeting.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <CalendarIcon className="h-5 w-5 text-orange-500 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{meeting.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-white mt-1">
                                                {new Date(meeting.start_time).toLocaleDateString()} {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {meeting.location && (
                                                <p className="text-xs text-gray-500 dark:text-white mt-1">📍 {meeting.location}</p>
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
                            <p className="text-sm text-gray-600 dark:text-white">이름</p>
                            <p className="font-medium">{workspace?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-white">생성일</p>
                            <p className="font-medium">
                                {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : '-'}
                            </p>
                        </div>
                        {workspace?.description && (
                            <div className="md:col-span-2">
                                <p className="text-sm text-gray-600 dark:text-white">설명</p>
                                <p className="font-medium">{workspace.description}</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* 프로필 상세 다이얼로그 */}
            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>멤버 프로필</DialogTitle>
                    </DialogHeader>

                    {selectedMember && (
                        <div className="space-y-6">
                            {/* 프로필 헤더 */}
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white text-2xl font-bold">
                                        {selectedMember.user_name?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold">{selectedMember.user_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {selectedMember.workspace_role === 'admin' && (
                                            <Badge variant="secondary" className="text-xs">
                                                워크스페이스 관리자
                                            </Badge>
                                        )}
                                        {selectedMember.user_role === 'owner' && (
                                            <Badge variant="default" className="text-xs">
                                                회사 오너
                                            </Badge>
                                        )}
                                        {selectedMember.user_role === 'member' && selectedMember.workspace_role !== 'admin' && (
                                            <Badge variant="outline" className="text-xs">
                                                멤버
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* 상세 정보 */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600 dark:text-white">이메일</p>
                                        <p className="text-sm font-medium break-all">{selectedMember.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600 dark:text-white">워크스페이스 역할</p>
                                        <p className="text-sm font-medium">
                                            {selectedMember.workspace_role === 'admin' ? '관리자' : '일반 멤버'}
                                        </p>
                                    </div>
                                </div>

                                {selectedMember.joined_at && (
                                    <div className="flex items-start gap-3">
                                        <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-white">워크스페이스 가입일</p>
                                            <p className="text-sm font-medium">
                                                {new Date(selectedMember.joined_at).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selectedMember.last_sign_in_at && (
                                    <div className="flex items-start gap-3">
                                        <TrendingUp className="h-5 w-5 text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-white">마지막 로그인</p>
                                            <p className="text-sm font-medium">
                                                {new Date(selectedMember.last_sign_in_at).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default DashboardView
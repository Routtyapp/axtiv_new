import { Flex, Heading, Text } from '@radix-ui/themes'
import { LogOut, Users, FileText } from 'lucide-react'
import { Button, Tooltip } from '../ui'

const ChatHeader = ({ workspaceName, realtimeStatus, onLeaveRoom, currentRoomName, memberCount, onShowMembers, onGenerateMeetingNotes }) => {
    const getStatusColor = () => {
        switch (realtimeStatus) {
            case 'SUBSCRIBED': return 'bg-green-500'
            case 'CHANNEL_ERROR': return 'bg-red-500'
            case 'TIMED_OUT': return 'bg-orange-500'
            case 'CLOSED': return 'bg-gray-500'
            case 'retrying': return 'bg-blue-500 animate-pulse'
            case 'failed': return 'bg-red-600'
            case 'polling': return 'bg-blue-400'
            default: return 'bg-yellow-500'
        }
    }

    const getStatusText = () => {
        switch (realtimeStatus) {
            case 'SUBSCRIBED': return '실시간 연결됨'
            case 'CHANNEL_ERROR': return '연결 오류'
            case 'TIMED_OUT': return '연결 시간초과'
            case 'CLOSED': return '연결 종료'
            case 'retrying': return '재연결 시도 중...'
            case 'failed': return '연결 실패 - 새로고침 필요'
            case 'polling': return '폴링 모드 (3초 간격)'
            default: return '연결 중...'
        }
    }

    return (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                        <Heading size="4" weight="medium">
                            {currentRoomName || '팀 채팅'}
                        </Heading>
                        <Tooltip content={getStatusText()}>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                        </Tooltip>
                    </Flex>
                    {/* 참여 인원 수 버튼 - 채팅방 이름 아래로 이동 */}
                    {memberCount !== undefined && onShowMembers && (
                        <Tooltip content="참여 인원 보기">
                            <Button
                                variant="ghost"
                                color="gray"
                                size="1"
                                onClick={onShowMembers}
                                className="w-fit"
                            >
                                <Users className="h-3 w-3" />
                                <span className="ml-1 text-xs">{memberCount}명</span>
                            </Button>
                        </Tooltip>
                    )}
                </Flex>
                {/* 액션 버튼 그룹 */}
                <Flex gap="3" align="center">
                    {/* 회의록 생성 버튼 */}
                    {onGenerateMeetingNotes && currentRoomName && (
                        <Tooltip content="대화 내용을 분석하여 회의록을 생성합니다">
                            <Button
                                variant="soft"
                                color="blue"
                                size="2"
                                onClick={onGenerateMeetingNotes}
                                className="flex items-center gap-2"
                            >
                                <FileText className="h-5 w-5" />
                                <span className="hidden md:inline">회의록 생성</span>
                            </Button>
                        </Tooltip>
                    )}

                    {/* 채팅방 나가기 버튼 */}
                    {onLeaveRoom && currentRoomName && (
                        <Tooltip content="채팅방에서 나가기">
                            <Button
                                variant="soft"
                                color="red"
                                size="2"
                                onClick={onLeaveRoom}
                                className="flex items-center gap-2"
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="hidden md:inline">나가기</span>
                            </Button>
                        </Tooltip>
                    )}
                </Flex>
            </Flex>
        </div>
    )
}

export default ChatHeader
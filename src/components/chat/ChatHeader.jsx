import { Flex, Heading, Text } from '@radix-ui/themes'
import { LogOut } from 'lucide-react'
import { Button, Tooltip } from '../ui'

const ChatHeader = ({ workspaceName, realtimeStatus, onLeaveRoom, currentRoomName }) => {
    const getStatusColor = () => {
        switch (realtimeStatus) {
            case 'SUBSCRIBED': return 'bg-green-500'
            case 'CHANNEL_ERROR': return 'bg-red-500'
            case 'TIMED_OUT': return 'bg-orange-500'
            case 'CLOSED': return 'bg-gray-500'
            default: return 'bg-yellow-500'
        }
    }

    const getStatusText = () => {
        switch (realtimeStatus) {
            case 'SUBSCRIBED': return '실시간 연결됨'
            case 'CHANNEL_ERROR': return '연결 오류'
            case 'TIMED_OUT': return '연결 시간초과'
            case 'CLOSED': return '연결 종료'
            default: return '연결 중...'
        }
    }

    return (
        <div className="border-b border-gray-200 p-4">
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
                    <Text size="2" color="gray">{workspaceName}</Text>
                </Flex>
                {/* 채팅방 나가기 버튼 */}
                {onLeaveRoom && currentRoomName && (
                    <Tooltip content="채팅방 나가기">
                        <Button
                            variant="soft"
                            color="red"
                            size="2"
                            onClick={onLeaveRoom}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                )}
            </Flex>
        </div>
    )
}

export default ChatHeader
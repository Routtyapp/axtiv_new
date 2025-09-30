import { Flex, Heading, Text } from '@radix-ui/themes'
import { Avatar, Badge, ScrollArea } from '../ui'

const MemberList = ({ members, currentUserId }) => {
    const formatLastSeen = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)

        if (diffInSeconds < 60) {
            return '방금 전'
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60)
            return `${minutes}분 전`
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600)
            return `${hours}시간 전`
        } else {
            return date.toLocaleDateString('ko-KR')
        }
    }

    return (
        <div className="border-b border-gray-200 bg-gray-50">
            <div className="p-3">
                <Heading size="3" weight="medium" color="gray" mb="3">
                    온라인 멤버 ({members.length})
                </Heading>

                {members.length === 0 ? (
                    <Flex align="center" justify="center" py="4">
                        <Text size="2" color="gray">온라인 멤버가 없습니다.</Text>
                    </Flex>
                ) : (
                    <ScrollArea style={{ maxHeight: '128px' }}>
                        <Flex direction="column" gap="2">
                            {members.map((member) => (
                                <Flex
                                    key={member.id}
                                    align="center"
                                    gap="2"
                                    p="2"
                                    className={member.user_id === currentUserId ? 'bg-blue-50 rounded' : ''}
                                >
                                    <div className="relative">
                                        <Avatar
                                            fallback={member.user_id?.charAt(0) || '?'}
                                            size="1"
                                            color="gray"
                                        />
                                        {member.is_online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-white rounded-full"></div>
                                        )}
                                    </div>

                                    <Flex direction="column" flexGrow="1" style={{ minWidth: 0 }}>
                                        <Flex align="center" gap="1">
                                            <Text size="2" weight="medium" truncate>
                                                {member.user_id === currentUserId ? '나' : member.user_id.split('@')[0] || member.user_id}
                                            </Text>
                                            {member.role === 'admin' && (
                                                <Badge variant="soft" color="yellow" size="1">
                                                    관리자
                                                </Badge>
                                            )}
                                        </Flex>
                                        <Text size="1" color="gray">
                                            {member.is_online ? '온라인' : formatLastSeen(member.last_seen)}
                                        </Text>
                                    </Flex>
                                </Flex>
                            ))}
                        </Flex>
                    </ScrollArea>
                )}
            </div>
        </div>
    )
}

export default MemberList
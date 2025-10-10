import { Flex, Heading, Text } from '@radix-ui/themes'
import { Avatar, Badge, ScrollArea, AvatarFallback } from '../ui'

const MemberList = ({ members, currentUserId }) => {
    return (
        <div className="border-gray-200 dark:border-gray-700">
            <div className="p-3">
                {members.length === 0 ? (
                    <Flex align="center" justify="center" py="4">
                        <Text size="2" className="text-gray-500 dark:text-white">멤버가 없습니다.</Text>
                    </Flex>
                ) : (
                    <ScrollArea style={{ maxHeight: '400px' }}>
                        <Flex direction="column" gap="2">
                            {members.map((member) => (
                                <Flex
                                    key={member.id}
                                    align="center"
                                    gap="3"
                                    p="3"
                                    className={`rounded-lg border ${
                                        member.user_id === currentUserId
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <Avatar>
                                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white font-semibold">
                                            {member.user_id?.charAt(0)?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <Flex direction="column" flexGrow="1" style={{ minWidth: 0 }}>
                                        <Flex align="center" gap="2">
                                            <Text size="2" weight="medium" className="truncate dark:text-white">
                                                {member.user_id === currentUserId ? '나' : member.user_id.split('@')[0] || member.user_id}
                                            </Text>
                                            {member.role === 'admin' && (
                                                <Badge variant="secondary" className="text-xs">
                                                    관리자
                                                </Badge>
                                            )}
                                        </Flex>
                                        {member.email && (
                                            <Text size="1" className="text-gray-500 dark:text-gray-400 truncate">
                                                {member.email}
                                            </Text>
                                        )}
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
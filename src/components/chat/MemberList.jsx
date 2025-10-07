import { Flex, Heading, Text } from '@radix-ui/themes'
import { Avatar, Badge, ScrollArea } from '../ui'

const MemberList = ({ members, currentUserId }) => {
    return (
        <div className="border-b border-gray-200 bg-gray-50">
            <div className="p-3">
                <Heading size="3" weight="medium" color="gray" mb="3">
                    멤버 ({members.length})
                </Heading>

                {members.length === 0 ? (
                    <Flex align="center" justify="center" py="4">
                        <Text size="2" color="gray">멤버가 없습니다.</Text>
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
                                    <Avatar
                                        fallback={member.user_id?.charAt(0) || '?'}
                                        size="1"
                                        color="gray"
                                    />

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
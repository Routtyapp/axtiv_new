import { Flex, Heading, Text, Code } from '@radix-ui/themes'
import { Container, Header } from '../layout'
import { Card } from '../ui'
import userStore from "../../store/userStore"

const Test = () => {
    const { user } = userStore()

    console.log(user)

    return (
        <Container>
            <div className="p-6">
                <Header
                    title="테스트 페이지"
                    subtitle="개발자 테스트를 위한 페이지입니다"
                />

                <Card mt="6">
                    <Flex direction="column" gap="4" p="5">
                        <Heading size="4" weight="bold">사용자 정보</Heading>

                        {user ? (
                            <Flex direction="column" gap="3">
                                <div>
                                    <Text size="2" weight="medium" color="gray">인증 ID</Text>
                                    <Code size="2">{user.auth_id}</Code>
                                </div>

                                {user.email && (
                                    <div>
                                        <Text size="2" weight="medium" color="gray">이메일</Text>
                                        <Text size="3">{user.email}</Text>
                                    </div>
                                )}

                                {user.name && (
                                    <div>
                                        <Text size="2" weight="medium" color="gray">이름</Text>
                                        <Text size="3">{user.name}</Text>
                                    </div>
                                )}

                                <div>
                                    <Text size="2" weight="medium" color="gray">로그인 시간</Text>
                                    <Text size="3">{user.created_at ? new Date(user.created_at).toLocaleString() : '정보 없음'}</Text>
                                </div>
                            </Flex>
                        ) : (
                            <Text color="gray">로그인된 사용자가 없습니다.</Text>
                        )}
                    </Flex>
                </Card>
            </div>
        </Container>
    )
}

export default Test
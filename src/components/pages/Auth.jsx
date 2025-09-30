import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Flex, Heading, Text } from '@radix-ui/themes'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Card, Avatar, Skeleton } from '../ui'
import { Container } from '../layout'

export default function Auth() {
  const { user, loading, signInWithGoogle, signOut, isAuthenticated } = useAuth()
  const [signInLoading, setSignInLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/companies'

  useEffect(() => {
    if (isAuthenticated() && !loading) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from, isAuthenticated])

  const handleSignInWithGoogle = async () => {
    setSignInLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error logging in:', error.message)
    } finally {
      setSignInLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Error logging out:', error.message)
    }
  }

  if (loading) {
    return (
      <Container>
        <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
          <Card style={{ maxWidth: '400px', width: '100%' }}>
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-center">
                <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Text size="1" color="gray" className="text-center">로딩 중...</Text>
            </div>
          </Card>
        </Flex>
      </Container>
    )
  }

  if (user) {
    return (
      <Container>
        <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
          <Card style={{ maxWidth: '400px', width: '100%' }}>
            <Flex direction="column" align="center" gap="4" p="6">
              <Avatar
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
                fallback={user.user_metadata.full_name?.charAt(0)}
                size="6"
              />

              <Flex direction="column" align="center" gap="2">
                <Heading size="5" weight="bold">
                  환영합니다!
                </Heading>
                <Text size="4" weight="medium">
                  {user.user_metadata.full_name}
                </Text>
                <Text size="2" color="gray">
                  {user.email}
                </Text>
              </Flex>

              <Flex direction="column" gap="3" width="100%" mt="2">
                <Link to="/">
                  <Button variant="solid" size="3" style={{ width: '100%' }}>
                    홈으로 이동
                  </Button>
                </Link>

                <Button
                  variant="soft"
                  color="gray"
                  size="3"
                  onClick={handleSignOut}
                  style={{ width: '100%' }}
                >
                  로그아웃
                </Button>
              </Flex>
            </Flex>
          </Card>
        </Flex>
      </Container>
    )
  }

  return (
    <Container>
      <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
        <Card style={{ maxWidth: '400px', width: '100%' }}>
          <Flex direction="column" align="center" gap="6" p="6">
            <Flex direction="column" align="center" gap="2">
              <Heading size="6" weight="bold">
                AXTIV에 로그인
              </Heading>
              <Text size="3" color="gray" align="center">
                Google 계정으로 간편하게 로그인하세요
              </Text>
            </Flex>

            <Button
              size="3"
              onClick={handleSignInWithGoogle}
              disabled={signInLoading}
              style={{ width: '100%' }}
            >
              {signInLoading ? 'Google 로그인 중...' : 'Google로 로그인'}
            </Button>

            <Text size="2" color="gray" align="center">
              계정이 없으시면 자동으로 생성됩니다
            </Text>
          </Flex>
        </Card>
      </Flex>
    </Container>
  )
}
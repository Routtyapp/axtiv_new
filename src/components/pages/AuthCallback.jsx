import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Flex, Text } from '@radix-ui/themes'
import { useAuth } from '../../contexts/AuthContext'
import { Skeleton } from '../ui'
import { Container } from '../layout'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/companies', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return (
    <Container>
      <Flex justify="center" align="center" direction="column" gap="4" style={{ minHeight: '50vh' }}>
        <div className="space-y-3 text-center">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <Text size="3" color="gray">
          로그인 처리 중...
        </Text>
      </Flex>
    </Container>
  )
}
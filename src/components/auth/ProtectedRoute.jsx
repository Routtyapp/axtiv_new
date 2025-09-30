import { Navigate, useLocation } from 'react-router'
import { useUser } from '../../hooks/useUser'
import { Flex, Text } from '@radix-ui/themes'
import { Skeleton } from '../ui'
import { Container } from '../layout'

const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { loading, isAuthenticated } = useUser()
  const location = useLocation()

  if (loading) {
    return (
      <Container>
        <Flex direction="column" justify="center" align="center" style={{ minHeight: '50vh' }} gap="3">
          <Skeleton className="h-8 w-48" />
          <Text size="2" color="gray">인증 확인 중...</Text>
        </Flex>
      </Container>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
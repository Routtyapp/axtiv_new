/**
 * ProtectedRoute.jsx - 인증 필수 라우트 가드 컴포넌트
 *
 * 역할:
 * - 인증되지 않은 사용자의 보호된 페이지 접근 차단
 * - 미인증 시 로그인 페이지로 자동 리다이렉션
 * - 로딩 중 스켈레톤 UI 표시
 * - 이전 경로 저장 (로그인 후 원래 페이지로 복귀)
 *
 * 상호작용:
 * - Import:
 *   - hooks/useUser (인증 상태 확인)
 *   - components/ui/Skeleton (로딩 UI)
 *   - components/layout/Container (레이아웃)
 * - Export: ProtectedRoute (default)
 * - 사용처: App.jsx (보호된 라우트를 래핑)
 *   - /companies
 *   - /company/:companyId/workspaces
 *   - /company/:companyId/workspace/:workspaceId
 *
 * 데이터 흐름:
 * 1. useUser로 인증 상태 확인
 * 2-a. loading=true → 스켈레톤 표시
 * 2-b. loading=false && isAuthenticated=false → /login으로 리다이렉트 (location state 저장)
 * 2-c. loading=false && isAuthenticated=true → children 렌더링
 *
 * location.state.from 저장 이유:
 * - 로그인 후 원래 접근하려던 페이지로 자동 복귀
 * - Auth.jsx에서 location.state?.from?.pathname 사용
 */

import { Navigate, useLocation } from 'react-router'
import { useUser } from '../../hooks/useUser'  // 인증 상태 훅
import { Flex, Text } from '@radix-ui/themes'
import { Skeleton } from '../ui'  // 로딩 스켈레톤
import { Container } from '../layout'

/**
 * ProtectedRoute - 보호된 라우트 컴포넌트
 * @param {object} props
 * @param {React.ReactNode} props.children - 보호할 컴포넌트
 * @param {string} props.redirectTo - 미인증 시 리다이렉션 경로 (기본: '/login')
 * @returns {JSX.Element}
 */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { loading, isAuthenticated } = useUser()  // 인증 상태 확인
  const location = useLocation()  // 현재 경로 정보

  // 1. 로딩 중: 스켈레톤 UI 표시
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

  // 2. 미인증: 로그인 페이지로 리다이렉트
  // state={{ from: location }}: 로그인 후 원래 페이지로 복귀하기 위해 경로 저장
  // replace: 뒤로가기로 보호된 페이지 접근 방지
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // 3. 인증 완료: 자식 컴포넌트 렌더링
  return children
}

export default ProtectedRoute
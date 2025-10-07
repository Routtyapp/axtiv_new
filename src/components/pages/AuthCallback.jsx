/**
 * AuthCallback.jsx - OAuth 콜백 처리 페이지
 *
 * 역할:
 * - Google OAuth 인증 완료 후 리다이렉트되는 페이지
 * - Supabase Auth에서 세션 설정 완료 대기
 * - 인증 성공 시 /companies로 이동
 * - 인증 실패 시 /login으로 리다이렉트
 *
 * 상호작용:
 * - Import: hooks/useAuth (세션 상태 확인)
 * - Export: AuthCallback (default)
 * - 사용처: App.jsx (/auth/callback 라우트)
 * - 연결: Auth.jsx (로그인 시작) → Google OAuth → 여기 → /companies
 *
 * OAuth 플로우:
 * 1. Auth.jsx에서 signInWithGoogle() 호출
 * 2. Google 로그인 팝업/페이지에서 인증
 * 3. Supabase가 자동으로 /auth/callback?code=xxx로 리다이렉트
 * 4. Supabase SDK가 code를 세션으로 교환
 * 5. AuthContext의 onAuthStateChange 트리거
 * 6. useAuth의 user 상태 업데이트
 * 7. 여기서 user 확인 후 /companies로 이동
 *
 * 로딩 중에만 표시되는 일회성 페이지:
 * - 사용자는 이 페이지를 거의 볼 수 없음 (빠르게 리다이렉트)
 * - 느린 네트워크에서만 스켈레톤이 잠깐 보임
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Flex, Text } from '@radix-ui/themes'
import { useAuth } from '../../hooks/useAuth'  // 세션 상태 훅
import { Skeleton } from '../ui'
import { Container } from '../layout'

export default function AuthCallback() {
  const { user, loading } = useAuth()  // AuthContext의 세션 상태
  const navigate = useNavigate()

  /**
   * 세션 확인 후 자동 리다이렉션
   * - loading=false가 되면 세션 설정 완료
   * - user 있으면 성공 → /companies
   * - user 없으면 실패 → /login
   */
  useEffect(() => {
    if (!loading) {
      if (user) {
        // 인증 성공: 회사 목록 페이지로 이동
        navigate('/companies', { replace: true })
      } else {
        // 인증 실패: 로그인 페이지로 복귀
        navigate('/login', { replace: true })
      }
    }
  }, [user, loading, navigate])

  // 로딩 중 UI (OAuth 콜백 처리 중)
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
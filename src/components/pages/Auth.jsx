/**
 * Auth.jsx - 로그인/회원가입 페이지
 *
 * 역할:
 * - Google OAuth를 통한 소셜 로그인
 * - 이미 로그인된 사용자 정보 표시 및 로그아웃
 * - ProtectedRoute에서 저장한 이전 경로로 자동 복귀
 *
 * 상호작용:
 * - Import: hooks/useAuth (인증 상태 및 함수)
 * - Export: Auth (default)
 * - 사용처: App.jsx (/login 라우트)
 * - 연결: AuthCallback.jsx (OAuth 콜백 후 여기로 복귀)
 *
 * 로그인 플로우:
 * 1. 사용자가 "Google로 로그인" 버튼 클릭
 * 2. signInWithGoogle() → Google OAuth 팝업
 * 3. 사용자 인증 완료 → /auth/callback으로 리다이렉트
 * 4. AuthCallback.jsx에서 세션 확인 → /companies로 이동
 * 5. (또는) ProtectedRoute가 저장한 경로(from)로 이동
 *
 * 3가지 UI 상태:
 * - loading: 스켈레톤 표시
 * - user 있음: 사용자 정보 카드 + 로그아웃 버튼
 * - user 없음: 로그인 버튼
 *
 * DB 테이블:
 * - auth.users (Supabase Auth 자동 생성)
 * - public.users (사용자 프로필, AuthCallback에서 생성)
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Flex, Heading, Text } from '@radix-ui/themes'
import { useAuth } from '../../hooks/useAuth'  // 인증 훅
import { Button, Card, Avatar, Skeleton } from '../ui'
import { Container } from '../layout'

export default function Auth() {
  const { user, loading, signInWithGoogle, signOut, isAuthenticated } = useAuth()
  const [signInLoading, setSignInLoading] = useState(false)  // Google 로그인 버튼 로딩 상태
  const navigate = useNavigate()
  const location = useLocation()

  // ProtectedRoute에서 저장한 원래 경로 (없으면 /companies)
  const from = location.state?.from?.pathname || '/companies'

  /**
   * 이미 로그인된 사용자 자동 리다이렉션
   * - /login에 직접 접근했을 때 이미 로그인되어 있으면 원래 페이지로 이동
   */
  useEffect(() => {
    if (isAuthenticated() && !loading) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from, isAuthenticated])

  /**
   * handleSignInWithGoogle - Google OAuth 로그인 핸들러
   * @uses signInWithGoogle (AuthContext)
   * @flow Google 로그인 → /auth/callback → AuthCallback.jsx → /companies
   */
  const handleSignInWithGoogle = async () => {
    setSignInLoading(true)
    try {
      await signInWithGoogle()  // OAuth 팝업 열림
    } catch (error) {
      console.error('Error logging in:', error.message)
    } finally {
      setSignInLoading(false)
    }
  }

  /**
   * handleSignOut - 로그아웃 핸들러
   * @uses signOut (AuthContext)
   */
  const handleSignOut = async () => {
    try {
      await signOut()  // 세션 종료 및 상태 초기화
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Error logging out:', error.message)
    }
  }

  // UI 상태 1: 로딩 중 (AuthContext에서 초기 세션 확인 중)
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

  // UI 상태 2: 이미 로그인된 사용자 (사용자 정보 카드 표시)
  if (user) {
    return (
      <Container>
        <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
          <Card style={{ maxWidth: '400px', width: '100%' }}>
            <Flex direction="column" align="center" gap="4" p="6">
              {/* Google 프로필 이미지 */}
              <Avatar
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
                fallback={user.user_metadata.full_name?.charAt(0)}
                size="6"
              />

              {/* 사용자 정보 */}
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

              {/* 액션 버튼들 */}
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

  // UI 상태 3: 미로그인 사용자 (로그인 버튼 표시)
  return (
    <Container>
      <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
        <Card style={{ maxWidth: '400px', width: '100%' }}>
          <Flex direction="column" align="center" gap="6" p="6">
            {/* 로그인 헤더 */}
            <Flex direction="column" align="center" gap="2">
              <Heading size="6" weight="bold">
                AXTIV에 로그인
              </Heading>
              <Text size="3" color="gray" align="center">
                Google 계정으로 간편하게 로그인하세요
              </Text>
            </Flex>

            {/* Google 로그인 버튼 */}
            <Button
              size="3"
              onClick={handleSignInWithGoogle}
              disabled={signInLoading}
              style={{ width: '100%' }}
            >
              {signInLoading ? 'Google 로그인 중...' : 'Google로 로그인'}
            </Button>

            {/* 안내 문구 */}
            <Text size="2" color="gray" align="center">
              계정이 없으시면 자동으로 생성됩니다
            </Text>
          </Flex>
        </Card>
      </Flex>
    </Container>
  )
}
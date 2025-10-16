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
    <div className="auth-gradient-bg">
      <Container>
        <Flex justify="center" align="center" style={{ minHeight: '100vh', padding: '2rem 0' }}>
          <div className="frosted-glass animate-fade-in-up" style={{
            maxWidth: '480px',
            width: '100%',
            borderRadius: '24px',
            padding: '3rem 2.5rem',
            boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.15)'
          }}>
            <Flex direction="column" align="center" gap="6">
              {/* 로고 */}
              <div style={{ marginBottom: '1rem' }}>
                <img
                  src="/Logo.png"
                  alt="AXTIV Logo"
                  style={{
                    height: '80px',
                    width: 'auto'
                  }}
                />
              </div>

              {/* 로그인 헤더 */}
              <Flex direction="column" align="center" gap="3">
                <Heading size="7" weight="bold" style={{ letterSpacing: '-0.02em' }}>
                  AXTIV에 로그인
                </Heading>
                <Text size="3" color="gray" align="center" style={{ lineHeight: '1.6' }}>
                  Google 계정으로 간편하게 로그인하세요
                </Text>
              </Flex>

              {/* Google 로그인 버튼 - Frosted Glass Style */}
              <button
                onClick={handleSignInWithGoogle}
                disabled={signInLoading}
                className="frosted-glass-button"
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: signInLoading ? 'not-allowed' : 'pointer',
                  opacity: signInLoading ? 0.6 : 1,
                  marginTop: '0.5rem'
                }}
              >
                {/* Google Icon SVG */}
                {!signInLoading && (
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span style={{ color: 'inherit' }}>
                  {signInLoading ? 'Google 로그인 중...' : 'Google로 로그인'}
                </span>
              </button>

              {/* 안내 문구 */}
              <Text size="2" color="gray" align="center" style={{
                marginTop: '0.5rem',
                opacity: 0.8
              }}>
                계정이 없으시면 자동으로 생성됩니다
              </Text>
            </Flex>
          </div>
        </Flex>
      </Container>
    </div>
  )
}
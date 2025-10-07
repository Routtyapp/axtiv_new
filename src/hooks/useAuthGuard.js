/**
 * useAuthGuard.js - 인증 가드 훅들
 *
 * 역할:
 * - 컴포넌트 레벨에서 인증 체크 및 리다이렉션
 * - 미인증 사용자 자동 리다이렉션
 * - ProtectedRoute의 대안으로 사용 가능
 *
 * 상호작용:
 * - Import: hooks/useAuth (인증 상태 접근)
 * - Export: useAuthGuard, useRequireAuth
 * - 사용처: (현재 미사용, ProtectedRoute 사용 중)
 *   - 필요 시 개별 컴포넌트에서 사용 가능
 *
 * ProtectedRoute vs useAuthGuard:
 * - ProtectedRoute: 라우트 레벨 보호 (선호)
 * - useAuthGuard: 컴포넌트 레벨 보호 (세밀한 제어)
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from './useAuth'

/**
 * useAuthGuard - 커스터마이징 가능한 인증 가드
 * @param {string} redirectTo - 미인증 시 리다이렉션 경로 (기본: '/login')
 * @returns {object} { isAuthenticated: boolean, loading: boolean }
 * @usedBy (현재 미사용)
 *
 * 사용 예시:
 * ```javascript
 * function AdminPage() {
 *   const { isAuthenticated, loading } = useAuthGuard('/admin/login')
 *   if (loading) return <Loading />
 *   return <div>Admin Content</div>
 * }
 * ```
 */
export const useAuthGuard = (redirectTo = '/login') => {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  // 로딩 완료 후 미인증이면 리다이렉션
  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      navigate(redirectTo, { replace: true })  // replace: 뒤로가기 방지
    }
  }, [isAuthenticated, loading, navigate, redirectTo])

  return { isAuthenticated: isAuthenticated(), loading }
}

/**
 * useRequireAuth - 간단한 인증 필수 훅
 * @returns {object} { user: object, isAuthenticated: boolean, loading: boolean }
 * @usedBy (현재 미사용)
 *
 * useAuthGuard와의 차이:
 * - 리다이렉션 경로 고정 ('/login')
 * - user 객체도 함께 반환
 *
 * 사용 예시:
 * ```javascript
 * function ProfilePage() {
 *   const { user, loading } = useRequireAuth()
 *   if (loading) return <Loading />
 *   return <div>Hello {user.email}</div>
 * }
 * ```
 */
export const useRequireAuth = () => {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  // 로딩 완료 후 미인증이면 /login으로 리다이렉션
  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  return { user, isAuthenticated: isAuthenticated(), loading }
}
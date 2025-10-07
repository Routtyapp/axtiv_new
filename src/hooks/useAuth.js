/**
 * useAuth.js - 인증 컨텍스트 소비 훅
 *
 * 역할:
 * - AuthContext의 값을 쉽게 사용하기 위한 커스텀 훅
 * - Context API의 보일러플레이트 코드 제거
 * - Provider 외부에서 사용 시 에러 처리
 *
 * 상호작용:
 * - Import: contexts/AuthContext (인증 컨텍스트)
 * - Export: useAuth (커스텀 훅)
 * - 사용처:
 *   - components/pages/Auth.jsx (로그인 페이지)
 *   - components/pages/AuthCallback.jsx (OAuth 콜백)
 *   - components/auth/ProtectedRoute.jsx (라우트 가드)
 *   - components/pages/WorkspaceDetail.jsx (사용자 정보 표시)
 *   - 기타 모든 인증이 필요한 컴포넌트
 *
 * 반환값:
 * - user: 정규화된 사용자 객체
 * - session: Supabase 세션 객체
 * - loading: 로딩 상태
 * - signInWithGoogle: Google OAuth 로그인 함수
 * - signOut: 로그아웃 함수
 * - refreshSession: 세션 갱신 함수
 * - isAuthenticated: 인증 여부 확인 함수
 *
 * 사용 예시:
 * ```javascript
 * const { user, loading, signInWithGoogle } = useAuth()
 * if (loading) return <div>Loading...</div>
 * if (!user) return <button onClick={signInWithGoogle}>Login</button>
 * return <div>Welcome {user.email}</div>
 * ```
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * useAuth - 인증 컨텍스트 접근 훅
 * @returns {object} AuthContext의 모든 값과 함수
 * @throws {Error} AuthProvider 외부에서 사용 시
 */
export function useAuth() {
  const context = useContext(AuthContext);

  // Provider 외부에서 사용하면 에러 발생 (개발자 실수 방지)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default useAuth;
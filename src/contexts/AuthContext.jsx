/**
 * AuthContext.jsx - 전역 인증 상태 관리 컨텍스트
 *
 * 역할:
 * - Supabase Auth 세션 관리 (로그인/로그아웃/토큰 갱신)
 * - 사용자 인증 상태를 전역으로 제공
 * - Realtime 인증 토큰 자동 동기화
 * - Zustand userStore와 상태 동기화
 *
 * 상호작용:
 * - Import:
 *   - lib/supabase (Supabase 클라이언트)
 *   - types/user.types (사용자 데이터 정규화)
 *   - store/userStore (Zustand 전역 스토어)
 * - Export: AuthContext, AuthProvider (default)
 * - 사용처:
 *   - App.jsx (루트에서 전체 앱을 래핑)
 *   - hooks/useAuth.js (컨텍스트 소비용 훅)
 *   - components/auth/ProtectedRoute.jsx (인증 체크)
 *
 * 데이터 흐름:
 * 1. Supabase Auth 세션 변경 감지
 * 2. syncUserState → AuthContext state + userStore 동기화
 * 3. Realtime 토큰 설정 (useRealtimeChat에서 사용)
 * 4. 모든 하위 컴포넌트에서 useAuth()로 접근 가능
 *
 * 주요 기능:
 * - signInWithGoogle: Google OAuth 로그인
 * - signOut: 로그아웃 및 상태 초기화
 * - refreshSession: 토큰 수동 갱신
 * - isAuthenticated: 인증 여부 체크
 */

import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";  // Supabase 클라이언트
import { normalizeUser } from "../types/user.types";  // 사용자 데이터 정규화 함수
import userStore from "../store/userStore";  // Zustand 스토어

// Context 생성 - 전역 인증 상태를 공유
export const AuthContext = createContext({});

/**
 * AuthProvider - 인증 컨텍스트 프로바이더
 * @param {object} props
 * @param {React.ReactNode} props.children - 하위 컴포넌트
 * @returns {JSX.Element}
 */
const AuthProvider = ({ children }) => {
  // 로컬 상태 관리
  const [user, setUser] = useState(null);  // 정규화된 사용자 정보
  const [loading, setLoading] = useState(true);  // 초기 로딩 상태
  const [session, setSession] = useState(null);  // Supabase 세션 객체

  // Zustand userStore 액세스
  const {
    setUser: setStoreUser,  // 스토어에 사용자 저장
    login: storeLogin,  // 스토어에 세션 저장
    logout: storeLogout,  // 스토어 초기화
  } = userStore();

  /**
   * syncUserState - AuthContext와 userStore의 상태를 동기화
   * @param {object|null} session - Supabase 세션 객체
   * @uses normalizeUser - 사용자 데이터 정규화
   * @usedBy useEffect (초기 로딩, auth state change)
   */
  const syncUserState = (session) => {
    // 1. 사용자 데이터 정규화 (session.user → normalizedUser)
    const normalizedUser = session?.user ? normalizeUser(session.user) : null;

    // 2. 로컬 상태 업데이트
    setSession(session);
    setUser(normalizedUser);

    // 3. Zustand 스토어 동기화 (전역 상태)
    if (session && normalizedUser) {
      storeLogin(session);  // 세션 저장
      setStoreUser(normalizedUser);  // 사용자 정보 저장
    } else {
      storeLogout();  // 로그아웃 시 스토어 초기화
    }
  };

  /**
   * 초기 세션 로딩 및 Auth 상태 변경 감지
   * - 앱 시작 시 저장된 세션 확인
   * - 로그인/로그아웃/토큰 갱신 이벤트 리스너 등록
   * - Realtime 인증 토큰 자동 동기화 (중요!)
   * @usedBy App.jsx (최초 마운트 시)
   */
  useEffect(() => {
    /**
     * getInitialSession - 초기 세션 로딩
     * @uses supabase.auth.getSession() - 저장된 세션 가져오기
     * @uses syncUserState - 상태 동기화
     */
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // 🔐 CRITICAL: Realtime 인증 토큰 설정
        // useRealtimeChat에서 Realtime 구독 시 필요
        if (session?.access_token) {
          console.log("🔐 초기 Realtime 토큰 설정");
          supabase.realtime.setAuth(session.access_token);
        } else {
          console.log("🔓 초기 로딩: 세션 없음");
          supabase.realtime.setAuth(null);
        }

        syncUserState(session);
      } catch (error) {
        console.error("Error getting session:", error);
        syncUserState(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Auth 상태 변경 리스너 등록
    // 이벤트 종류: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", event, session?.user?.id);

      // Realtime 인증 토큰 동기화 (모든 Auth 이벤트에서 실행)
      if (session?.access_token) {
        console.log("🔐 Realtime 토큰 전역 동기화 (event:", event, ")");
        supabase.realtime.setAuth(session.access_token);

        // 토큰 자동 갱신 이벤트 (1시간마다)
        if (event === 'TOKEN_REFRESHED') {
          console.log("✅ 토큰 자동 갱신 완료 - 만료 방지");
        }
      } else {
        console.log("🔓 Realtime 토큰 제거 (event:", event, ")");
        supabase.realtime.setAuth(null);
      }

      syncUserState(session);
      setLoading(false);
    });

    // Cleanup: 컴포넌트 언마운트 시 리스너 해제
    return () => subscription.unsubscribe();
  }, [storeLogin, storeLogout, setStoreUser]);

  /**
   * signInWithGoogle - Google OAuth 로그인
   * @returns {Promise<void>}
   * @throws {Error} 로그인 실패 시
   * @usedBy components/pages/Auth.jsx (로그인 버튼 클릭)
   * @flow Google 로그인 팝업 → /auth/callback 리다이렉트 → AuthCallback.jsx → 홈
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,  // OAuth 콜백 URL
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * signOut - 로그아웃
   * - Supabase 세션 종료
   * - 로컬 상태 및 스토어 초기화
   * @returns {Promise<void>}
   * @throws {Error} 로그아웃 실패 시
   * @usedBy components/pages/WorkspaceDetail.jsx (로그아웃 버튼)
   */
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 명시적으로 상태 정리 (Context + Store)
      syncUserState(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * refreshSession - 세션 수동 갱신
   * - 토큰 만료 시 수동 갱신 (자동 갱신은 Supabase가 처리)
   * @returns {Promise<Session|null>} 갱신된 세션 객체
   * @throws {Error} 갱신 실패 시
   * @usedBy hooks/useAuthGuard.js (토큰 만료 시 재시도)
   */
  const refreshSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) throw error;

      // 갱신된 세션으로 상태 동기화
      if (session) {
        syncUserState(session);
      }

      return session;
    } catch (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }
  };

  /**
   * isAuthenticated - 인증 여부 확인
   * @returns {boolean} 인증 여부
   * @usedBy components/auth/ProtectedRoute.jsx (라우트 가드)
   */
  const isAuthenticated = () => {
    return !!user && !!session;
  };

  // Context에 제공할 값 (모든 하위 컴포넌트에서 useAuth()로 접근 가능)
  const value = {
    user,  // 정규화된 사용자 정보
    session,  // Supabase 세션 객체
    loading,  // 로딩 상태
    signInWithGoogle,  // Google OAuth 로그인 함수
    signOut,  // 로그아웃 함수
    refreshSession,  // 세션 갱신 함수
    isAuthenticated,  // 인증 여부 확인 함수
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

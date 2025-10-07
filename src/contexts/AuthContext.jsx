import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { normalizeUser } from "../types/user.types";
import userStore from "../store/userStore";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // userStore 액세스
  const {
    setUser: setStoreUser,
    login: storeLogin,
    logout: storeLogout,
  } = userStore();

  // 사용자 상태 동기화 함수
  const syncUserState = (session) => {
    const normalizedUser = session?.user ? normalizeUser(session.user) : null;

    setSession(session);
    setUser(normalizedUser);

    // userStore와 동기화
    if (session && normalizedUser) {
      storeLogin(session);
      setStoreUser(normalizedUser);
    } else {
      storeLogout();
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // 🔐 초기 로딩 시에도 Realtime 토큰 설정 (Critical Fix)
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", event, session?.user?.id);

      // Realtime 인증 토큰 동기화
      if (session?.access_token) {
        console.log("🔐 Realtime 토큰 전역 동기화 (event:", event, ")");
        supabase.realtime.setAuth(session.access_token);

        // 토큰 갱신 이벤트 로그
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

    return () => subscription.unsubscribe();
  }, [storeLogin, storeLogout, setStoreUser]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);


      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 명시적으로 상태 정리
      syncUserState(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

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

  const isAuthenticated = () => {
    return !!user && !!session;
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
    refreshSession,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

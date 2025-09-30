import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeUser, isValidUser } from "../types/user.types";

const userStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,

      setUser: (user) => {
        const normalizedUser = user ? normalizeUser(user) : null
        set({
          user: normalizedUser,
          isAuthenticated: isValidUser(normalizedUser)
        })
      },

      setSession: (session) => {
        const normalizedUser = session?.user ? normalizeUser(session.user) : null
        set({
          session,
          user: normalizedUser,
          isAuthenticated: isValidUser(normalizedUser)
        })
      },

      setLoading: (loading) => set({ loading }),

      login: (session) => {
        const normalizedUser = session?.user ? normalizeUser(session.user) : null
        set({
          session,
          user: normalizedUser,
          isAuthenticated: isValidUser(normalizedUser),
          loading: false
        })
      },

      logout: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          loading: false
        }),

      updateUserProfile: (updates) => {
        const currentUser = get().user;
        if (isValidUser(currentUser)) {
          const updatedUser = {
            ...currentUser,
            ...updates,
            // 메타데이터 업데이트 지원
            user_metadata: {
              ...currentUser.user_metadata,
              ...(updates.user_metadata || {})
            }
          }
          const normalizedUser = normalizeUser(updatedUser)
          set({
            user: normalizedUser
          });
        }
      },

      clearAuth: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          loading: false
        })
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // session은 저장하지 않음 (보안상 이유)
      }),
      // 저장된 데이터 복원 시 정규화
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.user = normalizeUser(state.user)
          state.isAuthenticated = isValidUser(state.user)
        }
      }
    }
  )
);

export default userStore;

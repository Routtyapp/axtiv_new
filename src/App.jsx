/**
 * App.jsx - 메인 애플리케이션 컴포넌트
 *
 * 역할:
 * - 전역 라우팅 구조 정의 (React Router)
 * - 전역 인증 상태 관리 (AuthProvider)
 * - 테마 설정 및 관리 (Radix UI Theme)
 * - 보호된 라우트와 공개 라우트 구분
 *
 * 상호작용:
 * - Import:
 *   - contexts/AuthContext (전역 인증 상태)
 *   - components/auth/ProtectedRoute (인증 필요 라우트)
 *   - components/pages/* (모든 페이지 컴포넌트)
 * - Export: App (default)
 * - 사용처: main.jsx (진입점에서 직접 렌더링)
 *
 * 라우팅 구조:
 * - Public Routes:
 *   - / : Home (랜딩 페이지)
 *   - /login : Auth (로그인/회원가입)
 *   - /auth/callback : AuthCallback (OAuth 콜백)
 * - Protected Routes (로그인 필요):
 *   - /companies : Company (회사 목록)
 *   - /company/:companyId/workspaces : Workspace (워크스페이스 목록)
 *   - /company/:companyId/workspace/:workspaceId : WorkspaceDetail (워크스페이스 상세)
 *
 * 데이터 흐름:
 * - 테마: localStorage → state → MutationObserver → Radix Theme
 * - 인증: AuthProvider → ProtectedRoute → 페이지 컴포넌트
 */

import { useEffect, useState } from 'react'
import { Theme } from '@radix-ui/themes'  // Radix UI 테마 시스템
import { BrowserRouter, Route, Routes } from 'react-router'  // React Router v7
import AuthProvider from './contexts/AuthContext'  // 전역 인증 컨텍스트
import { ProtectedRoute } from './components/auth'  // 인증 가드
import Auth from './components/pages/Auth'  // 로그인/회원가입 페이지
import AuthCallback from './components/pages/AuthCallback'  // OAuth 콜백 처리
import Home from './components/pages/Home'  // 홈 페이지
import Company from './components/pages/Company'  // 회사 목록 페이지
import Workspace from './components/pages/Workspace'  // 워크스페이스 목록 페이지
import WorkspaceDetail from './components/pages/WorkspaceDetail'  // 워크스페이스 상세 페이지
import './App.css'

/**
 * App - 메인 애플리케이션 컴포넌트
 *
 * @returns {JSX.Element} 전체 애플리케이션 트리
 */
function App() {
  // 테마 상태 (light/dark)
  const [theme, setTheme] = useState('light')

  /**
   * 테마 초기화 및 변경 감지
   * - localStorage에서 저장된 테마 불러오기
   * - MutationObserver로 document.documentElement의 'dark' 클래스 감지
   * - animated-theme-toggler.jsx의 변경사항을 실시간 반영
   */
  useEffect(() => {
    // 1. 초기 테마 설정 (localStorage → state → DOM)
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    }

    // 2. 테마 변경 실시간 감지 (AnimatedThemeToggler가 DOM 변경 시)
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    })

    // 3. <html> 태그의 class 속성 변경 감지
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // 4. Cleanup: 컴포넌트 언마운트 시 Observer 해제
    return () => observer.disconnect()
  }, [])

  return (
    // Radix UI Theme Provider - 전역 디자인 시스템 설정
    <Theme
      appearance={theme}  // light/dark 모드
      accentColor="blue"  // 주요 색상
      grayColor="slate"  // 회색 계열
      radius="medium"  // 모서리 둥글기
      scaling="100%"  // UI 스케일
    >
      {/* 전역 인증 상태 관리 - 모든 하위 컴포넌트에서 useAuth() 사용 가능 */}
      <AuthProvider>
        {/* React Router v7 - 클라이언트 사이드 라우팅 */}
        <BrowserRouter>
          <Routes>
            {/* 공개 라우트 (Public Routes) */}
            <Route path="/" element={<Home />}/>  {/* 랜딩 페이지 */}
            <Route path="/login" element={<Auth />} />  {/* 로그인/회원가입 */}
            <Route path="/auth/callback" element={<AuthCallback />} />  {/* OAuth 콜백 */}

            {/* 보호된 라우트 (Protected Routes) - 로그인 필요 */}
            <Route
              path="/companies"
              element={
                <ProtectedRoute>  {/* 인증 체크 → 미인증 시 /login으로 리다이렉트 */}
                  <Company />  {/* 회사 목록 페이지 */}
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/:companyId/workspaces"
              element={
                <ProtectedRoute>
                  <Workspace />  {/* 워크스페이스 목록 페이지 */}
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/:companyId/workspace/:workspaceId"
              element={
                <ProtectedRoute>
                  <WorkspaceDetail />  {/* 워크스페이스 상세 페이지 (채팅, 미팅, 대시보드) */}
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Theme>
  )
}

export default App

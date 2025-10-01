import { useEffect, useState } from 'react'
import { Theme } from '@radix-ui/themes'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth'
import { Pointer } from './components/ui/pointer'
import Auth from './components/pages/Auth'
import AuthCallback from './components/pages/AuthCallback'
import Home from './components/pages/Home'
import Company from './components/pages/Company'
import Workspace from './components/pages/Workspace'
import WorkspaceDetail from './components/pages/WorkspaceDetail'
import './App.css'

function App() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // 초기 테마 설정
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    }

    // 테마 변경 감지
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <Theme
      appearance={theme}
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
      style={{ cursor: "none" }}
    >
      <Pointer />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />}/>
            <Route path="/login" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <Company />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/:companyId/workspaces"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/:companyId/workspace/:workspaceId"
              element={
                <ProtectedRoute>
                  <WorkspaceDetail />
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

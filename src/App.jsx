import { Theme } from '@radix-ui/themes'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth'
import Auth from './components/pages/Auth'
import AuthCallback from './components/pages/AuthCallback'
import Home from './components/pages/Home'
import Test from './components/pages/Test'
import Company from './components/pages/Company'
import Workspace from './components/pages/Workspace'
import WorkspaceDetail from './components/pages/WorkspaceDetail'
import './App.css'

function App() {
  return (
    <Theme
      appearance="light"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
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
            <Route
              path="/test"
              element={
                <ProtectedRoute>
                  <Test />
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

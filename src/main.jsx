/**
 * main.jsx - 애플리케이션 진입점 (Entry Point)
 *
 * 역할:
 * - React 애플리케이션의 최초 렌더링을 담당
 * - DOM의 'root' 엘리먼트에 React 트리를 마운트
 * - 전역 스타일시트 임포트 (Radix UI, Tailwind CSS)
 *
 * 상호작용:
 * - Import: App.jsx (메인 컴포넌트)
 * - Export: 없음 (진입점이므로 직접 실행)
 * - 실행 흐름: index.html → main.jsx → App.jsx → AuthProvider → Router
 *
 * 참고:
 * - StrictMode는 주석 처리됨 (개발 중 이중 렌더링 방지)
 * - Vite가 이 파일을 자동으로 찾아서 빌드 시작점으로 사용
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@radix-ui/themes/styles.css'  // Radix UI 디자인 시스템 스타일
import 'react-big-calendar/lib/css/react-big-calendar.css'  // React Big Calendar 스타일
import './index.css'  // Tailwind CSS 및 전역 스타일
import App from './App.jsx'  // 메인 애플리케이션 컴포넌트

// React 18의 createRoot API를 사용하여 동시성 렌더링 지원
createRoot(document.getElementById('root')).render(
  // <StrictMode>  // 개발 모드 디버깅 도구 (현재 비활성화)
    <App />
  // </StrictMode>,
)

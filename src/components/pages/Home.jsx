/**
 * Home.jsx - 랜딩 페이지 (메인 홈페이지)
 *
 * 역할:
 * - 애플리케이션 소개 및 마케팅 페이지
 * - 로그인된 사용자와 비로그인 사용자 다른 UI 표시
 * - AuthContext를 통한 안전한 세션 사용
 *
 * 상호작용:
 * - Import:
 *   - hooks/useAuth (안전한 세션 접근)
 *   - store/userStore (Zustand 전역 스토어)
 *   - components/layout/TopHeader (상단 네비게이션)
 *   - components/ui/ripple (배경 애니메이션)
 * - Export: Home (default)
 * - 사용처: App.jsx (/ 루트 경로)
 * - DB: users 테이블 (user_id로 사용자 정보 조회)
 *
 * UI 분기:
 * - authLoading=true: 로딩 중
 * - user 있음: "시작하기" 버튼 → /companies
 * - user 없음: "내 프로젝트로 이동" + "AI 도구 사용하기" → /login
 *
 * 데이터 흐름:
 * 1. useAuth로 AuthContext에서 안전하게 세션 가져오기
 * 2. authUser.id로 users 테이블 쿼리
 * 3. userStore에 사용자 정보 저장
 * 4. UI 렌더링 (로그인 여부에 따라 다름)
 *
 * ⚠️ 중요: localStorage 직접 접근 제거됨 (보안 강화)
 * - Before: localStorage.getItem + JSON.parse (에러 위험)
 * - After: useAuth 훅 사용 (안전)
 */

import { useEffect } from "react";
import { Link } from "react-router";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { supabase } from "../../lib/supabase";  // Supabase 클라이언트
import userStore from "../../store/userStore";  // Zustand 스토어
import { useAuth } from "../../hooks/useAuth";  // 안전한 세션 접근
import { Button, Badge } from "../ui";
import { Container, TopHeader } from "../layout";
import { Ripple } from "@/components/ui/ripple";  // 배경 애니메이션 효과

const Home = () => {
  const { user, setUser } = userStore();  // Zustand 전역 스토어
  const { user: authUser, loading: authLoading } = useAuth();  // AuthContext에서 세션 가져오기

  useEffect(() => {
    // 🔐 AuthContext를 통한 안전한 세션 사용 (localStorage 직접 접근 제거)
    if (authLoading) return;  // 인증 로딩 중이면 대기

    const userId = authUser?.id;

    if (userId) getUserData(userId);
    else console.log("No user ID found");
  }, [authUser, authLoading]);

  const getUserData = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.log("Error fetching user data:", error.message);
      return;
    }

    if (data) {
      setUser(data);
    }
  };

  return (
    <>
      {/* Header */}
      <TopHeader />

      {/* Main Content */}
      <div
        className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-[#121212] dark:via-[#1E1E1E] dark:to-[#232323] relative overflow-hidden pt-16"
      >
        {/* Ripple Background */}
        <div className="absolute inset-0" style={{ overflow: "hidden" }}>
          <Ripple mainCircleSize={350} numCircles={10} />
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "1.5rem" }}>
          {user ? (
            <Flex
              direction="column"
              gap="8"
              align="center"
              justify="center"
              style={{
                minHeight: "calc(100vh - 64px)",
              }}
            >
              {/* Hero Section */}
              <Flex
                direction="column"
                align="center"
                gap="6"
                style={{
                  animation: "fadeIn 1s ease-in",
                  width: "100%",
                  padding: "0 2rem",
                  maxWidth: "1400px",
                }}
              >
                {/* Main Title */}
                <Heading
                  size="9"
                  weight="bold"
                  align="center"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    letterSpacing: "-0.03em",
                    fontSize: "clamp(2.5rem, 10vw, 5.5rem)",
                    fontFamily:
                      "'Inter', 'Pretendard', -apple-system, sans-serif",
                    fontWeight: "900",
                    lineHeight: "1.1",
                    maxWidth: "100%",
                  }}
                >
                  BE AXTIV
                </Heading>

                {/* Subtitle */}
                <Text
                  size="5"
                  align="center"
                  style={{
                    color: "#64748b",
                    fontWeight: "400",
                    lineHeight: "1.6",
                    maxWidth: "600px",
                    fontSize: "clamp(1rem, 2vw, 1.25rem)",
                  }}
                >
                  팀의 잠재력을 AI와 함께 극대화하세요
                </Text>

                {/* CTA Button */}
                <Link
                  to="/companies"
                  style={{ textDecoration: "none", marginTop: "0.5rem" }}
                >
                  <Button
                    size="4"
                    style={{
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                      border: "none",
                      fontSize: "16px",
                      padding: "14px 40px",
                      color: "white",
                      fontWeight: "600",
                      borderRadius: "12px",
                      boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 32px rgba(59, 130, 246, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(59, 130, 246, 0.4)";
                    }}
                  >
                    시작하기 →
                  </Button>
                </Link>
              </Flex>
            </Flex>
          ) : (
            <Flex
              justify="center"
              align="center"
              direction="column"
              style={{
                minHeight: "calc(100vh - 64px)",
                paddingTop: "6rem",
                paddingBottom: "4rem",
              }}
            >
              {/* Hero Section */}
              <Flex
                direction="column"
                align="center"
                gap="8"
                style={{ maxWidth: "900px", width: "100%" }}
              >
                {/* AI Badge */}
                <Badge
                  size="3"
                  style={{
                    background: "rgba(139, 92, 246, 0.12)",
                    color: "#7c3aed",
                    padding: "10px 20px",
                    fontSize: "15px",
                    fontWeight: "500",
                    border: "none",
                  }}
                >
                  ✨ AI 기반 차세대 협업 플랫폼
                </Badge>

                {/* Main Title */}
                <Flex direction="column" align="center" gap="4">
                  <Heading
                    size="9"
                    weight="bold"
                    align="center"
                    style={{
                      color: "#1e293b",
                      letterSpacing: "-0.03em",
                      lineHeight: "1.1",
                      fontSize: "4.5rem",
                    }}
                  >
                    팀의 잠재력을
                  </Heading>
                  <Heading
                    size="9"
                    weight="bold"
                    align="center"
                    style={{
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      letterSpacing: "-0.03em",
                      lineHeight: "1.1",
                      fontSize: "4.5rem",
                    }}
                  >
                    AI와 함께 극대화하세요
                  </Heading>
                </Flex>

                {/* Subtitle */}
                <Text
                  size="5"
                  align="center"
                  style={{
                    color: "#475569",
                    lineHeight: "1.7",
                    maxWidth: "700px",
                    fontWeight: "400",
                  }}
                >
                  실시간 AI 어시스턴트와 함께 팀 커뮤니케이션을 혁신하고,
                  <br />
                  업무 효율성을 극대화하는 차세대 협업 플랫폼
                </Text>

                {/* CTA Buttons */}
                <Flex gap="4" style={{ marginTop: "2rem" }}>
                  <Link to="/companies" style={{ textDecoration: "none" }}>
                    <Button
                      size="4"
                      style={{
                        background:
                          "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        border: "none",
                        fontSize: "17px",
                        padding: "14px 32px",
                        color: "white",
                        fontWeight: "600",
                        boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 20px rgba(59, 130, 246, 0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 14px rgba(59, 130, 246, 0.4)";
                      }}
                    >
                      내 프로젝트로 이동 →
                    </Button>
                  </Link>
                  <Link to="/login" style={{ textDecoration: "none" }}>
                    <Button
                      size="4"
                      variant="outline"
                      style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        fontSize: "17px",
                        padding: "14px 32px",
                        color: "#475569",
                        fontWeight: "600",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0, 0, 0, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      🤖 AI 도구 사용하기
                    </Button>
                  </Link>
                </Flex>
              </Flex>
            </Flex>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;

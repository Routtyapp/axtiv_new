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

// AI 모델 데이터
const AI_MODELS = {
  openai: [
    {
      name: "GPT-5",
      badge: "최신",
      badgeColor: "#8b5cf6",
      inputPrice: "₩53",
      outputPrice: "₩420",
      highlight: true,
      highlightColor: "#10b981",
    },
    {
      name: "GPT-4.1",
      badge: "추천",
      badgeColor: "#10b981",
      inputPrice: "₩42",
      outputPrice: "₩336",
      highlight: false,
    },
  ],
  anthropic: [
    {
      name: "Claude Opus 4.1",
      badge: "최고 성능",
      badgeColor: "#8b5cf6",
      inputPrice: "₩630",
      outputPrice: "₩3,150",
      highlight: false,
    },
    {
      name: "Claude Sonnet 4.5",
      badge: "추천",
      badgeColor: "#10b981",
      inputPrice: "₩126",
      outputPrice: "₩630",
      highlight: true,
      highlightColor: "#a855f7",
    },
    {
      name: "Claude 3.7 Sonnet",
      badge: "균형",
      badgeColor: "#3b82f6",
      inputPrice: "₩100",
      outputPrice: "₩500",
      highlight: false,
    },
  ],
};

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
      <div className="pt-16">
        {/* Hero Section */}
        <div
          className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-[#121212] dark:via-[#1E1E1E] dark:to-[#232323] relative overflow-hidden"
        >
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

        {/* AI Models Pricing Section */}
        <section
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            background: "white",
            padding: "4rem 2rem",
            marginTop: "3rem",
          }}
        >
          <Flex
            direction="column"
            gap="6"
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
            }}
          >
            {/* Section Header */}
            <Flex direction="column" align="center" gap="3">
              <Heading
                size="8"
                weight="bold"
                align="center"
                style={{
                  color: "#1e293b",
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                AI 토큰 사용 요금
              </Heading>
              <Text
                size="4"
                align="center"
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                }}
              >
                10,000 토큰당 요금 (VAT 포함)
              </Text>
            </Flex>

            {/* Models Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "2rem",
                marginTop: "2rem",
              }}
            >
              {/* OpenAI Column */}
              <Flex direction="column" gap="4">
                <Flex align="center" gap="3">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.2819 9.8211C23.0553 10.6613 23.5 11.7614 23.5 13C23.5 15.4853 21.4853 17.5 19 17.5H5C2.51472 17.5 0.5 15.4853 0.5 13C0.5 10.5147 2.51472 8.5 5 8.5H19C19.8284 8.5 20.5 7.82843 20.5 7C20.5 6.17157 19.8284 5.5 19 5.5H12"
                      stroke="#10a37f"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="12" r="3" fill="#10a37f" />
                  </svg>
                  <Heading size="5" weight="bold" style={{ color: "#1e293b" }}>
                    OpenAI GPT 모델
                  </Heading>
                </Flex>

                {AI_MODELS.openai.map((model, index) => (
                    <div
                      key={index}
                      style={{
                        background: "white",
                        border: model.highlight
                          ? `2px solid ${model.highlightColor}`
                          : "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        transition: "all 0.3s ease",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <Flex direction="column" gap="3">
                        <Flex align="center" justify="between">
                          <Flex align="center" gap="2">
                            <Text
                              size="4"
                              weight="bold"
                              style={{ color: "#1e293b" }}
                            >
                              {model.name}
                            </Text>
                            {model.badge && (
                              <Badge
                                size="1"
                                style={{
                                  background: model.badgeColor,
                                  color: "white",
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                }}
                              >
                                {model.badge}
                              </Badge>
                            )}
                          </Flex>
                        </Flex>
                        <Flex justify="between" align="center">
                          <Flex direction="column" gap="1">
                            <Text size="1" style={{ color: "#64748b" }}>
                              입력:
                            </Text>
                            <Text
                              size="3"
                              weight="bold"
                              style={{ color: "#1e293b" }}
                            >
                              {model.inputPrice}
                            </Text>
                          </Flex>
                          <Flex direction="column" gap="1">
                            <Text size="1" style={{ color: "#64748b" }}>
                              출력:
                            </Text>
                            <Text
                              size="3"
                              weight="bold"
                              style={{ color: "#1e293b" }}
                            >
                              {model.outputPrice}
                            </Text>
                          </Flex>
                        </Flex>
                      </Flex>
                    </div>
                  ))}
              </Flex>

              {/* Anthropic Column */}
              <Flex direction="column" gap="4">
                <Flex align="center" gap="3">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      fill="#d97757"
                      stroke="#d97757"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="#d97757"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="#d97757"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <Heading size="5" weight="bold" style={{ color: "#1e293b" }}>
                    Anthropic Claude 모델
                  </Heading>
                </Flex>

                {AI_MODELS.anthropic.map((model, index) => (
                  <div
                    key={index}
                    style={{
                      background: "white",
                      border: model.highlight
                        ? `2px solid ${model.highlightColor}`
                        : "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      transition: "all 0.3s ease",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Flex direction="column" gap="3">
                      <Flex align="center" justify="between">
                        <Flex align="center" gap="2">
                          <Text
                            size="4"
                            weight="bold"
                            style={{ color: "#1e293b" }}
                          >
                            {model.name}
                          </Text>
                          {model.badge && (
                            <Badge
                              size="1"
                              style={{
                                background: model.badgeColor,
                                color: "white",
                                fontSize: "11px",
                                padding: "2px 8px",
                              }}
                            >
                              {model.badge}
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                      <Flex justify="between" align="center">
                        <Flex direction="column" gap="1">
                          <Text size="1" style={{ color: "#64748b" }}>
                            입력:
                          </Text>
                          <Text
                            size="3"
                            weight="bold"
                            style={{ color: "#1e293b" }}
                          >
                            {model.inputPrice}
                          </Text>
                        </Flex>
                        <Flex direction="column" gap="1">
                          <Text size="1" style={{ color: "#64748b" }}>
                            출력:
                          </Text>
                          <Text
                            size="3"
                            weight="bold"
                            style={{ color: "#1e293b" }}
                          >
                            {model.outputPrice}
                          </Text>
                        </Flex>
                      </Flex>
                    </Flex>
                  </div>
                ))}
              </Flex>
            </div>
          </Flex>
        </section>

        {/* Features Section */}
        <section
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            background: "#f8f9fa",
            padding: "4rem 2rem",
            marginTop: "3rem",
          }}
        >
          <Flex
            direction="column"
            gap="6"
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
            }}
          >
            {/* Section Header */}
            <Flex direction="column" align="center" gap="3">
              <Heading
                size="8"
                weight="bold"
                align="center"
                style={{
                  color: "#1e293b",
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                강력한 기능들
              </Heading>
              <Text
                size="4"
                align="center"
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                }}
              >
                AXTIV의 다양한 기능으로 팀의 협업 방식을 혁신하세요
              </Text>
            </Flex>

            {/* Features Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "2rem",
                marginTop: "2rem",
              }}
            >
              {/* Feature 1: AI 채팅 */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                <Flex direction="column" gap="4">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="5" weight="bold">
                      AI 채팅
                    </Heading>
                    <Text size="3" style={{ color: "#64748b", lineHeight: "1.6" }}>
                      실시간 AI 어시스턴트와 함께 팀 협업을 더욱 스마트하게
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        다양한 AI 모델 지원
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        실시간 대화 및 파일 공유
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        스레드 기반 대화 관리
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </div>

              {/* Feature 2: 실시간 분석 */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                <Flex direction="column" gap="4">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18 20V10M12 20V4M6 20v-6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="5" weight="bold">
                      실시간 분석
                    </Heading>
                    <Text size="3" style={{ color: "#64748b", lineHeight: "1.6" }}>
                      데이터 기반 인사이트로 팀 성과 극대화
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        AI 기반 예측 및 트렌드 파악
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        맞춤형 KPI 대시보드 지원
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        이상 징후 감지 및 추가 경보
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </div>

              {/* Feature 3: 스마트 미팅 */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                <Flex direction="column" gap="4">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background:
                        "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="16"
                        y1="2"
                        x2="16"
                        y2="6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="8"
                        y1="2"
                        x2="8"
                        y2="6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="3"
                        y1="10"
                        x2="21"
                        y2="10"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="5" weight="bold">
                      스마트 미팅
                    </Heading>
                    <Text size="3" style={{ color: "#64748b", lineHeight: "1.6" }}>
                      AI가 지원하는 효율적인 회의 관리 시스템
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        회의록 자동 생성 및 핵심 요약
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        실시간 일정 자동 조정
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        후속 조치 자동 추적 및 리마인더
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </div>

              {/* Feature 4: 문서 관리 */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                <Flex direction="column" gap="4">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background:
                        "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="14 2 14 8 20 8"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="16"
                        y1="13"
                        x2="8"
                        y2="13"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="16"
                        y1="17"
                        x2="8"
                        y2="17"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="5" weight="bold">
                      문서 관리
                    </Heading>
                    <Text size="3" style={{ color: "#64748b", lineHeight: "1.6" }}>
                      팀의 모든 지식을 한 곳에서 관리하고 공유
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        AI 지원 문서 분류 및 정리
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        버전 관리 및 변경 이력 추적
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        문서 내 검색 및 연관 자료 추천
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </div>

              {/* Feature 5: 업무 자동화 */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                <Flex direction="column" gap="4">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background:
                        "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 1v6m0 6v6M23 12h-6m-6 0H1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="5" weight="bold">
                      업무 자동화
                    </Heading>
                    <Text size="3" style={{ color: "#64748b", lineHeight: "1.6" }}>
                      반복적인 작업을 AI가 대신 처리
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        워크플로우 자동화로 수작업 90% 감소
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        이메일/슬랙 자동 응답 및 분류
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Text size="2" style={{ color: "#475569" }}>
                        데이터 입력 및 보고서 자동 생성
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </div>
            </div>
          </Flex>
        </section>

        {/* CTA Section */}
        <section
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            background:
              "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            padding: "3.5rem 2rem",
            marginTop: "3rem",
          }}
        >
          <Flex
            direction="column"
            align="center"
            gap="4"
            style={{
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            {/* Title */}
            <Heading
              size="7"
              weight="bold"
              align="center"
              style={{
                color: "white",
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                lineHeight: "1.2",
                letterSpacing: "-0.02em",
              }}
            >
              지금 바로 시작하세요
            </Heading>

            {/* Subtitle */}
            <Text
              size="4"
              align="center"
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                maxWidth: "500px",
                lineHeight: "1.5",
              }}
            >
              14일 무료 체험으로 AXTIV의 모든 기능을 경험해보세요
            </Text>

            {/* CTA Button */}
            <Link
              to={user ? "/companies" : "/login"}
              style={{ textDecoration: "none", marginTop: "0.5rem" }}
            >
              <Button
                size="3"
                style={{
                  background: "white",
                  border: "none",
                  fontSize: "15px",
                  padding: "12px 36px",
                  color: "#3b82f6",
                  fontWeight: "600",
                  borderRadius: "10px",
                  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.15)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 24px rgba(0, 0, 0, 0.15)";
                }}
              >
                무료 체험 시작하기 →
              </Button>
            </Link>

            {/* Bottom Note */}
            <Text
              size="2"
              align="center"
              style={{
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "13px",
                marginTop: "0.25rem",
              }}
            >
              신용카드 없이 사용 가능 • 언제든 취소 가능
            </Text>
          </Flex>
        </section>

        {/* Footer */}
        <footer
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            background: "#f8f9fa",
            padding: "3rem 2rem",
            borderTop: "1px solid #e9ecef",
          }}
        >
          <Flex
            direction="column"
            align="center"
            gap="4"
            style={{
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {/* Logo */}
            <Heading
              size="5"
              weight="bold"
              style={{
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.01em",
              }}
            >
              AXTIV
            </Heading>

            {/* Copyright */}
            <Text
              size="2"
              align="center"
              style={{
                color: "#6c757d",
                fontSize: "14px",
              }}
            >
              © 2024 AXTIV. All rights reserved.
            </Text>

            {/* Additional Info */}
            <Text
              size="2"
              align="center"
              style={{
                color: "#6c757d",
                fontSize: "13px",
              }}
            >
              팀의 협업 방식에 혁신을 가져오는 출입한 협업 플랫폼
            </Text>

            {/* Social Icons */}
            <Flex gap="4" style={{ marginTop: "0.5rem" }}>
              <a
                href="#"
                style={{
                  color: "#9ca3af",
                  transition: "color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a
                href="#"
                style={{
                  color: "#9ca3af",
                  transition: "color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a
                href="#"
                style={{
                  color: "#9ca3af",
                  transition: "color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </Flex>
          </Flex>
        </footer>
      </div>
    </>
  );
};

export default Home;

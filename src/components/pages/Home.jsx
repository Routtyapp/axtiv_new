import { useEffect } from "react";
import { Link } from "react-router";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { supabase } from "../../lib/supabase";
import userStore from "../../store/userStore";
import { Button, Badge } from "../ui";
import { Container, TopHeader } from "../layout";
import { Ripple } from "@/components/ui/ripple";

const Home = () => {
  const { user, setUser } = userStore();

  useEffect(() => {
    const userData = localStorage.getItem("sb-nhvhujoentbvkgpanwwg-auth-token");
    const parsedUser = JSON.parse(userData);
    const userId = parsedUser?.user.id;

    if (userId) getUserData(userId);
    else console.log("No user ID found");
  }, []);

  const getUserData = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", userId)
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
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #f0f4ff 0%, #e8edff 25%, #f5e8ff 50%, #fdf2f8 75%, #fef3f2 100%)",
          position: "relative",
          overflow: "hidden",
          paddingTop: "64px", // Header height
        }}
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

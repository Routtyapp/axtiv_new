import { useEffect } from "react";
import { Link } from "react-router";
import { Flex, Heading, Text, Grid } from "@radix-ui/themes";
import { supabase } from "../../lib/supabase";
import userStore from "../../store/userStore";
import { Button, Card, Avatar, Badge } from "../ui";
import { Container, Header } from "../layout";

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
    <Container>
      <div className="p-6">
        <Header title="AXTIV" subtitle="팀 협업을 위한 워크스페이스 플랫폼" />

        {user ? (
          <Flex direction="column" gap="6" mt="6">
            {/* 사용자 정보 카드 */}
            <Card>
              <Flex align="center" gap="4" p="4">
                <Avatar size="4">
                  {user?.email?.charAt(0).toUpperCase() ||
                    user?.name?.charAt(0).toUpperCase() ||
                    "U"}
                </Avatar>
                <Flex direction="column" gap="1">
                  <Text weight="bold" size="4">
                    안녕하세요!
                  </Text>
                  <Text size="2" color="gray">
                    {user.auth_id}
                  </Text>
                  <Badge variant="soft" color="green" size="1">
                    로그인됨
                  </Badge>
                </Flex>
              </Flex>
            </Card>

            {/* 액션 카드들 */}
            <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
              <Card>
                <Flex direction="column" gap="3" p="5">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    🏢
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="4" weight="bold">
                      내 회사
                    </Heading>
                    <Text size="2" color="gray">
                      소속된 회사들을 확인하고 워크스페이스를 관리하세요
                    </Text>
                  </Flex>
                  <Link to="/companies">
                    <Button variant="solid" size="3" style={{ width: "100%" }}>
                      회사 보기
                    </Button>
                  </Link>
                </Flex>
              </Card>

              <Card>
                <Flex direction="column" gap="3" p="5">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    💬
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="4" weight="bold">
                      팀 채팅
                    </Heading>
                    <Text size="2" color="gray">
                      워크스페이스에서 팀원들과 실시간으로 소통하세요
                    </Text>
                  </Flex>
                  <Link to="/companies">
                    <Button variant="soft" size="3" style={{ width: "100%" }}>
                      채팅 시작하기
                    </Button>
                  </Link>
                </Flex>
              </Card>

              <Card>
                <Flex direction="column" gap="3" p="5">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    ⚙️
                  </div>
                  <Flex direction="column" gap="2">
                    <Heading size="4" weight="bold">
                      테스트
                    </Heading>
                    <Text size="2" color="gray">
                      개발 테스트 페이지입니다
                    </Text>
                  </Flex>
                  <Link to="/test">
                    <Button
                      variant="outline"
                      size="3"
                      style={{ width: "100%" }}
                    >
                      테스트 페이지
                    </Button>
                  </Link>
                </Flex>
              </Card>
            </Grid>

            {/* 최근 활동 */}
            <Card>
              <Flex direction="column" gap="3" p="5">
                <Heading size="4" weight="bold">
                  최근 활동
                </Heading>
                <Text size="2" color="gray">
                  아직 활동 내역이 없습니다. 회사를 생성하거나 워크스페이스에
                  참여해보세요!
                </Text>
              </Flex>
            </Card>
          </Flex>
        ) : (
          <Flex justify="center" align="center" style={{ minHeight: "40vh" }}>
            <Card style={{ maxWidth: "400px", width: "100%" }}>
              <Flex direction="column" align="center" gap="4" p="6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  🔑
                </div>

                <Flex direction="column" align="center" gap="2">
                  <Heading size="5" weight="bold">
                    로그인이 필요합니다
                  </Heading>
                  <Text size="3" color="gray" align="center">
                    AXTIV의 모든 기능을 사용하려면 로그인해주세요
                  </Text>
                </Flex>

                <Link to="/login">
                  <Button size="3" style={{ width: "100%" }}>
                    로그인하기
                  </Button>
                </Link>
              </Flex>
            </Card>
          </Flex>
        )}
      </div>
    </Container>
  );
};

export default Home;

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router"
import { Flex, Heading, Text, Grid } from '@radix-ui/themes'
import { supabase } from "../../lib/supabase"
import userStore from "../../store/userStore"
import { Button, Card, Avatar, Badge, Dialog, Input, Skeleton } from '../ui'
import { Container, Header, Breadcrumb } from '../layout'

const Workspace = () => {
    const { companyId } = useParams()
    const { user } = userStore()
    const [workspaces, setWorkspaces] = useState([])
    const [company, setCompany] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [workspaceName, setWorkspaceName] = useState("")
    const [workspaceDescription, setWorkspaceDescription] = useState("")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (companyId && user) {
            fetchCompanyAndWorkspaces()
        }
    }, [companyId, user])

    const fetchCompanyAndWorkspaces = async () => {
        try {
            // 회사 정보 가져오기
            const { data: companyData, error: companyError } = await supabase
                .from("company")
                .select("*")
                .eq("id", companyId)
                .single()

            if (companyError) {
                console.error("Error fetching company:", companyError.message)
                return
            }

            setCompany(companyData)

            // 워크스페이스 목록 가져오기
            const { data: workspaceData, error: workspaceError } = await supabase
                .from("workspace")
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false })

            if (workspaceError) {
                console.error("Error fetching workspaces:", workspaceError.message)
                return
            }

            setWorkspaces(workspaceData || [])
        } catch (error) {
            console.error("Error:", error)
        } finally {
            setLoading(false)
        }
    }

    const createWorkspace = async () => {
        if (!workspaceName.trim()) {
            alert("워크스페이스명을 입력해주세요.")
            return
        }

        setCreating(true)
        try {
            const { data: workspaceData, error: workspaceError } = await supabase
                .from("workspace")
                .insert({
                    name: workspaceName.trim(),
                    description: workspaceDescription.trim() || null,
                    company_id: companyId,
                    created_by: user.auth_id
                })
                .select()
                .single()

            if (workspaceError) {
                console.error("Error creating workspace:", workspaceError.message)
                alert("워크스페이스 생성 중 오류가 발생했습니다.")
                return
            }

            // 기본 채팅방 자동 생성
            const { data: chatRoomData, error: chatRoomError } = await supabase
                .from("chat_rooms")
                .insert({
                    workspace_id: workspaceData.id,
                    name: "일반",
                    description: "워크스페이스 기본 채팅방",
                    is_default: true,
                    is_direct_message: false,
                    created_by: user.auth_id
                })
                .select()
                .single()

            if (chatRoomError) {
                console.error("Error creating default chat room:", chatRoomError.message)
                alert("워크스페이스는 생성되었지만 기본 채팅방 생성 중 오류가 발생했습니다.")
            } else {
                // 생성자를 채팅방 멤버로 추가
                const { error: memberError } = await supabase
                    .from("chat_room_members")
                    .insert({
                        chat_room_id: chatRoomData.id,
                        user_id: user.auth_id,
                        role: "admin"
                    })

                if (memberError) {
                    console.error("Error adding creator to chat room:", memberError.message)
                }
            }

            alert("워크스페이스가 성공적으로 생성되었습니다!")
            setWorkspaceName("")
            setWorkspaceDescription("")
            setShowCreateModal(false)

            // 워크스페이스 목록 새로고침
            await fetchCompanyAndWorkspaces()

        } catch (error) {
            console.error("Error:", error)
            alert("워크스페이스 생성 중 오류가 발생했습니다.")
        } finally {
            setCreating(false)
        }
    }

    const handleCloseModal = () => {
        setShowCreateModal(false)
        setWorkspaceName("")
        setWorkspaceDescription("")
    }

    const breadcrumbItems = [
        { label: '홈', href: '/' },
        { label: '내 회사', href: '/companies' },
        { label: company?.name + ' 워크스페이스' }
    ]

    if (!user) {
        return (
            <Container>
                <div className="p-6">
                    <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
                        <Card style={{ maxWidth: '400px' }}>
                            <Flex direction="column" align="center" gap="4" p="6">
                                <Text>로그인이 필요합니다.</Text>
                                <Link to="/login">
                                    <Button>로그인하기</Button>
                                </Link>
                            </Flex>
                        </Card>
                    </Flex>
                </div>
            </Container>
        )
    }

    if (loading) {
        return (
            <Container>
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </div>
                    <Text size="1" color="gray" className="text-center">워크스페이스를 불러오는 중...</Text>
                </div>
            </Container>
        )
    }

    if (!company) {
        return (
            <Container>
                <div className="p-6">
                    <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
                        <Card style={{ maxWidth: '400px' }}>
                            <Flex direction="column" align="center" gap="4" p="6">
                                <Text>회사를 찾을 수 없습니다.</Text>
                                <Link to="/companies">
                                    <Button>회사 목록으로 돌아가기</Button>
                                </Link>
                            </Flex>
                        </Card>
                    </Flex>
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <div className="p-6">
                <Breadcrumb items={breadcrumbItems} />

                <Header
                    title={`${company.name} 워크스페이스`}
                    subtitle={company.description || "팀 협업을 위한 워크스페이스를 관리하세요"}
                    actions={
                        <Flex gap="2">
                            <Button
                                variant="solid"
                                onClick={() => setShowCreateModal(true)}
                            >
                                워크스페이스 생성
                            </Button>
                            <Link to="/">
                                <Button variant="soft" color="gray">
                                    홈으로
                                </Button>
                            </Link>
                        </Flex>
                    }
                />

                {workspaces.length === 0 ? (
                    <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
                        <Card style={{ maxWidth: '500px', width: '100%' }}>
                            <Flex direction="column" align="center" gap="4" p="6">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                                    💼
                                </div>
                                <Flex direction="column" align="center" gap="2">
                                    <Heading size="5" weight="bold">생성된 워크스페이스가 없습니다</Heading>
                                    <Text size="3" color="gray" align="center">
                                        첫 번째 워크스페이스를 생성하여 팀 협업을 시작하세요
                                    </Text>
                                </Flex>
                                <Button
                                    size="3"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    워크스페이스 생성하기
                                </Button>
                            </Flex>
                        </Card>
                    </Flex>
                ) : (
                    <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4" mt="6">
                        {workspaces.map((workspace) => (
                            <Card key={workspace.id} className="hover:shadow-lg transition-shadow">
                                <Flex direction="column" gap="4" p="5">
                                    <Flex align="center" gap="3">
                                        <Avatar
                                            fallback={workspace.name.charAt(0)}
                                            size="4"
                                            color="purple"
                                        />
                                        <Flex direction="column" gap="1">
                                            <Heading size="4" weight="bold">
                                                {workspace.name}
                                            </Heading>
                                            <Badge variant="soft" color="green" size="1">
                                                활성
                                            </Badge>
                                        </Flex>
                                    </Flex>

                                    {workspace.description && (
                                        <Text size="2" color="gray">
                                            {workspace.description}
                                        </Text>
                                    )}

                                    <Flex justify="between" align="center" mt="2">
                                        <Text size="1" color="gray">
                                            생성일: {new Date(workspace.created_at).toLocaleDateString()}
                                        </Text>
                                        <Link to={`/company/${companyId}/workspace/${workspace.id}`}>
                                            <Button variant="solid" size="2" color="green">
                                                열기
                                            </Button>
                                        </Link>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Grid>
                )}

                {/* 워크스페이스 관리 섹션 */}
                {workspaces.length > 0 && (
                    <Card mt="8">
                        <Flex direction="column" gap="3" p="5">
                            <Heading size="4" weight="bold">워크스페이스 관리</Heading>
                            <Text size="2" color="gray">
                                워크스페이스는 팀 프로젝트를 관리하는 공간입니다.
                                팀원들과 실시간으로 소통하고 협업하세요.
                            </Text>
                            <Flex gap="2" mt="2">
                                <Button
                                    variant="solid"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    새 워크스페이스 생성
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                )}

                {/* 워크스페이스 생성 다이얼로그 */}
                <Dialog
                    open={showCreateModal}
                    onOpenChange={setShowCreateModal}
                    title="새 워크스페이스 생성"
                    description={`${company.name}에서 새로운 워크스페이스를 생성합니다.`}
                    confirmText={creating ? "생성 중..." : "워크스페이스 생성"}
                    cancelText="취소"
                    onConfirm={createWorkspace}
                    onCancel={handleCloseModal}
                    confirmDisabled={creating || !workspaceName.trim()}
                >
                    <Flex direction="column" gap="4">
                        <Input
                            label="워크스페이스명 *"
                            placeholder="워크스페이스명을 입력하세요"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                        />

                        <Input
                            label="워크스페이스 설명 (선택사항)"
                            placeholder="워크스페이스에 대한 간단한 설명을 입력하세요"
                            multiline
                            rows={3}
                            value={workspaceDescription}
                            onChange={(e) => setWorkspaceDescription(e.target.value)}
                        />
                    </Flex>
                </Dialog>
            </div>
        </Container>
    )
}

export default Workspace
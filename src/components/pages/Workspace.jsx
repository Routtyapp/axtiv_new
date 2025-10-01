import { useState, useEffect } from "react"
import { useParams, Link } from "react-router"
import { Flex, Heading, Text, Grid } from '@radix-ui/themes'
import { supabase } from "../../lib/supabase"
import userStore from "../../store/userStore"
import { Button, Card, Avatar, Badge, Dialog, Input, Skeleton } from '../ui'
import { TopHeader } from '../layout'

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
    const [searchTerm, setSearchTerm] = useState("")
    const [userWorkspaces, setUserWorkspaces] = useState([]) // 사용자가 가입한 워크스페이스 ID 목록
    const [joining, setJoining] = useState(false)
    const [activeTab, setActiveTab] = useState('my') // 'my' | 'search'
    const [workspaceStats, setWorkspaceStats] = useState({}) // 각 워크스페이스의 통계 정보 (멤버 수, 사용자 역할)

    useEffect(() => {
        if (companyId && user) {
            fetchCompanyAndWorkspaces()
            fetchUserWorkspaces()
        }
    }, [companyId, user])

    // 워크스페이스 목록이 로드된 후 통계 정보 조회
    useEffect(() => {
        if (workspaces.length > 0 && user?.auth_id) {
            fetchWorkspaceStats()
        }
    }, [workspaces, user?.auth_id])

    const fetchUserWorkspaces = async () => {
        if (!user?.auth_id) return

        try {
            const { data, error } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("user_id", user.auth_id)

            if (error) {
                console.error("Error fetching user workspaces:", error.message)
                return
            }

            const workspaceIds = data?.map(item => item.workspace_id) || []
            setUserWorkspaces(workspaceIds)
        } catch (error) {
            console.error("Error:", error)
        }
    }

    const fetchWorkspaceStats = async () => {
        if (!user?.auth_id || workspaces.length === 0) return

        try {
            // 모든 워크스페이스의 멤버 정보를 조회
            const workspaceIds = workspaces.map(ws => ws.id)
            const { data: membersData, error: membersError } = await supabase
                .from("workspace_members")
                .select("workspace_id, user_id, role")
                .in("workspace_id", workspaceIds)

            if (membersError) {
                console.error("Error fetching workspace members:", membersError.message)
                return
            }

            // 각 워크스페이스별 통계 계산
            const stats = {}
            workspaces.forEach(workspace => {
                const members = membersData?.filter(m => m.workspace_id === workspace.id) || []
                const memberCount = members.length
                const currentUserMember = members.find(m => m.user_id === user.auth_id)

                // 사용자 역할 결정
                let userRole = "멤버"
                if (workspace.created_by === user.auth_id) {
                    userRole = "생성자"
                } else if (currentUserMember?.role === "admin") {
                    userRole = "관리자"
                }

                stats[workspace.id] = {
                    memberCount,
                    userRole
                }
            })

            setWorkspaceStats(stats)
        } catch (error) {
            console.error("Error:", error)
        }
    }

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

    const joinWorkspace = async (workspaceId) => {
        if (!user?.auth_id) {
            alert("사용자 인증 정보를 찾을 수 없습니다.")
            return
        }

        setJoining(true)
        try {
            const { error } = await supabase
                .from("workspace_members")
                .insert({
                    workspace_id: workspaceId,
                    user_id: user.auth_id,
                    role: "member"
                })

            if (error) {
                console.error("Error joining workspace:", error.message)
                alert("워크스페이스 가입 중 오류가 발생했습니다.")
                return
            }

            alert("워크스페이스에 성공적으로 가입했습니다!")
            await fetchUserWorkspaces()
        } catch (error) {
            console.error("Error:", error)
            alert("워크스페이스 가입 중 오류가 발생했습니다.")
        } finally {
            setJoining(false)
        }
    }

    const handleCloseModal = () => {
        setShowCreateModal(false)
        setWorkspaceName("")
        setWorkspaceDescription("")
    }

    if (loading) {
        return (
            <>
                <TopHeader />
                <div
                    style={{
                        minHeight: "100vh",
                        background: "linear-gradient(180deg, #f0f4ff 0%, #e8edff 25%, #f5e8ff 50%, #fdf2f8 75%, #fef3f2 100%)",
                        position: "relative",
                        overflow: "hidden",
                        paddingTop: "64px",
                    }}
                >
                    <div style={{ padding: "1.5rem" }}>
                        <Flex justify="center" align="center" direction="column" style={{ minHeight: "calc(100vh - 64px)" }}>
                            <Flex direction="column" align="center" gap="4">
                                <Skeleton style={{ width: "200px", height: "40px", borderRadius: "8px" }} />
                                <Skeleton style={{ width: "150px", height: "20px", borderRadius: "4px" }} />
                                <Text size="2" style={{ color: "#94a3b8", marginTop: "1rem" }}>워크스페이스를 불러오는 중...</Text>
                            </Flex>
                        </Flex>
                    </div>
                </div>
            </>
        )
    }

    if (!company) {
        return (
            <>
                <TopHeader />
                <div
                    style={{
                        minHeight: "100vh",
                        background: "linear-gradient(180deg, #f0f4ff 0%, #e8edff 25%, #f5e8ff 50%, #fdf2f8 75%, #fef3f2 100%)",
                        position: "relative",
                        overflow: "hidden",
                        paddingTop: "64px",
                    }}
                >
                    <div style={{ padding: "1.5rem" }}>
                        <Flex justify="center" align="center" direction="column" style={{ minHeight: "calc(100vh - 64px)" }}>
                            <Flex direction="column" align="center" gap="6" style={{ maxWidth: "500px", width: "100%" }}>
                                <div style={{
                                    width: "80px",
                                    height: "80px",
                                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "40px",
                                }}>
                                    ⚠️
                                </div>
                                <Flex direction="column" align="center" gap="2">
                                    <Heading size="6" weight="bold" align="center" style={{ color: "#1e293b" }}>
                                        회사를 찾을 수 없습니다
                                    </Heading>
                                    <Text size="3" align="center" style={{ color: "#64748b" }}>
                                        존재하지 않는 회사이거나 접근 권한이 없습니다
                                    </Text>
                                </Flex>
                                <Link to="/companies" style={{ textDecoration: "none" }}>
                                    <Button
                                        size="3"
                                        style={{
                                            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                                            border: "none",
                                            fontSize: "16px",
                                            padding: "12px 32px",
                                            color: "white",
                                            fontWeight: "600",
                                            borderRadius: "12px",
                                            boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
                                        }}
                                    >
                                        회사 목록으로 돌아가기
                                    </Button>
                                </Link>
                            </Flex>
                        </Flex>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <TopHeader />
            <div
                style={{
                    minHeight: "100vh",
                    background: "linear-gradient(180deg, #f0f4ff 0%, #e8edff 25%, #f5e8ff 50%, #fdf2f8 75%, #fef3f2 100%)",
                    position: "relative",
                    overflow: "hidden",
                    paddingTop: "64px",
                }}
            >
                <div style={{ padding: "1.5rem" }}>
                    {/* 탭 네비게이션 */}
                    <div style={{ maxWidth: "1400px", margin: "0 auto", marginBottom: "2rem" }}>
                        <Flex align="center" gap="3" style={{
                            background: "white",
                            padding: "0.5rem",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                            border: "1px solid #e2e8f0"
                        }}>
                            {/* 내 워크스페이스 탭 */}
                            <button
                                onClick={() => setActiveTab('my')}
                                style={{
                                    background: activeTab === 'my' ? '#f1f5f9' : 'transparent',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: activeTab === 'my' ? '#1e293b' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (activeTab !== 'my') e.currentTarget.style.background = '#f8fafc'
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== 'my') e.currentTarget.style.background = 'transparent'
                                }}
                            >
                                내 워크스페이스 ({userWorkspaces.length})
                            </button>

                            {/* 워크스페이스 검색 탭 */}
                            <button
                                onClick={() => setActiveTab('search')}
                                style={{
                                    background: activeTab === 'search' ? '#f1f5f9' : 'transparent',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: activeTab === 'search' ? '#1e293b' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (activeTab !== 'search') e.currentTarget.style.background = '#f8fafc'
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== 'search') e.currentTarget.style.background = 'transparent'
                                }}
                            >
                                워크스페이스 검색
                            </button>

                            {/* 새로 만들기 버튼 */}
                            <Button
                                size="2"
                                onClick={() => setShowCreateModal(true)}
                                style={{
                                    marginLeft: 'auto',
                                    background: '#3b82f6',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: '600',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                }}
                            >
                                새로 만들기
                            </Button>
                        </Flex>
                    </div>

                    {/* 검색 섹션 - '워크스페이스 검색' 탭일 때만 표시 */}
                    {activeTab === 'search' && (
                        <div style={{ maxWidth: "1400px", margin: "0 auto", marginBottom: "2rem" }}>
                            <Card style={{
                                background: "white",
                                padding: "1rem",
                                borderRadius: "12px",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                                border: "1px solid #e2e8f0"
                            }}>
                                <Input
                                    placeholder="🔍 워크스페이스 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    size="3"
                                    style={{ fontSize: "15px", border: "none", background: "transparent" }}
                                />
                            </Card>
                        </div>
                    )}

                    {/* 워크스페이스 목록 */}
                    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                        {workspaces.length === 0 ? (
                            <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
                                <Card style={{
                                    maxWidth: '500px',
                                    width: '100%',
                                    background: 'white',
                                    borderRadius: '20px',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid rgba(226, 232, 240, 0.8)',
                                    padding: '2.5rem'
                                }}>
                                    <Flex direction="column" align="center" gap="4">
                                        <div style={{
                                            width: "80px",
                                            height: "80px",
                                            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "40px",
                                        }}>
                                            💼
                                        </div>
                                        <Flex direction="column" align="center" gap="2">
                                            <Heading size="5" weight="bold" style={{ color: "#1e293b" }}>
                                                생성된 워크스페이스가 없습니다
                                            </Heading>
                                            <Text size="3" align="center" style={{ color: "#64748b" }}>
                                                첫 번째 워크스페이스를 생성하여 팀 협업을 시작하세요
                                            </Text>
                                        </Flex>
                                        <Button
                                            size="3"
                                            onClick={() => setShowCreateModal(true)}
                                            style={{
                                                background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                                                border: "none",
                                                color: "white",
                                                fontWeight: "600",
                                                marginTop: "1rem"
                                            }}
                                        >
                                            워크스페이스 생성하기
                                        </Button>
                                    </Flex>
                                </Card>
                            </Flex>
                        ) : (
                            <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="5">
                                {workspaces
                                    .filter(ws => {
                                        // '내 워크스페이스' 탭: 가입한 워크스페이스만
                                        if (activeTab === 'my') {
                                            return userWorkspaces.includes(ws.id)
                                        }
                                        // '워크스페이스 검색' 탭: 검색어로 필터링
                                        return ws.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    })
                                    .map((workspace) => {
                                        const isJoined = userWorkspaces.includes(workspace.id)
                                        const stats = workspaceStats[workspace.id] || { memberCount: 0, userRole: "멤버" }
                                        return (
                                    <Card
                                        key={workspace.id}
                                        style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.12)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                    >
                                        <Flex direction="column" gap="4" style={{ padding: '1.5rem' }}>
                                            {/* 상단: 아이콘 + Free 뱃지 */}
                                            <Flex justify="between" align="start">
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '12px',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '24px'
                                                }}>
                                                    📄
                                                </div>
                                                <Badge
                                                    variant="soft"
                                                    style={{
                                                        background: isJoined ? '#d1fae5' : '#f1f5f9',
                                                        color: isJoined ? '#059669' : '#64748b',
                                                        border: 'none',
                                                        fontSize: '12px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    {isJoined ? '가입됨' : '미가입'}
                                                </Badge>
                                            </Flex>

                                            {/* 제목 */}
                                            <Heading size="5" weight="bold" style={{ color: "#0f172a", marginTop: '0.5rem' }}>
                                                {workspace.name}
                                            </Heading>

                                            {/* 부제 (회사명) */}
                                            <Text size="2" style={{ color: "#94a3b8", marginTop: '-0.5rem' }}>
                                                {company.name}
                                            </Text>

                                            {/* 정보 섹션 */}
                                            <Flex direction="column" gap="2" style={{ marginTop: '0.5rem' }}>
                                                <Flex align="center" gap="2">
                                                    <span style={{ color: '#64748b', fontSize: '16px' }}>👤</span>
                                                    <Text size="2" style={{ color: "#64748b" }}>
                                                        {stats.memberCount}명의 멤버
                                                    </Text>
                                                </Flex>
                                                <Flex align="center" gap="2">
                                                    <span style={{ color: '#64748b', fontSize: '16px' }}>⏱️</span>
                                                    <Text size="2" style={{ color: "#64748b" }}>
                                                        {stats.userRole}
                                                    </Text>
                                                </Flex>
                                            </Flex>

                                            {/* 하단 액션 */}
                                            {isJoined ? (
                                                <Link
                                                    to={`/company/${companyId}/workspace/${workspace.id}`}
                                                    style={{
                                                        textDecoration: 'none',
                                                        color: '#3b82f6',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        marginTop: '0.5rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    워크스페이스 입장 →
                                                </Link>
                                            ) : (
                                                <Button
                                                    size="2"
                                                    onClick={() => joinWorkspace(workspace.id)}
                                                    disabled={joining}
                                                    style={{
                                                        width: '100%',
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontWeight: '600',
                                                        marginTop: '0.5rem'
                                                    }}
                                                >
                                                    {joining ? '가입 중...' : '가입하기'}
                                                </Button>
                                            )}
                                        </Flex>
                                    </Card>
                                    )
                                })}
                            </Grid>
                        )}
                    </div>
                </div>

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
        </>
    )
}

export default Workspace
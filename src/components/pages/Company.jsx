import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router"
import { Flex, Heading, Text, Grid } from '@radix-ui/themes'
import { supabase } from "../../lib/supabase"
import { useUser } from "../../hooks/useUser"
import { Button, Card, Avatar, Badge, Dialog, Input, Skeleton } from '../ui'
import { TopHeader } from '../layout'

const Company = () => {
    const { user, getId, isAuthenticated } = useUser()
    const navigate = useNavigate()
    const [company, setCompany] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [companyName, setCompanyName] = useState("")
    const [companyDescription, setCompanyDescription] = useState("")
    const [creating, setCreating] = useState(false)

    // 회사 검색 관련 상태
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [joining, setJoining] = useState(false)

    const fetchUserCompany = useCallback(async () => {
        const userId = getId()
        if (!userId) {
            console.warn('No user ID available for fetching company')
            setLoading(false)
            return
        }

        try {
            console.log('Fetching company for user ID:', userId)

            // First get user's enrolled company and role
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select('enrolled_company, user_role')
                .eq("auth_id", userId)
                .single()

            if (userError) {
                console.error("Error fetching user data:", userError.message, userError)
                setLoading(false)
                return
            }

            if (!userData?.enrolled_company) {
                console.log('User has no enrolled company')
                setCompany(null)
                setUserRole(null)
                setLoading(false)
                return
            }

            // Then get company details
            const { data: companyData, error: companyError } = await supabase
                .from("company")
                .select('id, name, description, logo_url, created_at')
                .eq("id", userData.enrolled_company)
                .single()

            if (companyError) {
                console.error("Error fetching company:", companyError.message, companyError)
                return
            }

            console.log('Company fetched successfully:', companyData)
            setCompany(companyData)
            setUserRole(userData.user_role)
        } catch (error) {
            console.error("Error:", error)
        } finally {
            setLoading(false)
        }
    }, [getId])

    useEffect(() => {
        const userId = getId()
        console.log('Company page - Current user state:', {
            userId,
            isAuthenticated,
            user: user ? { id: user.id, email: user.email } : null
        })

        if (userId && isAuthenticated) {
            console.log('User authenticated, fetching company for:', userId)
            fetchUserCompany()
        } else if (!isAuthenticated) {
            console.log('User not authenticated, skipping company fetch')
            setLoading(false)
        }
    }, [getId, isAuthenticated, fetchUserCompany, user])

    // 회사가 있으면 자동으로 워크스페이스 페이지로 리다이렉트
    useEffect(() => {
        if (!loading && company) {
            navigate(`/company/${company.id}/workspaces`)
        }
    }, [loading, company, navigate])

    const createCompany = async () => {
        if (!companyName.trim()) {
            alert("회사명을 입력해주세요.")
            return
        }

        const userId = getId()
        if (!userId) {
            alert("사용자 인증 정보를 찾을 수 없습니다.")
            return
        }

        setCreating(true)
        try {
            console.log('Creating company for user ID:', userId)

            // 1. Company 테이블에 새 회사 생성
            const { data: companyData, error: companyError } = await supabase
                .from("company")
                .insert({
                    name: companyName.trim(),
                    description: companyDescription.trim() || null,
                    owner_id: userId
                })
                .select()
                .single()

            if (companyError) {
                console.error("Error creating company:", companyError.message)
                alert("회사 생성 중 오류가 발생했습니다.")
                return
            }

            // 2. Users 테이블에 사용자의 회사 정보 업데이트 (owner 권한)
            const { error: userUpdateError } = await supabase
                .from("users")
                .update({
                    enrolled_company: companyData.id,
                    user_role: "owner"
                })
                .eq("auth_id", userId)

            if (userUpdateError) {
                console.error("Error updating user company info:", userUpdateError.message)
                alert("사용자 권한 설정 중 오류가 발생했습니다.")
                return
            }

            // 3. 성공 처리
            alert("회사가 성공적으로 생성되었습니다!")
            setCompanyName("")
            setCompanyDescription("")
            setShowCreateModal(false)

            // 4. 회사 정보 새로고침
            await fetchUserCompany()

        } catch (error) {
            console.error("Error:", error)
            alert("회사 생성 중 오류가 발생했습니다.")
        } finally {
            setCreating(false)
        }
    }

    const handleCloseModal = () => {
        setShowCreateModal(false)
        setCompanyName("")
        setCompanyDescription("")
    }

    // 회사 검색 함수
    const searchCompanies = async (term) => {
        if (!term.trim()) {
            setSearchResults([])
            return
        }

        setSearching(true)
        try {
            const { data, error } = await supabase
                .from("company")
                .select('id, name, description, logo_url, owner_id, created_at')
                .ilike('name', `%${term.trim()}%`)
                .limit(10)

            if (error) {
                console.error("Error searching companies:", error)
                alert("회사 검색 중 오류가 발생했습니다.")
                return
            }

            setSearchResults(data || [])
        } catch (error) {
            console.error("Error:", error)
            alert("회사 검색 중 오류가 발생했습니다.")
        } finally {
            setSearching(false)
        }
    }

    // 검색어 변경 핸들러 (디바운싱)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchCompanies(searchTerm)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm])

    // 회사 가입 함수
    const joinCompany = async (companyData) => {
        const userId = getId()
        if (!userId) {
            alert("사용자 인증 정보를 찾을 수 없습니다.")
            return
        }

        // 이미 회사에 소속되어 있는 경우 경고
        if (company) {
            if (!confirm(`현재 "${company.name}"에 소속되어 있습니다. "${companyData.name}"(으)로 변경하시겠습니까?`)) {
                return
            }
        }

        setJoining(true)
        try {
            // Users 테이블 업데이트
            const { error: updateError } = await supabase
                .from("users")
                .update({
                    enrolled_company: companyData.id,
                    user_role: "member"
                })
                .eq("auth_id", userId)

            if (updateError) {
                console.error("Error joining company:", updateError)
                alert("회사 가입 중 오류가 발생했습니다.")
                return
            }

            alert(`"${companyData.name}"에 성공적으로 가입했습니다!`)
            setSearchTerm("")
            setSearchResults([])

            // 회사 정보 새로고침
            await fetchUserCompany()
        } catch (error) {
            console.error("Error:", error)
            alert("회사 가입 중 오류가 발생했습니다.")
        } finally {
            setJoining(false)
        }
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

                {loading ? (
                    <Flex justify="center" align="center" direction="column" style={{ minHeight: "calc(100vh - 64px)" }}>
                        <Flex direction="column" align="center" gap="4">
                            <Skeleton style={{ width: "200px", height: "40px", borderRadius: "8px" }} />
                            <Skeleton style={{ width: "150px", height: "20px", borderRadius: "4px" }} />
                        </Flex>
                    </Flex>
                ) : !company ? (
                    <Flex justify="center" align="start" direction="column" style={{ minHeight: "calc(100vh - 64px)", paddingTop: "4rem" }}>
                        <Flex direction="column" align="center" gap="6" style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", padding: "0 2rem" }}>
                            {/* 헤더 */}
                            <Flex direction="column" align="center" gap="3">
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
                                    🔍
                                </div>
                                <Heading
                                    size="7"
                                    weight="bold"
                                    align="center"
                                    style={{
                                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                    }}
                                >
                                    회사 검색
                                </Heading>
                                <Text size="3" align="center" style={{ color: "#64748b" }}>
                                    가입하고 싶은 회사를 검색하세요
                                </Text>
                            </Flex>

                            {/* 검색 입력창 */}
                            <Card style={{ width: "100%", background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)" }}>
                                <Input
                                    placeholder="회사명을 입력하세요..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    size="3"
                                    style={{ fontSize: "16px" }}
                                />
                            </Card>

                            {/* 검색 결과 */}
                            {searching && (
                                <Flex justify="center" align="center" style={{ width: "100%", padding: "2rem 0" }}>
                                    <Text size="3" style={{ color: "#94a3b8" }}>검색 중...</Text>
                                </Flex>
                            )}

                            {!searching && searchTerm && searchResults.length === 0 && (
                                <Flex direction="column" align="center" gap="3" style={{ width: "100%", padding: "3rem 0" }}>
                                    <div style={{
                                        width: "64px",
                                        height: "64px",
                                        background: "#f1f5f9",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "32px"
                                    }}>
                                        📭
                                    </div>
                                    <Text size="3" style={{ color: "#94a3b8" }}>검색 결과가 없습니다</Text>
                                </Flex>
                            )}

                            {searchResults.length > 0 && (
                                <Flex direction="column" gap="3" style={{ width: "100%", maxHeight: "400px", overflowY: "auto" }}>
                                    {searchResults.map((result) => (
                                        <Card
                                            key={result.id}
                                            style={{
                                                background: "white",
                                                padding: "1.25rem",
                                                borderRadius: "12px",
                                                border: "1px solid #e2e8f0",
                                                transition: "all 0.2s ease",
                                                cursor: "pointer",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                                                e.currentTarget.style.borderColor = "#cbd5e1";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.boxShadow = "none";
                                                e.currentTarget.style.borderColor = "#e2e8f0";
                                            }}
                                        >
                                            <Flex align="center" justify="between">
                                                <Flex align="center" gap="3">
                                                    <Avatar
                                                        src={result.logo_url}
                                                        fallback={result.name.charAt(0)}
                                                        size="3"
                                                    />
                                                    <Flex direction="column" gap="1">
                                                        <Text size="3" weight="bold" style={{ color: "#1e293b" }}>
                                                            {result.name}
                                                        </Text>
                                                        {result.description && (
                                                            <Text size="2" style={{ color: "#64748b" }}>
                                                                {result.description.length > 60
                                                                    ? result.description.substring(0, 60) + '...'
                                                                    : result.description}
                                                            </Text>
                                                        )}
                                                        <Text size="1" style={{ color: "#94a3b8", marginTop: "4px" }}>
                                                            생성일: {new Date(result.created_at).toLocaleDateString('ko-KR')}
                                                        </Text>
                                                    </Flex>
                                                </Flex>
                                                <Button
                                                    size="2"
                                                    onClick={() => joinCompany(result)}
                                                    disabled={joining}
                                                    style={{
                                                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                                                        border: "none",
                                                        color: "white",
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    {joining ? "가입 중..." : "가입하기"}
                                                </Button>
                                            </Flex>
                                        </Card>
                                    ))}
                                </Flex>
                            )}

                            {!searchTerm && (
                                <Flex direction="column" align="center" gap="3" style={{ width: "100%", padding: "2rem 0" }}>
                                    <div style={{
                                        width: "64px",
                                        height: "64px",
                                        background: "#eff6ff",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "32px"
                                    }}>
                                        🏢
                                    </div>
                                    <Text size="3" style={{ color: "#94a3b8" }}>
                                        회사명을 입력하여 검색을 시작하세요
                                    </Text>
                                </Flex>
                            )}

                            {/* 회사 생성 버튼 - 하단에 부가 기능으로 */}
                            <Flex direction="column" align="center" gap="3" style={{ width: "100%", marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e2e8f0" }}>
                                <Text size="2" style={{ color: "#94a3b8" }}>
                                    찾는 회사가 없나요?
                                </Text>
                                <Button
                                    size="3"
                                    variant="outline"
                                    style={{
                                        background: "white",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "15px",
                                        padding: "10px 24px",
                                        color: "#475569",
                                        fontWeight: "600",
                                        borderRadius: "10px",
                                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                        transition: "all 0.3s ease",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => setShowCreateModal(true)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#e2e8f0";
                                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                                    }}
                                >
                                    ✨ 새 회사 생성하기
                                </Button>
                            </Flex>
                        </Flex>
                    </Flex>
                ) : (
                    // 회사가 있을 때는 자동으로 리다이렉트되므로 이 부분은 잠깐만 표시됨
                    <Flex justify="center" align="center" direction="column" style={{ minHeight: "calc(100vh - 64px)" }}>
                        <Flex direction="column" align="center" gap="4">
                            <Skeleton style={{ width: "200px", height: "40px", borderRadius: "8px" }} />
                            <Text size="2" style={{ color: "#94a3b8" }}>워크스페이스로 이동 중...</Text>
                        </Flex>
                    </Flex>
                )}

                {/* 회사 생성 다이얼로그 */}
                <Dialog
                    open={showCreateModal}
                    onOpenChange={setShowCreateModal}
                    title="새 회사 생성"
                    description="새로운 회사를 생성하고 팀원들과 함께 협업을 시작하세요."
                    confirmText={creating ? "생성 중..." : "회사 생성"}
                    cancelText="취소"
                    onConfirm={createCompany}
                    onCancel={handleCloseModal}
                    confirmDisabled={creating || !companyName.trim()}
                >
                    <Flex direction="column" gap="4">
                        <Input
                            label="회사명 *"
                            placeholder="회사명을 입력하세요"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />

                        <Input
                            label="회사 설명 (선택사항)"
                            placeholder="회사에 대한 간단한 설명을 입력하세요"
                            multiline
                            rows={3}
                            value={companyDescription}
                            onChange={(e) => setCompanyDescription(e.target.value)}
                        />
                    </Flex>
                </Dialog>
                </div>
            </div>
        </>
    )
}

export default Company
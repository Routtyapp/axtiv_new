import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router"
import { Flex, Heading, Text, Grid } from '@radix-ui/themes'
import { supabase } from "../../lib/supabase"
import { useUser } from "../../hooks/useUser"
import { Button, Card, Avatar, Badge, Dialog, Input, Skeleton } from '../ui'
import { Container, Header, Breadcrumb } from '../layout'

const Company = () => {
    const { user, getId, isAuthenticated } = useUser()
    const [company, setCompany] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [companyName, setCompanyName] = useState("")
    const [companyDescription, setCompanyDescription] = useState("")
    const [creating, setCreating] = useState(false)

    // 회사 검색 관련 상태
    const [showSearchModal, setShowSearchModal] = useState(false)
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
        if (!showSearchModal) return

        const timeoutId = setTimeout(() => {
            searchCompanies(searchTerm)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, showSearchModal])

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
            setShowSearchModal(false)
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

    // 검색 모달 열기
    const handleOpenSearchModal = () => {
        setShowSearchModal(true)
        setSearchTerm("")
        setSearchResults([])
    }

    // 검색 모달 닫기
    const handleCloseSearchModal = () => {
        setShowSearchModal(false)
        setSearchTerm("")
        setSearchResults([])
    }

    const breadcrumbItems = [
        { label: '홈', href: '/' },
        { label: '내 회사' }
    ]

    if (!isAuthenticated || !user) {
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

    return (
        <Container>
            <div className="p-6">
                <Breadcrumb items={breadcrumbItems} />

                <Header
                    title="내 회사"
                    subtitle="소속된 회사를 관리하고 워크스페이스에 접근하세요"
                    actions={
                        <Flex gap="2">
                            {!company && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleOpenSearchModal}
                                    >
                                        🔍 회사 검색/가입
                                    </Button>
                                    <Button
                                        variant="solid"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        회사 생성하기
                                    </Button>
                                </>
                            )}
                            <Link to="/">
                                <Button variant="soft" color="gray">
                                    홈으로
                                </Button>
                            </Link>
                        </Flex>
                    }
                />

                {loading ? (
                    <div className="space-y-4 p-6">
                        <div className="space-y-3">
                            <Skeleton className="h-8 w-48" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-32 w-full" />
                            </div>
                        </div>
                        <Text size="1" color="gray" className="text-center">회사 목록을 불러오는 중...</Text>
                    </div>
                ) : !company ? (
                    <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
                        <Card style={{ maxWidth: '500px', width: '100%' }}>
                            <Flex direction="column" align="center" gap="4" p="6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    🏢
                                </div>
                                <Flex direction="column" align="center" gap="2">
                                    <Heading size="5" weight="bold">소속된 회사가 없습니다</Heading>
                                    <Text size="3" color="gray" align="center">
                                        새 회사를 생성하거나 다른 회사에 초대받아 시작하세요
                                    </Text>
                                </Flex>
                                <Button
                                    size="3"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    첫 번째 회사 생성하기
                                </Button>
                            </Flex>
                        </Card>
                    </Flex>
                ) : (
                    <div className="mt-6">
                        <Card className="hover:shadow-lg transition-shadow max-w-2xl">
                            <Flex direction="column" gap="4" p="6">
                                <Flex align="center" gap="4">
                                    <Avatar
                                        src={company.logo_url}
                                        alt={company.name}
                                        fallback={company.name.charAt(0)}
                                        size="5"
                                    />
                                    <Flex direction="column" gap="2">
                                        <Heading size="6" weight="bold">
                                            {company.name}
                                        </Heading>
                                        <Badge
                                            variant="soft"
                                            color={userRole === 'owner' ? 'blue' : 'gray'}
                                            size="2"
                                        >
                                            {userRole === 'owner' ? '소유자' : '멤버'}
                                        </Badge>
                                    </Flex>
                                </Flex>

                                {company.description && (
                                    <Text size="3" color="gray">
                                        {company.description}
                                    </Text>
                                )}

                                <Flex justify="between" align="center" mt="4">
                                    <Text size="2" color="gray">
                                        생성일: {new Date(company.created_at).toLocaleDateString()}
                                    </Text>
                                    <Link to={`/company/${company.id}/workspaces`}>
                                        <Button variant="solid" size="3">
                                            워크스페이스 보기
                                        </Button>
                                    </Link>
                                </Flex>
                            </Flex>
                        </Card>
                    </div>
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

                {/* 회사 검색 다이얼로그 */}
                <Dialog
                    open={showSearchModal}
                    onOpenChange={handleCloseSearchModal}
                    title="회사 검색"
                    description="가입하고 싶은 회사를 검색하세요."
                    hideActions={true}
                >
                    <Flex direction="column" gap="4">
                        <Input
                            label="회사명으로 검색"
                            placeholder="회사명을 입력하세요..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />

                        {searching && (
                            <div className="text-center py-4">
                                <Text size="2" color="gray">검색 중...</Text>
                            </div>
                        )}

                        {!searching && searchTerm && searchResults.length === 0 && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    🔍
                                </div>
                                <Text size="2" color="gray">검색 결과가 없습니다.</Text>
                            </div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {searchResults.map((result) => (
                                    <Card key={result.id} className="hover:shadow-md transition-shadow">
                                        <Flex direction="column" gap="3" p="4">
                                            <Flex align="center" justify="between">
                                                <Flex align="center" gap="3">
                                                    <Avatar
                                                        src={result.logo_url}
                                                        fallback={result.name.charAt(0)}
                                                        size="3"
                                                    />
                                                    <Flex direction="column" gap="1">
                                                        <Text size="3" weight="bold">
                                                            {result.name}
                                                        </Text>
                                                        {result.description && (
                                                            <Text size="2" color="gray">
                                                                {result.description.length > 50
                                                                    ? result.description.substring(0, 50) + '...'
                                                                    : result.description}
                                                            </Text>
                                                        )}
                                                    </Flex>
                                                </Flex>
                                                <Button
                                                    size="2"
                                                    onClick={() => joinCompany(result)}
                                                    disabled={joining}
                                                >
                                                    {joining ? "가입 중..." : "가입하기"}
                                                </Button>
                                            </Flex>
                                            <Text size="1" color="gray">
                                                생성일: {new Date(result.created_at).toLocaleDateString()}
                                            </Text>
                                        </Flex>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {!searchTerm && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    🏢
                                </div>
                                <Text size="2" color="gray">
                                    회사명을 입력하여 검색을 시작하세요
                                </Text>
                            </div>
                        )}
                    </Flex>
                </Dialog>
            </div>
        </Container>
    )
}

export default Company
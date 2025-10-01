import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  MessageCircle,
  Calendar as CalendarIcon,
  Settings,
  BarChart3,
  User,
  Building2,
  Home,
  Plus,
  Users,
  Mail,
  Shield,
  Clock,
  TrendingUp,
  Menu,
  MoreHorizontal,
  Keyboard,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Tooltip,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Separator,
  TooltipTrigger,
  TooltipContent,
  Pointer,
  AnimatedThemeToggler,
} from "../ui";
import ChatSidebar from "../chat/ChatSidebar";
import MeetingManagement from "../meeting/MeetingManagement";
import { Calendar } from "../ui/calendar";
import CreateMeetingDialog from "../meeting/CreateMeetingDialog";
import ChatRoomList from "../chat/ChatRoomList";
import DirectMessageList from "../chat/DirectMessageList";
import CreateChatRoomDialog from "../chat/CreateChatRoomDialog";
import DashboardView from "../dashboard/DashboardView";

const WorkspaceDetail = () => {
  const { companyId, workspaceId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("team-chat"); // 'team-chat', 'personal-chat', 'dashboard', 'settings'
  const [showCreateMeetingDialog, setShowCreateMeetingDialog] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [showMeetingManagement, setShowMeetingManagement] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [selectedDirectMessage, setSelectedDirectMessage] = useState(null);
  const [showCreateChatRoomDialog, setShowCreateChatRoomDialog] =
    useState(false);
  const [showUserProfileDialog, setShowUserProfileDialog] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showKeyboardShortcutsDialog, setShowKeyboardShortcutsDialog] = useState(false);
  const dropdownRef = useRef(null);

  // 회의가 있는 날짜들을 계산
  const meetingDates = useMemo(() => {
    return meetings.reduce((acc, meeting) => {
      const meetingDate = new Date(meeting.start_time).toDateString();
      if (!acc[meetingDate]) {
        acc[meetingDate] = [];
      }
      acc[meetingDate].push(meeting);
      return acc;
    }, {});
  }, [meetings]);

  // 캘린더 modifiers 설정
  const calendarModifiers = useMemo(
    () => ({
      hasMeetings: Object.keys(meetingDates).map(
        (dateStr) => new Date(dateStr)
      ),
    }),
    [meetingDates]
  );

  const calendarModifiersStyles = {
    hasMeetings: {
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      border: "1px solid rgba(59, 130, 246, 0.3)",
      borderRadius: "4px",
      fontWeight: "600",
    },
  };

  // 캘린더 날짜 클릭 핸들러
  const handleCalendarDateSelect = (date) => {
    if (date) {
      setSelectedCalendarDate(date);
      setShowMeetingManagement(true);
    }
  };

  // 회의 생성 완료 후 회의 목록 새로고침
  const handleMeetingCreated = () => {
    setShowCreateMeetingDialog(false);
    fetchMeetings();
  };

  // 채팅방 선택 핸들러
  const handleChatRoomSelect = (roomId, roomName, isDefault = false) => {
    setSelectedChatRoom({ id: roomId, name: roomName, is_default: isDefault });
    setSelectedDirectMessage(null);
    setActiveMenu("team-chat");
    setShowMeetingManagement(false);
  };

  // 개인 메시지 선택 핸들러
  const handleDirectMessageSelect = (chatRoomId, displayName) => {
    // DirectMessageList에서 이미 채팅방을 생성/찾아서 chatRoomId를 전달함
    setSelectedChatRoom({
      id: chatRoomId,
      name: displayName,
      is_default: false,
    });
    setSelectedDirectMessage(null);
    setActiveMenu("team-chat"); // ChatSidebar 사용
    setShowMeetingManagement(false);
  };

  // 채팅방 생성 핸들러
  const handleCreateChatRoom = () => {
    setShowCreateChatRoomDialog(true);
  };

  // 채팅방 생성 완료 핸들러
  const handleChatRoomCreated = (newRoom) => {
    setShowCreateChatRoomDialog(false);
    // 새로 생성된 채팅방 선택
    setSelectedChatRoom({
      id: newRoom.id,
      name: newRoom.name,
      is_default: newRoom.is_default || false,
    });
    setActiveMenu("team-chat");
  };

  // 채팅방 나가기 핸들러
  const handleLeaveChatRoom = async (roomId) => {
    try {
      // 나간 채팅방이 현재 선택된 채팅방인지 확인
      if (selectedChatRoom?.id !== roomId) {
        // 다른 채팅방을 보고 있다면 아무것도 하지 않음
        return;
      }

      // 기본 채팅방 조회
      const { data: defaultRoom, error } = await supabase
        .from("chat_rooms")
        .select("id, name, is_default")
        .eq("workspace_id", workspaceId)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching default chat room:", error);
      }

      // 기본 채팅방이 있으면 해당 채팅방으로, 없으면 선택 해제
      if (defaultRoom) {
        setSelectedChatRoom({
          id: defaultRoom.id,
          name: defaultRoom.name,
          is_default: defaultRoom.is_default,
        });
      } else {
        setSelectedChatRoom(null);
      }

      setActiveMenu("team-chat");
    } catch (error) {
      console.error("Error in handleLeaveChatRoom:", error);
      setSelectedChatRoom(null);
    }
  };

  useEffect(() => {
    if (companyId && workspaceId && user && !authLoading) {
      fetchWorkspaceAndCompany();
      fetchMeetings();
      fetchCurrentUserProfile();
    }
  }, [companyId, workspaceId, user, authLoading]);

  const fetchCurrentUserProfile = async () => {
    if (!workspaceId || !user?.id) return;

    try {
      // workspace_members에서 워크스페이스 관련 정보만 조회
      const { data: memberData, error: memberError } = await supabase
        .from("workspace_members")
        .select("role, is_online, last_seen, joined_at")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching workspace member info:", memberError);
        return;
      }

      // users 테이블에서 사용자 정보 조회
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("auth_id, user_name, email, user_role, last_sign_in_at")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user info:", userError);
        return;
      }

      if (memberData && userData) {
        const userProfile = {
          auth_id: userData.auth_id,
          user_name: userData.user_name,
          email: userData.email,
          user_role: userData.user_role,
          last_sign_in_at: userData.last_sign_in_at,
          workspace_role: memberData.role,
          is_online: memberData.is_online,
          last_seen: memberData.last_seen,
          joined_at: memberData.joined_at,
        };
        setCurrentUserProfile(userProfile);
      }
    } catch (error) {
      console.error("Error fetching current user profile:", error);
    }
  };

  const handleUserProfileClick = () => {
    setShowUserProfileDialog(true);
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "알 수 없음";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "방금 전";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return date.toLocaleDateString("ko-KR");
  };

  // 워크스페이스 로드 후 기본 채팅방 설정
  useEffect(() => {
    const fetchDefaultChatRoom = async () => {
      if (!workspace || !workspaceId || selectedChatRoom) return;

      try {
        // 기본 채팅방 조회
        const { data: defaultRoom, error } = await supabase
          .from("chat_rooms")
          .select("id, name, is_default")
          .eq("workspace_id", workspaceId)
          .eq("is_default", true)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching default chat room:", error);
          return;
        }

        // 기본 채팅방이 있으면 선택
        if (defaultRoom) {
          setSelectedChatRoom({
            id: defaultRoom.id,
            name: defaultRoom.name,
            is_default: defaultRoom.is_default,
          });
        }
      } catch (error) {
        console.error("Error in fetchDefaultChatRoom:", error);
      }
    };

    fetchDefaultChatRoom();
  }, [workspace, workspaceId, selectedChatRoom]);

  const fetchWorkspaceAndCompany = async () => {
    try {
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspace")
        .select("*")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) {
        console.error("Error fetching workspace:", workspaceError.message);
        return;
      }

      setWorkspace(workspaceData);

      const { data: companyData, error: companyError } = await supabase
        .from("company")
        .select("*")
        .eq("id", companyId)
        .single();

      if (companyError) {
        console.error("Error fetching company:", companyError.message);
        return;
      }

      setCompany(companyData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select(
          `
                    *,
                    meeting_participants (
                        user_id,
                        role
                    )
                `
        )
        .eq("workspace_id", workspaceId)
        .order("start_time", { ascending: true });

      if (meetingError) {
        console.error("Error fetching meetings:", meetingError);
        return;
      }

      setMeetings(meetingData || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    }
  };

  const moreMenuItems = [
    {
      id: "keyboard-shortcuts",
      label: "단축키 안내",
      icon: Keyboard,
    },
    {
      id: "settings",
      label: "설정",
      icon: Settings,
    },
  ];

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 space-y-4 bg-white rounded-lg shadow-sm max-w-md w-full">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
          <p className="text-sm text-gray-500 text-center">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated() || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <div className="flex flex-col items-center gap-4 p-6">
            <p className="text-gray-700">로그인이 필요합니다.</p>
            <Link to="/login">
              <Button>로그인하기</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 space-y-4 bg-white rounded-lg shadow-sm max-w-md w-full">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
          <p className="text-sm text-gray-500 text-center">
            워크스페이스를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (!workspace || !company) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <div className="flex flex-col items-center gap-4 p-6">
            <p className="text-gray-700">워크스페이스를 찾을 수 없습니다.</p>
            <Link to="/companies">
              <Button>회사 목록으로 돌아가기</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const renderMainContent = () => {
    // 회의 관리 화면이 활성화된 경우
    if (showMeetingManagement) {
      return (
        <div className="h-full">
          <MeetingManagement
            workspaceId={workspaceId}
            onMeetingCreated={fetchMeetings}
          />
        </div>
      );
    }

    // 기본 메뉴 처리
    switch (activeMenu) {
      case "team-chat":
        return (
          <div className="h-full">
            <ChatSidebar
              workspaceId={workspaceId}
              workspaceName={workspace.name}
              chatRoomId={selectedChatRoom?.id}
              chatRoomName={selectedChatRoom?.name}
              chatRoomIsDefault={selectedChatRoom?.is_default}
              onLeaveChatRoom={handleLeaveChatRoom}
            />
          </div>
        );
      case "personal-chat":
        // 개인 채팅은 이제 team-chat과 동일하게 처리됨
        return null;
      case "dashboard":
        return (
          <DashboardView workspaceId={workspaceId} workspace={workspace} />
        );
      case "settings":
        return (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b flex-shrink-0">
              <h2 className="text-2xl font-bold">⚙️ 설정</h2>
              <p className="text-gray-600 mt-2">
                워크스페이스 설정을 관리합니다.
              </p>
            </div>
            <div className="flex-1 p-6 space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  워크스페이스 정보
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      이름
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {workspace.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      설명
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {workspace.description || "설명이 없습니다."}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      회사
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{company.name}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">권한 관리</h3>
                <p className="text-gray-600">권한 관리 기능은 준비 중입니다.</p>
              </Card>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div
        className="flex w-screen overflow-hidden"
        style={{ height: "100vh" }}
      >
        <Sidebar className="border-r flex-shrink-0">
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-3 min-h-[40px]">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">
                  {workspace.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {company.name}
                </p>
              </div>
              <Link to="/">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setActiveMenu('dashboard');
                      setShowMeetingManagement(false);
                    }}
                    className={`w-full justify-start ${
                      activeMenu === 'dashboard' && !showMeetingManagement
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <BarChart3 className="mr-3 h-4 w-4" />
                    대시보드
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="team-chat">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center">
                      <Users className="mr-3 h-4 w-4" />팀 채팅
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="px-2">
                      <ChatRoomList
                        workspaceId={workspaceId}
                        workspaceName={workspace?.name}
                        currentUserId={user?.auth_id}
                        onRoomSelect={handleChatRoomSelect}
                        selectedRoomId={selectedChatRoom?.id}
                        onCreateRoom={handleCreateChatRoom}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="personal-chat">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center">
                      <User className="mr-3 h-4 w-4" />
                      개인 채팅
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="px-2">
                      <DirectMessageList
                        workspaceId={workspaceId}
                        currentUserId={user?.auth_id}
                        currentUserEmail={user?.email}
                        onUserSelect={handleDirectMessageSelect}
                        selectedUserId={selectedDirectMessage?.id}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="meeting-management">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center">
                      <CalendarIcon className="mr-3 h-4 w-4" />
                      미팅 관리
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-4 px-2">
                      <div className="text-sm">
                        <Calendar
                          mode="single"
                          selected={selectedCalendarDate}
                          onSelect={handleCalendarDateSelect}
                          modifiers={calendarModifiers}
                          modifiersStyles={calendarModifiersStyles}
                          className="rounded-md border p-2"
                        />
                      </div>
                      <Button
                        onClick={() => setShowCreateMeetingDialog(true)}
                        className="w-full"
                        size="sm"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        회의 생성
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="more">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center">
                      <MoreHorizontal className="mr-3 h-4 w-4" />
                      더보기
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="px-2 space-y-1">
                      {moreMenuItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                            activeMenu === item.id && !showMeetingManagement && item.id !== "keyboard-shortcuts"
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent hover:text-accent-foreground"
                          }`}
                          onClick={() => {
                            if (item.id === "keyboard-shortcuts") {
                              setShowKeyboardShortcutsDialog(true);
                            } else {
                              setActiveMenu(item.id);
                              setShowMeetingManagement(false);
                            }
                          }}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-3 min-h-[40px]">
                <div className="relative flex-shrink-0">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white font-semibold">
                      {currentUserProfile?.user_name
                        ?.charAt(0)
                        .toUpperCase() ||
                        user?.email?.charAt(0).toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  {currentUserProfile?.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentUserProfile?.user_name || user?.email}
                  </p>
                </div>
                <AnimatedThemeToggler className="h-8 w-8 p-0 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-accent transition-colors [&>svg]:h-4 [&>svg]:w-4">
                  <Pointer />
                </AnimatedThemeToggler>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <Menu className="h-4 w-4" />
                  <Pointer />
                </Button>
              </div>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg overflow-hidden">
                  <div
                    className="px-4 py-2.5 hover:bg-accent cursor-pointer transition-colors flex items-center gap-2"
                    onClick={handleUserProfileClick}
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm">프로필 보기</span>
                    <Pointer />
                  </div>
                  <div className="border-t" />
                  <div
                    className="px-4 py-2.5 hover:bg-destructive/10 cursor-pointer transition-colors flex items-center gap-2 text-destructive"
                    onClick={handleLogout}
                  >
                    <span className="text-sm">🚪</span>
                    <span className="text-sm font-medium">로그아웃</span>
                    <Pointer />
                  </div>
                </div>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 min-w-0">
          <div className="flex h-full flex-col w-full">
            <header className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <SidebarTrigger className="h-6 w-6" />
                <Pointer />
              </div>
              <div className="h-4 border-l border-border" />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>{company.name}</span>
                <span>/</span>
                <span>{workspace.name}</span>
              </div>
            </header>
            <main className="flex-1 w-full overflow-y-auto">
              {renderMainContent()}
            </main>
          </div>
        </SidebarInset>
      </div>

      <CreateMeetingDialog
        open={showCreateMeetingDialog}
        onOpenChange={setShowCreateMeetingDialog}
        onMeetingCreated={handleMeetingCreated}
        workspaceId={workspaceId}
        currentUserId={user?.auth_id}
        defaultDate={selectedCalendarDate || new Date()}
      />

      <CreateChatRoomDialog
        open={showCreateChatRoomDialog}
        onOpenChange={setShowCreateChatRoomDialog}
        onRoomCreated={handleChatRoomCreated}
        workspaceId={workspaceId}
      />

      {/* 유저 프로필 Dialog */}
      <Dialog
        open={showUserProfileDialog}
        onOpenChange={setShowUserProfileDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>내 프로필</DialogTitle>
            <DialogDescription>
              워크스페이스 내 나의 프로필 정보입니다.
            </DialogDescription>
          </DialogHeader>

          {currentUserProfile && (
            <div className="space-y-6">
              {/* 프로필 헤더 */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white text-2xl font-bold">
                      {currentUserProfile.user_name?.charAt(0).toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  {currentUserProfile.is_online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {currentUserProfile.user_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {currentUserProfile.workspace_role === "admin" && (
                      <Badge variant="secondary" className="text-xs">
                        워크스페이스 관리자
                      </Badge>
                    )}
                    {currentUserProfile.user_role === "owner" && (
                      <Badge variant="default" className="text-xs">
                        회사 오너
                      </Badge>
                    )}
                    {currentUserProfile.user_role === "member" &&
                      currentUserProfile.workspace_role !== "admin" && (
                        <Badge variant="outline" className="text-xs">
                          멤버
                        </Badge>
                      )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* 상세 정보 */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">이메일</p>
                    <p className="text-sm font-medium break-all">
                      {currentUserProfile.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">워크스페이스 역할</p>
                    <p className="text-sm font-medium">
                      {currentUserProfile.workspace_role === "admin"
                        ? "관리자"
                        : "일반 멤버"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">상태</p>
                    <p className="text-sm font-medium">
                      {currentUserProfile.is_online ? (
                        <span className="text-green-600">🟢 온라인</span>
                      ) : (
                        <span className="text-gray-600">
                          ⚫ 오프라인 · 마지막 접속:{" "}
                          {formatLastSeen(currentUserProfile.last_seen)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {currentUserProfile.joined_at && (
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        워크스페이스 가입일
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(
                          currentUserProfile.joined_at
                        ).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {currentUserProfile.last_sign_in_at && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">마지막 로그인</p>
                      <p className="text-sm font-medium">
                        {new Date(
                          currentUserProfile.last_sign_in_at
                        ).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 단축키 안내 Dialog */}
      <Dialog
        open={showKeyboardShortcutsDialog}
        onOpenChange={setShowKeyboardShortcutsDialog}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              단축키 안내
            </DialogTitle>
            <DialogDescription>
              자주 사용하는 기능을 빠르게 실행할 수 있는 단축키 목록입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 사이드바 섹션 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                사이드바
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="text-sm">사이드바 토글</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                      Ctrl
                    </kbd>
                    <span className="text-xs">+</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                      B
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* 채팅 섹션 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                채팅
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="text-sm">메시지 전송</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                    Enter
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="text-sm">줄바꿈</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                      Shift
                    </kbd>
                    <span className="text-xs">+</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                      Enter
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="text-sm">채팅 최상단 이동</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                      Shift
                    </kbd>
                    <span className="text-xs">+</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                      Tab
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                  <span className="text-sm">채팅 최하단 이동</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                    Tab
                  </kbd>
                </div>
              </div>
            </div>

            {/* 참고 사항 */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Mac 사용자는 <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">Ctrl</kbd> 대신{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">Cmd</kbd>를 사용하세요.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default WorkspaceDetail;

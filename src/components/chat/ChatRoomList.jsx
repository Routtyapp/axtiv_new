import { useState, useEffect, useCallback, useRef } from "react";
import { Hash, Users, Clock, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button, Badge } from "../ui";
import useWorkspacePermissions from "../../hooks/useWorkspacePermissions";

const ChatRoomList = ({
  workspaceId,
  currentUserId,
  onRoomSelect,
  selectedRoomId,
  onCreateRoom,
}) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { canCreateRoom } = useWorkspacePermissions(workspaceId);

  // 채널 레퍼런스 관리
  const channelRef = useRef(null);
  const isVisibleRef = useRef(true);

  const fetchChatRooms = useCallback(async () => {
    if (!workspaceId || !currentUserId) return;

    try {
      // 한 번의 쿼리로 모든 정보 가져오기
      const roomIds = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .eq("is_direct_message", false);

      if (!roomIds.data || roomIds.data.length === 0) {
        setChatRooms([]);
        return;
      }

      const ids = roomIds.data.map(r => r.id);

      // 병렬로 데이터 가져오기 (각 타입당 1개 쿼리만)
      const [roomsRes, membersRes, readStatusRes] = await Promise.all([
        supabase
          .from("chat_rooms")
          .select("id, name, description, is_default, created_at, updated_at")
          .in("id", ids)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true }),

        supabase
          .from("chat_room_members")
          .select("chat_room_id, user_id")
          .in("chat_room_id", ids),

        supabase
          .from("chat_read_status")
          .select("chat_room_id, last_read_at")
          .in("chat_room_id", ids)
          .eq("user_id", currentUserId)
      ]);

      if (roomsRes.error) {
        console.error("Error fetching rooms:", roomsRes.error);
        return;
      }

      // 읽지 않은 메시지 수 계산 (백그라운드 작업)
      const unreadCounts = {};
      for (const room of roomsRes.data || []) {
        const readStatus = (readStatusRes.data || []).find(r => r.chat_room_id === room.id);

        if (readStatus?.last_read_at) {
          const { count } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_room_id", room.id)
            .gt("created_at", readStatus.last_read_at)
            .neq("sender_id", currentUserId);

          unreadCounts[room.id] = count || 0;
        } else {
          const { count } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_room_id", room.id)
            .neq("sender_id", currentUserId);

          unreadCounts[room.id] = count || 0;
        }
      }

      // 데이터 병합 (lastActivity는 realtime으로 업데이트)
      const roomsWithInfo = (roomsRes.data || []).map(room => {
        const members = (membersRes.data || []).filter(m => m.chat_room_id === room.id);

        return {
          ...room,
          memberCount: members.length,
          lastActivity: null, // Realtime으로 업데이트
          unreadCount: unreadCounts[room.id] || 0,
        };
      });

      setChatRooms(roomsWithInfo);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUserId]);

  // 🆕 채팅방 읽음 상태 업데이트 함수
  const updateReadStatus = useCallback(
    async (roomId) => {
      if (!roomId || !currentUserId) return;

      try {
        const { error } = await supabase.from("chat_read_status").upsert(
          {
            chat_room_id: roomId,
            user_id: currentUserId,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: "chat_room_id,user_id", // 중복 시 업데이트
          }
        );

        if (error) {
          console.error("Error updating read status:", error);
        }
      } catch (error) {
        console.error("Error updating read status:", error);
      }
    },
    [currentUserId]
  );

  // 🆕 채팅방 선택 핸들러 (read_status 업데이트 포함)
  const handleRoomSelect = useCallback(
    async (roomId, roomName, isDefault) => {
      // read_status 업데이트
      await updateReadStatus(roomId);

      // 부모 컴포넌트의 onRoomSelect 호출
      if (onRoomSelect) {
        onRoomSelect(roomId, roomName, isDefault);
      }
    },
    [onRoomSelect, updateReadStatus]
  );

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  // Optimistic update 함수들
  const incrementUnreadCount = useCallback((roomId) => {
    setChatRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, unreadCount: (room.unreadCount || 0) + 1, lastActivity: new Date() }
          : room
      )
    );
  }, []);

  const resetUnreadCount = useCallback((roomId) => {
    setChatRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, unreadCount: 0 }
          : room
      )
    );
  }, []);

  // 메시지 INSERT 핸들러 - optimistic update
  const handleMessageInsert = useCallback((payload) => {
    const { chat_room_id, sender_id } = payload.new;

    // 자신이 보낸 메시지가 아닌 경우에만 unread count 증가
    if (sender_id !== currentUserId) {
      incrementUnreadCount(chat_room_id);
    }
  }, [currentUserId, incrementUnreadCount]);

  // 읽음 상태 변경 핸들러 - optimistic update
  const handleReadStatusChange = useCallback((payload) => {
    const { chat_room_id, user_id } = payload.new;

    // 자신의 읽음 상태 변경인 경우에만 unread count 리셋
    if (user_id === currentUserId) {
      resetUnreadCount(chat_room_id);
    }
  }, [currentUserId, resetUnreadCount]);

  // 채널 정리 함수
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 ChatRoomList 채널 정리');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // 채널 구독 함수
  const setupChannel = useCallback(() => {
    if (!isVisibleRef.current) {
      console.log('💤 백그라운드 탭 - 구독 생략');
      return;
    }

    cleanupChannel();

    const channelName = `workspace:${workspaceId}:activity`;

    const channel = supabase
      .channel(channelName, {
        config: {
          presence: { key: currentUserId },
          private: true
        }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `workspace_id=eq.${workspaceId}`
        },
        handleMessageInsert
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_read_status",
          filter: `user_id=eq.${currentUserId}`,
        },
        handleReadStatusChange
      )
      .subscribe((status) => {
        console.log(`📡 ChatRoomList 채널 상태: ${status}`);
      });

    channelRef.current = channel;
  }, [workspaceId, currentUserId, handleMessageInsert, handleReadStatusChange, cleanupChannel]);

  // 실시간 구독 - workspace별 단일 채널
  useEffect(() => {
    if (!workspaceId || !currentUserId) return;

    // Page Visibility API
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ ChatRoomList 백그라운드 전환');
        isVisibleRef.current = false;
        cleanupChannel();
      } else {
        console.log('👁️ ChatRoomList 포그라운드 복귀');
        isVisibleRef.current = true;
        // 랜덤 딜레이로 reconnection storm 방지
        setTimeout(() => {
          if (isVisibleRef.current) {
            setupChannel();
          }
        }, 500 + Math.random() * 500);
      }
    };

    // 초기 구독
    setupChannel();

    // Visibility 이벤트 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanupChannel();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [workspaceId, currentUserId, setupChannel, cleanupChannel]);

  // 헬퍼 함수들
  const formatLastActivity = (date) => {
    if (!date) return "활동 없음";

    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return "방금 전";
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}분 전`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR");
    }
  };

  const handleCreateRoom = () => {
    if (onCreateRoom) {
      onCreateRoom();
    }
  };

  // 로딩 상태 렌더링
  if (loading) {
    return (
      <div className="space-y-2 px-2">
        <div className="text-xs text-gray-500">채팅방을 불러오는 중...</div>
      </div>
    );
  }

  // 메인 렌더링
  return (
    <div className="space-y-2">
      {/* 채팅방 목록 */}
      {chatRooms.map((room) => {
        const isSelected = selectedRoomId === room.id;

        return (
          <Button
            key={room.id}
            variant={isSelected ? "default" : "ghost"}
            onClick={() => handleRoomSelect(room.id, room.name, room.is_default)}
            className="w-full p-3 h-auto flex flex-col items-start transition-colors"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <span className="font-medium text-sm truncate max-w-32">
                  {room.name}
                </span>
                {room.is_default && (
                  <Badge variant="secondary" className="h-4 text-xs px-1">
                    기본
                  </Badge>
                )}
              </div>
              {room.unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 text-xs">
                  {room.unreadCount > 99 ? "99+" : room.unreadCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{room.memberCount}명</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatLastActivity(room.lastActivity)}</span>
              </div>
            </div>

            {room.description && (
              <div className="w-full text-xs text-muted-foreground mt-1 text-left truncate">
                {room.description}
              </div>
            )}
          </Button>
        );
      })}

      {/* 채팅방 추가 버튼 */}
      {canCreateRoom && (
        <Button
          variant="outline"
          onClick={handleCreateRoom}
          className="w-full p-3 h-auto flex items-center justify-center gap-2 border-dashed hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">채팅방 추가</span>
        </Button>
      )}

      {chatRooms.length === 0 && !loading && (
        <div className="text-xs text-gray-500 text-center py-4">
          {canCreateRoom
            ? "첫 번째 채팅방을 만들어보세요!"
            : "채팅방이 없습니다."}
        </div>
      )}
    </div>
  );
};

ChatRoomList.displayName = "ChatRoomList";

export default ChatRoomList;

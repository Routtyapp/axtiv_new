import { useState, useEffect, useCallback } from "react";
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

  const fetchChatRooms = useCallback(async () => {
    if (!workspaceId || !currentUserId) return;

    try {
      // 워크스페이스의 모든 팀 채팅방 가져오기 (개인 채팅방 제외)
      const { data: rooms, error: roomsError } = await supabase
        .from("chat_rooms")
        .select(
          `
          id,
          name,
          description,
          is_default,
          created_at,
          updated_at
        `
        )
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .eq("is_direct_message", false)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (roomsError) {
        console.error("Error fetching chat rooms:", roomsError);
        return;
      }

      // 각 채팅방의 추가 정보 가져오기
      const roomsWithInfo = await Promise.all(
        (rooms || []).map(async (room) => {
          // 멤버 수 가져오기
          const { data: members, error: membersError } = await supabase
            .from("chat_room_members")
            .select("user_id")
            .eq("chat_room_id", room.id);

          if (membersError) {
            console.error("Error fetching room members:", membersError);
          }

          // 최근 메시지 시간 가져오기
          const { data: lastMessage, error: messageError } = await supabase
            .from("chat_messages")
            .select("created_at")
            .eq("chat_room_id", room.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (messageError) {
            console.error("Error fetching last message:", messageError);
          }

          // 읽음 상태 조회
          const { data: readStatus, error: readError } = await supabase
            .from("chat_read_status")
            .select("last_read_at")
            .eq("chat_room_id", room.id)
            .eq("user_id", currentUserId)
            .maybeSingle();

          if (readError && readError.code !== "PGRST116") {
            console.error("Error fetching read status:", readError);
          }

          let unreadCount = 0;

          // readStatus가 있고 last_read_at이 있는 경우
          if (readStatus?.last_read_at) {
            const { count, error: unreadError } = await supabase
              .from("chat_messages")
              .select("id", { count: "exact" })
              .eq("chat_room_id", room.id)
              .gt("created_at", readStatus.last_read_at)
              .neq("sender_id", currentUserId);

            if (unreadError) {
              console.error("Error fetching unread messages:", unreadError);
            } else {
              unreadCount = count || 0;
            }
          } else {
            // readStatus가 없거나 last_read_at이 없는 경우
            // 모든 메시지를 읽지 않은 것으로 간주
            const { count, error: allMessagesError } = await supabase
              .from("chat_messages")
              .select("id", { count: "exact" })
              .eq("chat_room_id", room.id)
              .neq("sender_id", currentUserId);

            if (allMessagesError) {
              console.error("Error fetching all messages:", allMessagesError);
            } else {
              unreadCount = count || 0;
            }
          }

          return {
            ...room,
            memberCount: members?.length || 0,
            lastActivity:
              lastMessage && lastMessage.length > 0
                ? new Date(lastMessage[0].created_at)
                : null,
            unreadCount: unreadCount,
          };
        })
      );

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
    async (roomId, roomName) => {
      // read_status 업데이트
      await updateReadStatus(roomId);

      // 부모 컴포넌트의 onRoomSelect 호출
      if (onRoomSelect) {
        onRoomSelect(roomId, roomName);
      }
    },
    [onRoomSelect, updateReadStatus]
  );

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  // 실시간 구독
  useEffect(() => {
    if (!workspaceId) return;

    const messagesSubscription = supabase
      .channel("chat_messages_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        fetchChatRooms
      )
      .subscribe();

    const readStatusSubscription = supabase
      .channel("chat_read_status_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_read_status",
          filter: `user_id=eq.${currentUserId}`,
        },
        fetchChatRooms
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(readStatusSubscription);
    };
  }, [workspaceId, currentUserId, fetchChatRooms]);

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
            onClick={() => handleRoomSelect(room.id, room.name)}
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

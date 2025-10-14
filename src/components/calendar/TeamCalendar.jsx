import { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui';
import { Plus } from 'lucide-react';
import CreateMeetingDialog from '../meeting/CreateMeetingDialog';
import MeetingDetail from '../meeting/MeetingDetail';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'ko': ko };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const TeamCalendar = ({ workspaceId }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMeetingDialog, setShowCreateMeetingDialog] = useState(false);
  const [showMeetingDetailDialog, setShowMeetingDetailDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (workspaceId && user) {
      fetchEvents();
    }
  }, [workspaceId, user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // 미팅 조회 (참가자 정보 포함)
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants (
            user_id,
            role
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('start_time', { ascending: true });

      if (meetingsError) {
        console.error('Error fetching meetings:', meetingsError);
      }

      // 참가자 이메일 조회
      let meetingsWithEmails = meetingsData || [];
      if (meetingsData && meetingsData.length > 0) {
        const allUserIds = [...new Set(
          meetingsData.flatMap(meeting =>
            meeting.meeting_participants?.map(p => p.user_id) || []
          )
        )];

        if (allUserIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_id, email')
            .in('user_id', allUserIds);

          if (!userError && userData) {
            meetingsWithEmails = meetingsData.map(meeting => ({
              ...meeting,
              meeting_participants: meeting.meeting_participants?.map(participant => ({
                ...participant,
                User: userData.find(u => u.user_id === participant.user_id) || { email: participant.user_id }
              })) || []
            }));
          }
        }
      }

      // 태스크 조회 (마감일이 있는 것만)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:assignee_id (
            user_name
          )
        `)
        .eq('workspace_id', workspaceId)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      }

      // 미팅 이벤트 변환
      const meetingEvents = meetingsWithEmails.map(meeting => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        start: new Date(meeting.start_time),
        end: new Date(meeting.end_time),
        type: 'meeting',
        data: meeting,
        color: '#3b82f6' // 파란색
      }));

      // 태스크 이벤트 변환
      const taskEvents = (tasksData || []).map(task => {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        let color = '#22c55e'; // 녹색 (28일 이상)
        if (daysRemaining < 0 || daysRemaining <= 7) {
          color = '#ef4444'; // 빨간색 (7일 이하 또는 초과)
        } else if (daysRemaining <= 28) {
          color = '#eab308'; // 노란색 (8~28일)
        }

        return {
          id: `task-${task.id}`,
          title: `[태스크] ${task.title}`,
          start: dueDate,
          end: dueDate,
          type: 'task',
          data: task,
          color,
          allDay: true
        };
      });

      setEvents([...meetingEvents, ...taskEvents]);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 4px'
      }
    };
  };

  const handleSelectEvent = (event) => {
    if (event.type === 'meeting') {
      setSelectedMeeting(event.data);
      setShowMeetingDetailDialog(true);
    } else if (event.type === 'task') {
      const dueDate = new Date(event.data.due_date);
      const now = new Date();
      const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      let status = '';
      if (daysRemaining < 0) {
        status = `${Math.abs(daysRemaining)}일 지남`;
      } else if (daysRemaining === 0) {
        status = '오늘 마감';
      } else {
        status = `D-${daysRemaining}`;
      }

      alert(`태스크: ${event.data.title}\n상태: ${event.data.status === 'todo' ? '할 일' : event.data.status === 'in_progress' ? '진행 중' : '완료'}\n마감: ${format(event.start, 'PPP', { locale: ko })} (${status})\n담당자: ${event.data.assignee?.user_name || '미지정'}\n설명: ${event.data.description || '없음'}`);
    }
  };

  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    setShowCreateMeetingDialog(true);
  };

  const handleMeetingCreated = () => {
    setShowCreateMeetingDialog(false);
    fetchEvents();
  };

  const handleMeetingUpdated = () => {
    setShowMeetingDetailDialog(false);
    fetchEvents();
  };

  const handleMeetingDeleted = () => {
    setShowMeetingDetailDialog(false);
    fetchEvents();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500">캘린더를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">📅 팀 캘린더</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              미팅과 태스크 마감일을 한눈에 확인하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateMeetingDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              새 미팅
            </Button>
            <Button variant="outline" onClick={fetchEvents}>
              새로고침
            </Button>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>미팅</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <span>태스크 (28일 이상)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
            <span>태스크 (8~28일)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span>태스크 (7일 이하)</span>
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="flex-1 p-6 overflow-hidden">
        <Card className="h-full p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            culture="ko"
            messages={{
              today: '오늘',
              previous: '이전',
              next: '다음',
              month: '월',
              week: '주',
              day: '일',
              agenda: '일정',
              date: '날짜',
              time: '시간',
              event: '이벤트',
              noEventsInRange: '해당 기간에 이벤트가 없습니다.',
              showMore: (total) => `+${total} 더보기`
            }}
          />
        </Card>
      </div>

      {/* 미팅 생성 다이얼로그 */}
      <CreateMeetingDialog
        open={showCreateMeetingDialog}
        onOpenChange={setShowCreateMeetingDialog}
        onMeetingCreated={handleMeetingCreated}
        workspaceId={workspaceId}
        currentUserId={user?.id}
        defaultDate={selectedDate}
      />

      {/* 미팅 상세 다이얼로그 */}
      <Dialog open={showMeetingDetailDialog} onOpenChange={setShowMeetingDetailDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>미팅 상세 정보</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <MeetingDetail
              meeting={selectedMeeting}
              currentUserId={user?.id}
              onMeetingDeleted={handleMeetingDeleted}
              onMeetingUpdated={handleMeetingUpdated}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamCalendar;

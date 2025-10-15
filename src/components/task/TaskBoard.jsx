import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { Plus, Search } from 'lucide-react';
import TaskColumn from './TaskColumn';
import CreateTaskDialog from './CreateTaskDialog';
import TaskDetailDialog from './TaskDetailDialog';
import TaskCard from './TaskCard';

const TaskBoard = ({ workspaceId }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState({
    todo: [],
    in_progress: [],
    done: []
  });
  const [taskComments, setTaskComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (workspaceId && user) {
      fetchTasks();
      fetchTeamMembers();
    }
  }, [workspaceId, user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // 태스크 조회
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:assignee_id (
            user_id,
            user_name,
            profile_image_url
          ),
          creator:created_by (
            user_id,
            user_name
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }

      // 라벨 조회
      const { data: labelsData, error: labelsError } = await supabase
        .from('task_labels')
        .select('*')
        .in('task_id', tasksData.map(t => t.id));

      if (labelsError) {
        console.error('Error fetching labels:', labelsError);
      }

      // 댓글 수 조회
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('task_id')
        .in('task_id', tasksData.map(t => t.id));

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      }

      // 댓글 수 집계
      const commentCounts = {};
      if (commentsData) {
        commentsData.forEach(comment => {
          commentCounts[comment.task_id] = (commentCounts[comment.task_id] || 0) + 1;
        });
      }
      setTaskComments(commentCounts);

      // 라벨 매핑
      const taskLabels = {};
      if (labelsData) {
        labelsData.forEach(label => {
          if (!taskLabels[label.task_id]) {
            taskLabels[label.task_id] = [];
          }
          taskLabels[label.task_id].push(label);
        });
      }

      // 태스크에 라벨 추가
      const tasksWithLabels = tasksData.map(task => ({
        ...task,
        labels: taskLabels[task.id] || []
      }));

      // 상태별로 분류
      const grouped = {
        todo: tasksWithLabels.filter(t => t.status === 'todo'),
        in_progress: tasksWithLabels.filter(t => t.status === 'in_progress'),
        done: tasksWithLabels.filter(t => t.status === 'done')
      };

      setTasks(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          users:user_id (
            user_id,
            user_name
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Error fetching team members:', error);
        return;
      }

      setTeamMembers(
        data
          .map(member => member.users)
          .filter(user => user && user.user_id && user.user_id.trim() !== '')
      );
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;

    // 드래그 중인 태스크 찾기
    let task = null;
    for (const statusTasks of Object.values(tasks)) {
      const found = statusTasks.find(t => t.id === active.id);
      if (found) {
        task = found;
        break;
      }
    }

    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id;
    const newStatus = over.id;

    // 태스크 찾기
    let task = null;
    let oldStatus = null;
    for (const [status, statusTasks] of Object.entries(tasks)) {
      const found = statusTasks.find(t => t.id === taskId);
      if (found) {
        task = found;
        oldStatus = status;
        break;
      }
    }

    if (!task || oldStatus === newStatus) {
      setActiveTask(null);
      return;
    }

    // Optimistic update
    setTasks(prev => {
      const newTasks = { ...prev };

      // 안전성 체크: 배열이 존재하고 유효한지 확인
      if (!Array.isArray(newTasks[oldStatus])) {
        newTasks[oldStatus] = [];
      }
      if (!Array.isArray(newTasks[newStatus])) {
        newTasks[newStatus] = [];
      }

      newTasks[oldStatus] = newTasks[oldStatus].filter(t => t.id !== taskId);
      newTasks[newStatus] = [...newTasks[newStatus], { ...task, status: newStatus }];
      return newTasks;
    });

    // 데이터베이스 업데이트
    try {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // 완료 처리
      if (newStatus === 'done' && oldStatus !== 'done') {
        updates.completed_at = new Date().toISOString();
      } else if (newStatus !== 'done') {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        // 롤백
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // 롤백
      fetchTasks();
    } finally {
      setActiveTask(null);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  const handleTaskCreated = () => {
    fetchTasks();
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    setShowDetailDialog(false);
  };

  const handleTaskDeleted = () => {
    fetchTasks();
  };

  // 필터링된 태스크
  const getFilteredTasks = (statusTasks) => {
    return statusTasks.filter(task => {
      // 검색어 필터
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // 담당자 필터
      const matchesAssignee = filterAssignee === 'all' ||
        (filterAssignee === 'unassigned' && !task.assignee_id) ||
        task.assignee_id === filterAssignee;

      return matchesSearch && matchesAssignee;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500">태스크를 불러오는 중...</p>
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
            <h2 className="text-2xl font-bold">📋 태스크 보드</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              드래그 앤 드롭으로 태스크 상태를 변경하세요
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 태스크
          </Button>
        </div>

        {/* 필터 및 검색 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="태스크 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="담당자 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 담당자</SelectItem>
              <SelectItem value="unassigned">미지정</SelectItem>
              {teamMembers.map((member) =>
                member.user_id && member.user_id.trim() !== '' ? (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.user_name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 overflow-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-6 h-full">
            <TaskColumn
              status="todo"
              title="할 일"
              tasks={getFilteredTasks(tasks.todo)}
              onTaskClick={handleTaskClick}
              taskComments={taskComments}
            />
            <TaskColumn
              status="in_progress"
              title="진행 중"
              tasks={getFilteredTasks(tasks.in_progress)}
              onTaskClick={handleTaskClick}
              taskComments={taskComments}
            />
            <TaskColumn
              status="done"
              title="완료"
              tasks={getFilteredTasks(tasks.done)}
              onTaskClick={handleTaskClick}
              taskComments={taskComments}
            />
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-3 scale-105">
                <TaskCard
                  task={activeTask}
                  onClick={() => {}}
                  commentCount={taskComments[activeTask.id] || 0}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* 다이얼로그 */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        workspaceId={workspaceId}
        currentUserId={user?.id}
        onTaskCreated={handleTaskCreated}
      />

      {selectedTask && (
        <TaskDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          task={selectedTask}
          workspaceId={workspaceId}
          currentUserId={user?.id}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
};

export default TaskBoard;

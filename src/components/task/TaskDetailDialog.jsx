import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarFallback,
  Badge,
  Separator,
  ScrollArea
} from '../ui';
import { Calendar, User, Clock, Trash2 } from 'lucide-react';

const TaskDetailDialog = ({ open, onOpenChange, task, workspaceId, currentUserId, onTaskUpdated, onTaskDeleted }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('todo');
  const [teamMembers, setTeamMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssigneeId(task.assignee_id || 'unassigned');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setStatus(task.status);
      fetchTeamMembers();
      fetchComments();
    }
  }, [open, task]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          users:user_id (
            user_id,
            user_name,
            email,
            profile_image_url
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

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:user_id (
            user_name,
            profile_image_url
          )
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      alert('제목을 입력하세요');
      return;
    }

    try {
      setLoading(true);

      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        assignee_id: assigneeId && assigneeId !== 'unassigned' ? assigneeId : null,
        due_date: dueDate || null,
        status,
        updated_at: new Date().toISOString()
      };

      // 완료 처리 시 completed_at 업데이트
      if (status === 'done' && task.status !== 'done') {
        updates.completed_at = new Date().toISOString();
      } else if (status !== 'done') {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) {
        console.error('Error updating task:', error);
        alert('태스크 업데이트 중 오류가 발생했습니다.');
        return;
      }

      setEditing(false);
      onTaskUpdated();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('태스크 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 태스크를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) {
        console.error('Error deleting task:', error);
        alert('태스크 삭제 중 오류가 발생했습니다.');
        return;
      }

      onTaskDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('태스크 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: currentUserId,
          content: newComment.trim()
        });

      if (error) {
        console.error('Error adding comment:', error);
        alert('댓글 작성 중 오류가 발생했습니다.');
        return;
      }

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        alert('댓글 삭제 중 오류가 발생했습니다.');
        return;
      }

      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  if (!task) return null;

  const statusLabels = {
    todo: '할 일',
    in_progress: '진행 중',
    done: '완료'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>태스크 상세</DialogTitle>
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(false)}
                    disabled={loading}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={loading}
                  >
                    저장
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* 제목 */}
            <div>
              {editing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목"
                  className="text-lg font-semibold"
                  disabled={loading}
                />
              ) : (
                <h2 className="text-lg font-semibold">{task.title}</h2>
              )}
            </div>

            {/* 상태 및 메타데이터 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>상태</Label>
                {editing ? (
                  <Select value={status} onValueChange={setStatus} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">할 일</SelectItem>
                      <SelectItem value="in_progress">진행 중</SelectItem>
                      <SelectItem value="done">완료</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="mt-2">
                    {statusLabels[task.status]}
                  </Badge>
                )}
              </div>

              <div>
                <Label>담당자</Label>
                {editing ? (
                  <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="담당자 선택" />
                    </SelectTrigger>
                    <SelectContent>
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
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    {task.assignee ? (
                      <>
                        <Avatar className="w-6 h-6">
                          {task.assignee.profile_image_url ? (
                            <img
                              src={task.assignee.profile_image_url}
                              alt={task.assignee.user_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {task.assignee.user_name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm">{task.assignee.user_name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">미지정</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>마감일</Label>
                {editing ? (
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {task.due_date ? (
                      new Date(task.due_date).toLocaleDateString('ko-KR')
                    ) : (
                      <span className="text-gray-500">미지정</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>생성일</Label>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {new Date(task.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <Label>설명</Label>
              {editing ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명을 입력하세요"
                  className="min-h-[120px] resize-none"
                  disabled={loading}
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {task.description || '설명이 없습니다.'}
                </p>
              )}
            </div>

            <Separator />

            {/* 댓글 */}
            <div>
              <h3 className="font-semibold mb-4">댓글 ({comments.length})</h3>

              <div className="space-y-4 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {comment.user?.profile_image_url ? (
                        <img
                          src={comment.user.profile_image_url}
                          alt={comment.user.user_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {comment.user?.user_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {comment.user?.user_name || '알 수 없음'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString('ko-KR')}
                        </span>
                        {comment.user_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-500"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 댓글 입력 */}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleAddComment();
                    }
                  }}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  작성
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;

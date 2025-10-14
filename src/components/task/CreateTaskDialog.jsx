import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AvatarFallback
} from '../ui';

const CreateTaskDialog = ({ open, onOpenChange, workspaceId, currentUserId, onTaskCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && workspaceId) {
      fetchTeamMembers();
    }
  }, [open, workspaceId]);

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

      setTeamMembers(data.map(member => member.users).filter(Boolean));
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('제목을 입력하세요');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          title: title.trim(),
          description: description.trim() || null,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          created_by: currentUserId,
          status: 'todo'
        });

      if (error) {
        console.error('Error creating task:', error);
        alert('태스크 생성 중 오류가 발생했습니다.');
        return;
      }

      // 폼 초기화
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setDueDate('');

      onTaskCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('태스크 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setDueDate('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 태스크 생성</DialogTitle>
          <DialogDescription>
            새로운 태스크를 생성합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="태스크 제목을 입력하세요"
              disabled={loading}
            />
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="태스크 설명을 입력하세요"
              className="min-h-[100px] resize-none"
              disabled={loading}
            />
          </div>

          {/* 담당자 */}
          <div>
            <Label htmlFor="assignee">담당자</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="담당자를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">미지정</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        {member.profile_image_url ? (
                          <img
                            src={member.profile_image_url}
                            alt={member.user_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {member.user_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>{member.user_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 마감일 */}
          <div>
            <Label htmlFor="dueDate">마감일</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? '생성 중...' : '생성'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;

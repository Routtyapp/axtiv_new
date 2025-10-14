import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Badge, Avatar, AvatarFallback } from '../ui';
import { Calendar, MessageCircle } from 'lucide-react';

// 마감일 기반 색상 계산 함수
const getDueDateColor = (dueDate) => {
  if (!dueDate) return 'gray';

  const now = new Date();
  const due = new Date(dueDate);
  const daysRemaining = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return 'red'; // 기한 초과
  if (daysRemaining <= 7) return 'red'; // 1주 이하 - 빨간색
  if (daysRemaining <= 28) return 'yellow'; // 2주~28일 - 노란색
  return 'green'; // 1달 이상 - 녹색
};

// 남은 일수 텍스트
const getDaysRemainingText = (dueDate) => {
  if (!dueDate) return '';

  const now = new Date();
  const due = new Date(dueDate);
  const daysRemaining = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}일 지남`;
  if (daysRemaining === 0) return '오늘 마감';
  if (daysRemaining === 1) return '내일 마감';
  return `D-${daysRemaining}`;
};

const TaskCard = ({ task, onClick, commentCount = 0 }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDateColor = getDueDateColor(task.due_date);
  const daysText = getDaysRemainingText(task.due_date);

  // 색상별 스타일
  const colorStyles = {
    red: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20',
    yellow: 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    green: 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20',
    gray: 'border-l-4 border-l-gray-300 bg-white dark:bg-gray-900'
  };

  const badgeStyles = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 cursor-grab hover:shadow-md transition-shadow ${colorStyles[dueDateColor]}`}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* 제목 */}
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
          {task.title}
        </h4>

        {/* 설명 (있으면) */}
        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* 라벨 */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.label}
              </Badge>
            ))}
          </div>
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between text-xs">
          {/* 마감일 */}
          <div className="flex items-center gap-1">
            {task.due_date && (
              <Badge className={`text-xs ${badgeStyles[dueDateColor]}`}>
                <Calendar className="h-3 w-3 mr-1" />
                {daysText}
              </Badge>
            )}
            {commentCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                {commentCount}
              </Badge>
            )}
          </div>

          {/* 담당자 */}
          {task.assignee && (
            <Avatar className="w-6 h-6">
              {task.assignee.profile_image_url ? (
                <img
                  src={task.assignee.profile_image_url}
                  alt={task.assignee.user_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <AvatarFallback className="text-xs bg-gradient-to-br from-purple-400 to-blue-500 text-white">
                  {task.assignee.user_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;

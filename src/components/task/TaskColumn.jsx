import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '../ui';
import TaskCard from './TaskCard';

const TaskColumn = ({ status, title, tasks, onTaskClick, taskComments }) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  // 상태별 색상
  const statusColors = {
    todo: 'bg-gray-100 dark:bg-gray-800',
    in_progress: 'bg-blue-100 dark:bg-blue-900/20',
    done: 'bg-green-100 dark:bg-green-900/20'
  };

  const statusIcons = {
    todo: '📋',
    in_progress: '⚡',
    done: '✅'
  };

  return (
    <div className="flex flex-col h-full">
      {/* 컬럼 헤더 */}
      <div className={`p-4 rounded-t-lg ${statusColors[status]}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span>{statusIcons[status]}</span>
            {title}
          </h3>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* 태스크 목록 */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-b-lg min-h-[400px]"
      >
        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-600 text-sm">
              태스크가 없습니다
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                commentCount={taskComments[task.id] || 0}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default TaskColumn;

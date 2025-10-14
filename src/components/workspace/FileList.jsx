import { Card, Badge, Avatar, AvatarFallback, Button, Tooltip, TooltipTrigger, TooltipContent } from '../ui';
import { Download, Trash2, Pin, PinOff } from 'lucide-react';
import { getFileIcon, formatFileSize } from '../../utils/fileUtils';

const FileList = ({ files, currentUserId, onDelete, onTogglePin }) => {
  const handleDownload = async (file) => {
    try {
      // 파일 다운로드 링크 생성
      const link = document.createElement('a');
      link.href = file.storage_url;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = (file) => {
    if (window.confirm(`"${file.file_name}" 파일을 삭제하시겠습니까?`)) {
      onDelete(file.id, file.storage_path);
    }
  };

  // 권한 확인: 업로더 본인 또는 관리자
  const canManageFile = (file) => {
    return file.uploaded_by === currentUserId;
  };

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <Card key={file.id} className="p-4">
          <div className="flex items-center gap-4">
            {/* 파일 아이콘 */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-2xl">
                {getFileIcon(file.file_type)}
              </div>
            </div>

            {/* 파일 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.file_name}
                </h3>
                {file.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    고정됨
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Avatar className="w-4 h-4">
                    {file.uploader?.profile_image_url ? (
                      <img
                        src={file.uploader.profile_image_url}
                        alt={file.uploader.user_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-[8px]">
                        {file.uploader?.user_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{file.uploader?.user_name || '알 수 없음'}</span>
                </div>
                <span>•</span>
                <span>{new Date(file.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* 고정 버튼 */}
              {canManageFile(file) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onTogglePin(file.id, file.is_pinned)}
                    >
                      {file.is_pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {file.is_pinned ? '고정 해제' : '파일 고정'}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 다운로드 버튼 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>다운로드</TooltipContent>
              </Tooltip>

              {/* 삭제 버튼 */}
              {canManageFile(file) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>삭제</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default FileList;

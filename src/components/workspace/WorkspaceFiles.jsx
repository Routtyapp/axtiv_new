import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Card, Input, Skeleton } from '../ui';
import { Upload, Search, FolderOpen } from 'lucide-react';
import FileList from './FileList';
import FileUploadDialog from './FileUploadDialog';

const WorkspaceFiles = ({ workspaceId, workspace, currentUser }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('/');

  useEffect(() => {
    if (workspaceId && user) {
      fetchFiles();
    }
  }, [workspaceId, user, currentFolder]);

  const fetchFiles = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('workspace_files')
        .select(`
          *,
          uploader:uploaded_by (
            user_name,
            email,
            profile_image_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('folder', currentFolder)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching files:', error);
        return;
      }

      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = () => {
    setShowUploadDialog(false);
    fetchFiles();
  };

  const handleFileDeleted = async (fileId, storagePath) => {
    try {
      // Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from('workspace-files')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }

      // 데이터베이스에서 메타데이터 삭제
      const { error: dbError } = await supabase
        .from('workspace_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        alert('파일 삭제 중 오류가 발생했습니다.');
        return;
      }

      // 목록 새로고침
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleTogglePin = async (fileId, currentPinned) => {
    try {
      const { error } = await supabase
        .from('workspace_files')
        .update({ is_pinned: !currentPinned })
        .eq('id', fileId);

      if (error) {
        console.error('Error toggling pin:', error);
        return;
      }

      // 목록 새로고침
      fetchFiles();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // 검색 필터링
  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b flex-shrink-0">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            <h2 className="text-2xl font-bold">공유 폴더</h2>
          </div>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            파일 업로드
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {workspace?.name}의 공유 파일을 관리하세요
        </p>
      </div>

      {/* Search & Filters */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="파일 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredFiles.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '아직 업로드된 파일이 없습니다'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery ? '다른 검색어를 시도해보세요' : '첫 번째 파일을 업로드해보세요'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                파일 업로드
              </Button>
            )}
          </Card>
        ) : (
          <FileList
            files={filteredFiles}
            currentUserId={user?.id}
            onDelete={handleFileDeleted}
            onTogglePin={handleTogglePin}
          />
        )}
      </div>

      {/* Upload Dialog */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        workspaceId={workspaceId}
        currentFolder={currentFolder}
        currentUserId={user?.id}
        onFileUploaded={handleFileUploaded}
      />
    </div>
  );
};

export default WorkspaceFiles;

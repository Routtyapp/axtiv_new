import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button
} from '../ui';
import { Upload, X, FileIcon } from 'lucide-react';
import {
  validateFile,
  formatFileSize,
  getFileIcon,
  generateFilePath
} from '../../utils/fileUtils';

const FileUploadDialog = ({
  open,
  onOpenChange,
  workspaceId,
  currentFolder,
  currentUserId,
  onFileUploaded
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const newFiles = [];
    const newErrors = [];

    files.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          uploading: false,
          uploaded: false,
          progress: 0,
          error: null
        });
      } else {
        newErrors.push({
          file: file.name,
          error: validation.error
        });
      }
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setErrors((prev) => [...prev, ...newErrors]);
  };

  const removeFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setErrors([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    // 업로드 결과를 추적하는 배열
    const uploadResults = [];

    for (const fileItem of selectedFiles) {
      try {
        // 파일 업로드 시작
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, uploading: true, progress: 0 } : f
          )
        );

        const filePath = generateFilePath(workspaceId, fileItem.file.name);

        // Supabase Storage에 업로드
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspace-files')
          .upload(filePath, fileItem.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Public URL 가져오기
        const { data: urlData } = supabase.storage
          .from('workspace-files')
          .getPublicUrl(filePath);

        // workspace_files 테이블에 메타데이터 저장
        const { error: dbError } = await supabase
          .from('workspace_files')
          .insert({
            workspace_id: workspaceId,
            file_name: fileItem.file.name,
            file_type: fileItem.file.type,
            file_size: fileItem.file.size,
            storage_path: filePath,
            storage_url: urlData.publicUrl,
            uploaded_by: currentUserId,
            folder: currentFolder || '/'
          });

        if (dbError) {
          throw dbError;
        }

        // 업로드 완료
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, uploading: false, uploaded: true, progress: 100 }
              : f
          )
        );

        uploadResults.push({ id: fileItem.id, success: true });
      } catch (error) {
        console.error('Error uploading file:', error);

        // 에러 처리
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, uploading: false, error: error.message }
              : f
          )
        );

        uploadResults.push({ id: fileItem.id, success: false });
      }
    }

    setUploading(false);

    // 모든 파일이 처리되었으면 모달 닫기
    if (uploadResults.length === selectedFiles.length) {
      setTimeout(() => {
        clearFiles();
        onFileUploaded();
      }, 1000);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      clearFiles();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>파일 업로드</DialogTitle>
          <DialogDescription>
            드래그 앤 드롭 또는 클릭하여 파일을 선택하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 드래그 앤 드롭 영역 */}
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              파일을 여기에 드래그하거나 클릭하여 선택하세요
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              이미지, 문서, 비디오, 압축 파일 등 지원
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 선택된 파일 목록 */}
          {selectedFiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  선택된 파일 ({selectedFiles.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFiles}
                  disabled={uploading}
                >
                  모두 삭제
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      fileItem.error
                        ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                        : fileItem.uploaded
                        ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-2xl">{getFileIcon(fileItem.file.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                      {fileItem.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          오류: {fileItem.error}
                        </p>
                      )}
                      {fileItem.uploaded && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ 업로드 완료
                        </p>
                      )}
                      {fileItem.uploading && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          업로드 중...
                        </p>
                      )}
                    </div>
                    {!uploading && !fileItem.uploaded && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeFile(fileItem.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {errors.length > 0 && (
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-sm text-red-600 dark:text-red-400"
                >
                  <strong>{error.file}:</strong> {error.error}
                </div>
              ))}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? '업로드 중...' : `업로드 (${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;

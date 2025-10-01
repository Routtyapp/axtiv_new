import { useState, useRef } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { Button, Tooltip } from "../ui";
import OpenAI from "openai";
import { generateResponse } from "./chatbot";
import useFileUpload from "../../hooks/useFileUpload";
import FileUpload from "./FileUpload";
import AIModelSelector from "./AIModelSelector";

const MessageInput = ({ onSend, disabled, workspaceId, user }) => {
  const [message, setMessage] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-5");
  const textareaRef = useRef(null);

  // 파일 업로드 훅
  const fileUpload = useFileUpload(workspaceId, user);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasMessage = message.trim();
    const hasFiles = fileUpload.hasFiles;

    if ((hasMessage || hasFiles) && !disabled && !fileUpload.uploading) {
      try {
        // 파일과 함께 메시지 전송
        const messageContent = hasMessage ? message.trim() : null;

        // 임시 messageId 생성 (실제로는 서버에서 생성되지만 파일 업로드용)
        const tempMessageId = `temp_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const uploadedFiles = hasFiles
          ? await fileUpload.uploadFiles(tempMessageId)
          : [];

        if (isAiMode) {
          // AI 모드: 사용자 메시지를 먼저 보내고, AI 응답 생성
          await onSend(messageContent, "user", uploadedFiles);

          try {
            // provider 판단 (claude로 시작하면 claude, 아니면 openai)
            const provider = selectedModel.startsWith('claude-') ? 'claude' : 'openai';

            // AI 분석 가능한 파일들 가져오기 (provider에 맞는 형식으로)
            const aiFiles = fileUpload.getAIFiles(provider);

            // messages 형태로 구성
            let messages = [];

            // 텍스트 메시지 추가
            // 파일이 없는 경우 트리거
            if (messageContent || aiFiles.length === 0) {
              const textContent = messageContent || "안녕하세요!";
              messages.push({
                role: "user",
                content: textContent,
              });
            }

            // 파일이 있는 경우 multimodal 메시지로 구성
            if (aiFiles.length > 0) {
              const content = [];

              // 텍스트 부분 추가
              const textType = provider === 'claude' ? 'text' : 'input_text';
              if (messageContent) {
                content.push({
                  type: textType,
                  text: messageContent,
                });
              } else {
                content.push({
                  type: textType,
                  text: "첨부된 파일을 분석해주세요.",
                });
              }

              // 파일들 추가
              aiFiles.forEach((file) => {
                content.push(file.apiObject);
              });

              messages = [
                {
                  role: "user",
                  content: content,
                },
              ];
            }

            const aiResponse = await generateResponse(messages, selectedModel);
            if (aiResponse) {
              await onSend(aiResponse, "ai");
            }
          } catch (error) {
            console.error("AI 응답 생성 중 오류:", error);
            await onSend(
              "죄송합니다. AI 응답을 생성하는 중 오류가 발생했습니다.",
              "ai"
            );
          }
        } else {
          // 일반 모드: 사용자 메시지만 보내기
          await onSend(messageContent, "user", uploadedFiles);
        }

        // 전송 완료 후 초기화
        setMessage("");
        fileUpload.clearFiles();
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      } catch (error) {
        console.error("메시지 전송 중 오류:", error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="border-t border-gray-200 px-4 py-3">
      {/* 파일 업로드 영역 */}
      <FileUpload
        selectedFiles={fileUpload.selectedFiles}
        uploading={fileUpload.uploading}
        errors={fileUpload.errors}
        onRemoveFile={fileUpload.removeFile}
        onClearFiles={fileUpload.clearFiles}
        onDragOver={fileUpload.handleDragOver}
        onDragEnter={fileUpload.handleDragEnter}
        onDragLeave={fileUpload.handleDragLeave}
        onDrop={fileUpload.handleDrop}
        onDismissError={fileUpload.dismissError}
      />

      <form onSubmit={handleSubmit}>
        <Flex gap="2" align="start">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder={
                isAiMode
                  ? fileUpload.hasAIAnalyzableFiles()
                    ? "AI가 첨부된 파일을 분석하여 답변합니다..."
                    : "AI에게 질문하세요... (파일 첨부 가능)"
                  : "메시지를 입력하세요... (파일 첨부 가능)"
              }
              disabled={disabled || fileUpload.uploading}
              rows={1}
              className="w-full resize-none border border-gray-200 rounded-lg px-4 py-2.5 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed max-h-36 transition-all"
              style={{ minHeight: "44px", lineHeight: "1.5" }}
            />

            {/* 파일 업로드 버튼 - textarea 내부 우측 중앙 */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <input
                ref={fileUpload.fileInputRef || useRef(null)}
                type="file"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    fileUpload.handleFileSelect(files);
                  }
                  e.target.value = '';
                }}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt,.md,.zip,.rar,.mp4,.mov,.avi"
              />
              <Tooltip content="파일 업로드">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const input = document.querySelector('input[type="file"]');
                    input?.click();
                  }}
                  disabled={disabled || fileUpload.uploading}
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-md"
                >
                  📎
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* AI 모드 활성화 시 모델 선택 */}
          {isAiMode && (
            <AIModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={disabled || fileUpload.uploading}
            />
          )}

          <Tooltip content={isAiMode ? "AI 모드 비활성화" : "AI 모드 활성화"}>
            <Button
              type="button"
              variant={isAiMode ? "default" : "outline"}
              size="lg"
              onClick={() => setIsAiMode(!isAiMode)}
              disabled={disabled || fileUpload.uploading}
              aria-label={isAiMode ? "AI 모드 비활성화" : "AI 모드 활성화"}
              className={`h-11 shrink-0 ${isAiMode ? "bg-purple-500 hover:bg-purple-600" : ""}`}
            >
              🤖
            </Button>
          </Tooltip>

          <Button
            type="submit"
            disabled={
              disabled ||
              fileUpload.uploading ||
              (!message.trim() && !fileUpload.hasFiles)
            }
            variant="default"
            size="lg"
            className="h-11 shrink-0"
          >
            {fileUpload.uploading ? "업로드 중..." : "전송"}
          </Button>
        </Flex>
      </form>
      <Flex justify="start" align="center" mt="-1">
        <Text size="1" color="gray">
          {fileUpload.uploading
            ? `📎 파일 업로드 중... (${
                fileUpload.selectedFiles.filter((f) => f.uploaded).length
              }/${fileUpload.selectedFiles.length})`
            : isAiMode && fileUpload.hasAIAnalyzableFiles()
            ? `🤖 AI 모드: ${
                fileUpload.getAIFiles().length
              }개 파일 분석 준비완료`
            : ""}
        </Text>
      </Flex>
    </div>
  );
};

export default MessageInput;

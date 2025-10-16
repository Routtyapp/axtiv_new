-- 회의록 생성 기능을 위한 마이그레이션
-- 작성일: 2025-01-16

-- meeting_notes 테이블 생성
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,  -- AI가 생성한 회의록 (Markdown)
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,  -- 분석된 메시지 수
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,  -- 추가 정보 (참석자, 스타일 등)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_meeting_notes_workspace
  ON public.meeting_notes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_chat_room
  ON public.meeting_notes(chat_room_id);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_created_at
  ON public.meeting_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_created_by
  ON public.meeting_notes(created_by);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_meeting_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meeting_notes_updated_at
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meeting_notes_updated_at();

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 워크스페이스 멤버는 자신이 속한 워크스페이스의 회의록을 볼 수 있음
CREATE POLICY "Users can view meeting notes in their workspaces"
  ON public.meeting_notes
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS 정책: 워크스페이스 멤버는 회의록을 생성할 수 있음
CREATE POLICY "Users can create meeting notes in their workspaces"
  ON public.meeting_notes
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- RLS 정책: 회의록 작성자는 자신의 회의록을 수정할 수 있음
CREATE POLICY "Users can update their own meeting notes"
  ON public.meeting_notes
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS 정책: 회의록 작성자는 자신의 회의록을 삭제할 수 있음
CREATE POLICY "Users can delete their own meeting notes"
  ON public.meeting_notes
  FOR DELETE
  USING (created_by = auth.uid());

-- 코멘트 추가 (문서화)
COMMENT ON TABLE public.meeting_notes IS 'AI가 생성한 채팅 회의록 저장';
COMMENT ON COLUMN public.meeting_notes.content IS 'Markdown 형식의 회의록 내용';
COMMENT ON COLUMN public.meeting_notes.metadata IS 'JSON 형식의 추가 정보 (참석자 목록, 생성 옵션 등)';
COMMENT ON COLUMN public.meeting_notes.message_count IS '회의록 생성에 사용된 메시지 수';

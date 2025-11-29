-- Rich Text Editor를 위한 Supabase 설정

-- 1. posts 테이블 생성
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. posts 테이블에 트리거 적용
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 5. 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
TO public
USING (true);

-- 6. 인증된 사용자만 삽입 가능하도록 정책 설정 (선택사항)
-- 테스트를 위해 모든 사용자가 삽입 가능하도록 설정
CREATE POLICY "Anyone can insert posts"
ON posts FOR INSERT
TO public
WITH CHECK (true);

-- 7. 인증된 사용자만 수정 가능하도록 정책 설정 (선택사항)
CREATE POLICY "Anyone can update posts"
ON posts FOR UPDATE
TO public
USING (true);

-- 8. 인증된 사용자만 삭제 가능하도록 정책 설정 (선택사항)
CREATE POLICY "Anyone can delete posts"
ON posts FOR DELETE
TO public
USING (true);

-- 9. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

/*
Storage 버킷 생성은 Supabase 대시보드에서 수동으로 진행:

1. Supabase Dashboard 접속
2. Storage 메뉴 선택
3. "New bucket" 클릭
4. Bucket name: "editor-images"
5. Public bucket: ON (체크)
6. Create bucket 클릭

또는 아래 SQL로 생성 (Storage API 권한 필요):
*/

-- Storage 버킷 생성 (Supabase Dashboard에서 수동으로 생성 권장)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('editor-images', 'editor-images', true);

-- Storage 정책 설정 (모든 사용자가 업로드/읽기 가능)
-- CREATE POLICY "Anyone can upload images"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'editor-images');

-- CREATE POLICY "Anyone can read images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'editor-images');

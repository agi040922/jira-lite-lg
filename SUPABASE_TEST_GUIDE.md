# Supabase 기능 테스트 페이지 - 최종 설정 가이드

## 📋 개요

Next.js 15와 Supabase를 사용한 모든 핵심 기능의 테스트 페이지가 완성되었습니다.
이 문서는 테스트를 시작하기 전에 필요한 모든 설정을 단계별로 안내합니다.

---

## ✅ 구현된 기능 목록

1. **CRUD 테스트** - 기본 테이블 생성, 읽기, 수정, 삭제
2. **Storage 테스트** - 파일 업로드/다운로드, 한글 파일명 처리
3. **Auth 테스트** - 회원가입, 로그인, JWT 토큰, Google OAuth
4. **Realtime 테스트** - 실시간 데이터 동기화, Presence
5. **Rich Text Editor** - 이미지 업로드, 클립보드 붙여넣기, HTML 저장
6. **Soft Delete** - 논리적 삭제 및 복구
7. **팀 초대** - 이메일 발송, 토큰 기반 초대
8. **동영상 뷰어** - 동영상 업로드 및 재생

---

## 🚀 1단계: Supabase 프로젝트 설정

### 1.1 프로젝트 생성 (이미 있다면 생략)

1. https://app.supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호, 리전 설정
4. "Create new project" 클릭

### 1.2 환경 변수 설정

`.env.local` 파일에 Supabase 정보를 입력하세요:

```bash
# Supabase 설정 (대시보드에서 확인)
# https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 이메일 발송 (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Supabase 키 찾는 방법:**
- Dashboard → Settings → API
- `URL`: Project URL 복사
- `anon key`: anon/public 키 복사
- `service_role key`: service_role 키 복사 (절대 클라이언트에 노출 금지!)

---

## 🗄️ 2단계: 데이터베이스 테이블 생성

Supabase Dashboard → SQL Editor에서 아래 SQL을 **순서대로** 실행하세요.

### 2.1 CRUD 테스트용 테이블

```sql
-- test_items 테이블 생성
CREATE TABLE test_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE test_items;

-- RLS 활성화 및 정책
ALTER TABLE test_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 test_items를 읽을 수 있음"
  ON test_items FOR SELECT USING (true);

CREATE POLICY "모든 사용자가 test_items를 추가할 수 있음"
  ON test_items FOR INSERT WITH CHECK (true);

CREATE POLICY "모든 사용자가 test_items를 수정할 수 있음"
  ON test_items FOR UPDATE USING (true);

CREATE POLICY "모든 사용자가 test_items를 삭제할 수 있음"
  ON test_items FOR DELETE USING (true);
```

### 2.2 Realtime 메시지 테이블

```sql
-- realtime_messages 테이블 생성
CREATE TABLE realtime_messages (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE realtime_messages;

-- RLS 설정
ALTER TABLE realtime_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 메시지를 읽을 수 있음"
  ON realtime_messages FOR SELECT USING (true);

CREATE POLICY "모든 사용자가 메시지를 추가할 수 있음"
  ON realtime_messages FOR INSERT WITH CHECK (true);
```

### 2.3 Rich Text Editor용 posts 테이블

```sql
-- posts 테이블 생성
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 게시글을 읽을 수 있음"
  ON posts FOR SELECT USING (true);

CREATE POLICY "모든 사용자가 게시글을 추가할 수 있음"
  ON posts FOR INSERT WITH CHECK (true);

CREATE POLICY "모든 사용자가 게시글을 삭제할 수 있음"
  ON posts FOR DELETE USING (true);
```

### 2.4 Soft Delete용 documents 테이블

```sql
-- documents 테이블 생성
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (성능 향상)
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);

-- RLS 설정
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 문서를 읽을 수 있음"
  ON documents FOR SELECT USING (true);

CREATE POLICY "모든 사용자가 문서를 추가할 수 있음"
  ON documents FOR INSERT WITH CHECK (true);

CREATE POLICY "모든 사용자가 문서를 수정할 수 있음"
  ON documents FOR UPDATE USING (true);

CREATE POLICY "모든 사용자가 문서를 삭제할 수 있음"
  ON documents FOR DELETE USING (true);
```

### 2.5 팀 초대용 team_invitations 테이블

```sql
-- team_invitations 테이블 생성
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 설정
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 초대를 읽을 수 있음"
  ON team_invitations FOR SELECT USING (true);

CREATE POLICY "모든 사용자가 초대를 추가할 수 있음"
  ON team_invitations FOR INSERT WITH CHECK (true);

CREATE POLICY "모든 사용자가 초대를 수정할 수 있음"
  ON team_invitations FOR UPDATE USING (true);

CREATE POLICY "모든 사용자가 초대를 삭제할 수 있음"
  ON team_invitations FOR DELETE USING (true);
```

### 2.6 동영상 메타데이터 테이블

```sql
-- video_metadata 테이블 생성
CREATE TABLE video_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration NUMERIC,
  size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE video_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 사용자가 동영상 메타데이터를 읽을 수 있음"
  ON video_metadata FOR SELECT USING (true);

CREATE POLICY "모든 사용자가 동영상 메타데이터를 추가할 수 있음"
  ON video_metadata FOR INSERT WITH CHECK (true);

CREATE POLICY "모든 사용자가 동영상 메타데이터를 삭제할 수 있음"
  ON video_metadata FOR DELETE USING (true);
```

---

## 📦 3단계: Storage 버킷 생성

Supabase Dashboard → Storage에서 다음 버킷들을 생성하세요.

### 3.1 생성할 버킷 목록

각 버킷 생성 시 **"Public bucket"을 체크**하세요:

1. `editor-images` - Rich Text Editor 이미지용
2. `videos` - 동영상 파일용
3. (선택) `test-files` - Storage 테스트용

### 3.2 버킷 생성 방법

1. Storage → "New bucket" 클릭
2. Bucket name 입력 (예: `editor-images`)
3. **Public bucket: ON** 체크
4. "Create bucket" 클릭

### 3.3 Storage 정책 설정

각 버킷에 대해 다음 정책을 추가하세요:

```sql
-- editor-images 버킷 정책
CREATE POLICY "Anyone can upload images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'editor-images');

CREATE POLICY "Anyone can read images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'editor-images');

CREATE POLICY "Anyone can delete images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'editor-images');

-- videos 버킷 정책
CREATE POLICY "Anyone can upload videos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can read videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

CREATE POLICY "Anyone can delete videos"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'videos');
```

---

## 🔐 4단계: Google OAuth 설정 (선택)

Google 로그인 기능을 사용하려면 다음 설정이 필요합니다.

### 4.1 Google OAuth 콘솔 설정

1. https://console.cloud.google.com/apis/credentials 접속
2. 프로젝트 선택 또는 생성
3. "OAuth 2.0 클라이언트 ID" 생성
4. 애플리케이션 유형: 웹 애플리케이션
5. 승인된 리디렉션 URI에 Supabase 콜백 URL 추가:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

### 4.2 Supabase에 Google OAuth 설정

1. Supabase Dashboard → Authentication → Providers
2. Google 활성화
3. Client ID와 Client Secret 입력
4. Save

**제공된 Google OAuth 정보:**
- Client ID: `97892863767-g2ha0vrmr0qng4738udh0gq4hp001n4j.apps.googleusercontent.com`
- Client Secret: `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`

---

## 📧 5단계: 이메일 발송 설정 (Resend)

팀 초대 기능에서 이메일을 발송하려면 Resend API가 필요합니다.

### 5.1 Resend 계정 생성

1. https://resend.com 접속
2. 회원가입 (무료 플랜: 월 3,000통)
3. API Keys → "Create API Key" 클릭
4. 키 복사하여 `.env.local`에 추가

### 5.2 도메인 인증 (선택)

무료 플랜은 `onboarding@resend.dev`를 사용할 수 있지만,
실제 운영 시에는 본인 도메인을 인증하는 것을 추천합니다.

---

## 🧪 6단계: 테스트 시작

모든 설정이 완료되었으면 개발 서버를 실행하세요:

```bash
pnpm dev
```

### 6.1 메인 테스트 페이지 접속

```
http://localhost:3000/test
```

### 6.2 각 기능별 테스트 페이지

| 기능 | URL | 주요 테스트 항목 |
|------|-----|------------------|
| CRUD | `/test/crud` | 추가, 조회, 수정, 삭제 |
| Storage | `/test/storage` | 파일 업로드, 다운로드, 한글 파일명 |
| Auth | `/test/auth` | 회원가입, 로그인, JWT, Google OAuth |
| Realtime | `/test/realtime` | 실시간 메시지, Presence |
| Editor | `/test/editor` | 이미지 업로드, 클립보드 붙여넣기 |
| Soft Delete | `/test/soft-delete` | 삭제, 복구, 영구 삭제 |
| 팀 초대 | `/test/team-invite` | 이메일 발송, 초대 수락 |
| 동영상 | `/test/video` | 동영상 업로드, 재생 |

---

## 📝 체크리스트

설정을 완료하면 체크 표시해주세요:

### 필수 설정
- [ ] `.env.local` 파일에 Supabase URL, ANON_KEY 설정
- [ ] `test_items` 테이블 생성 및 Realtime 활성화
- [ ] `realtime_messages` 테이블 생성 및 Realtime 활성화
- [ ] `posts` 테이블 생성
- [ ] `documents` 테이블 생성
- [ ] `team_invitations` 테이블 생성
- [ ] `video_metadata` 테이블 생성
- [ ] `editor-images` 버킷 생성 (Public)
- [ ] `videos` 버킷 생성 (Public)
- [ ] Storage 정책 설정

### 선택 설정
- [ ] Google OAuth 설정 (인증 테스트용)
- [ ] Resend API 설정 (팀 초대 이메일 발송용)
- [ ] 실제 도메인 이메일 인증 (운영 배포용)

---

## ⚠️ 주의사항

### 보안
현재 모든 RLS 정책이 **테스트용**으로 열려있습니다.
실제 운영 환경에서는 반드시 인증된 사용자만 접근하도록 수정하세요:

```sql
-- 예시: 인증된 사용자만 추가 가능
CREATE POLICY "인증된 사용자만 추가 가능"
  ON test_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

### Storage 용량
- 무료 플랜: 1GB
- 대용량 파일 업로드 시 주의
- 필요시 오래된 파일 정리

### 이메일 발송 제한
- Resend 무료 플랜: 월 3,000통
- 테스트 시 불필요한 이메일 발송 주의

---

## 🐛 문제 해결

### "Failed to fetch" 에러
- `.env.local` 파일의 Supabase URL/Key 확인
- 개발 서버 재시작 (`pnpm dev`)

### Realtime이 작동하지 않음
- `ALTER PUBLICATION supabase_realtime ADD TABLE ...` 실행 확인
- Supabase Dashboard → Database → Replication에서 테이블 활성화 확인

### Storage 업로드 실패
- 버킷이 Public으로 설정되어 있는지 확인
- Storage 정책이 올바르게 설정되었는지 확인

### Google OAuth 로그인 실패
- Google Cloud Console에서 Redirect URI 확인
- Supabase에 Client ID/Secret 올바르게 입력했는지 확인

---

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js 15 문서](https://nextjs.org/docs)
- [Resend 문서](https://resend.com/docs)
- [React Quill 문서](https://github.com/zenoamaro/react-quill)

---

## 🎉 완료!

모든 설정이 완료되었습니다.
이제 `/test` 페이지에서 각 기능을 자유롭게 테스트해보세요!

궁금한 점이 있으면 각 페이지의 주석을 참고하거나,
개별 README 파일을 확인해주세요:

- `EDITOR_SETUP.md` - Rich Text Editor 상세 가이드
- `TEAM_INVITE_SETUP.md` - 팀 초대 상세 가이드
- `VIDEO_SETUP_README.md` - 동영상 기능 상세 가이드

행복한 코딩 되세요! 🚀

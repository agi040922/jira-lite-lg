# Test Environment Guide and Account Information

## 📌 Overview

**Jira Lite MVP** - Next.js 15 + Supabase 기반 경량 이슈 트래킹 시스템

---

## 🔐 Test Account Information (ID/PW)

### Google OAuth 로그인 (권장)

프로젝트는 **Google OAuth**를 통한 로그인을 지원합니다.

```
로그인 방법: Google 계정으로 로그인
테스트 URL: http://localhost:3000 또는 배포된 Vercel URL
```

**로그인 절차:**
1. 메인 페이지 또는 `/login` 접속
2. **"Google로 로그인"** 버튼 클릭
3. Google 계정으로 인증
4. 자동으로 대시보드로 리다이렉트

> 첫 로그인 시 자동으로 사용자 계정이 생성됩니다.

### 이메일/비밀번호 로그인 (테스트용)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@test.com | Test1234! |
| 일반 사용자 | user@test.com | Test1234! |
| 개발자 | dev@test.com | Test1234! |

---

## 🚀 구현된 주요 기능

### Git 커밋 이력 기반 기능 목록

| 날짜 | 커밋 | 기능 | 설명 |
|------|------|------|------|
| 2024-11-29 | `892e0fe` | **팀 초대 링크** | 이메일 없이 초대 링크 생성, 클립보드 복사 |
| 2024-11-29 | `892e0fe` | **빌드 수정** | 16개 TypeScript 에러 수정, 배포 준비 완료 |
| 2024-11-29 | `892e0fe` | **AI 기능** | IssueMorphPanel, AIStatsWithDB 추가 |
| 2024-11-28 | `0074c67` | **프로젝트 삭제** | 확인 모달과 함께 소프트 삭제 |
| 2024-11-28 | `8dd202a` | **방어적 프로그래밍** | 빈 상태 처리, UX 개선 |
| 2024-11-27 | `3af929d` | **OAuth 수정** | Google OAuth 리다이렉트 URL 수정 |

---

## 📱 주요 페이지 및 기능

### 1. 대시보드 (`/dashboard`)
- 팀 통계 및 최근 활동 요약
- 할당된 이슈 목록
- 프로젝트 현황 개요

### 2. 프로젝트 관리 (`/projects`)
- 프로젝트 목록 조회 (카드 형태)
- 새 프로젝트 생성 (`/projects/new`)
- 프로젝트 삭제 (소프트 삭제 + 확인 모달)
- 즐겨찾기 기능

### 3. 칸반 보드 (`/issues`)
- **드래그 앤 드롭**으로 이슈 상태 변경
- 이슈 생성/수정/삭제
- 상태별 컬럼: Backlog → In Progress → Done
- 이슈 상세 페이지 (`/issues/[id]`)

### 4. 팀 관리 (`/team/manage`)
- 팀 멤버 목록 (역할별 표시)
- **멤버 초대하기**:
  - "직접 초대" - 이미 가입한 사용자 바로 추가
  - "링크 복사" - 초대 링크 생성 후 클립보드에 복사
- 멤버 삭제 (OWNER 제외)
- 역할 관리: OWNER, ADMIN, MEMBER

### 5. 팀 가입 (`/team/join?token=xxx`)
- 초대 링크 클릭 시 자동 팀 가입
- 유효성 검증 (만료, 이메일, 중복 확인)
- 7일 후 링크 자동 만료

### 6. 휴지통 (`/trash`)
- 삭제된 프로젝트 목록
- 복구 또는 영구 삭제

### 7. 설정 (`/settings`)
- 사용자 프로필 설정
- 알림 설정

---

## 🧪 테스트 페이지

| URL | 기능 | 설명 |
|-----|------|------|
| `/test/crud` | CRUD 테스트 | 데이터 생성/조회/수정/삭제 |
| `/test/auth` | 인증 테스트 | 회원가입, 로그인, OAuth |
| `/test/storage` | 스토리지 | 파일 업로드/다운로드 |
| `/test/realtime` | 실시간 | 실시간 동기화, Presence |
| `/test/editor` | 에디터 | Rich Text Editor |
| `/test/soft-delete` | 삭제/복구 | 소프트 삭제, 복구 |
| `/test/team-invite` | 팀 초대 | 초대 링크 생성/수락 |

---

## ✅ 테스트 시나리오

### 시나리오 1: Google 로그인
1. 메인 페이지 접속
2. "Google로 로그인" 버튼 클릭
3. Google 계정 선택
4. 대시보드 자동 이동 확인

### 시나리오 2: 팀 초대
1. `/team/manage` 접속
2. "멤버 초대하기" 버튼 클릭
3. 이메일 입력: `newuser@test.com`
4. 역할 선택: MEMBER
5. "링크 복사" 버튼 클릭
6. 토스트 알림: "초대 링크가 복사되었습니다!"
7. 복사된 링크 공유 (카카오톡, 슬랙 등)

### 시나리오 3: 이슈 관리
1. `/projects`에서 프로젝트 선택
2. 칸반 보드에서 "+" 버튼으로 이슈 생성
3. 이슈 제목, 설명, 담당자 입력
4. 드래그 앤 드롭으로 상태 변경 (Backlog → In Progress)
5. 이슈 클릭하여 상세 페이지 확인

### 시나리오 4: 프로젝트 삭제
1. `/projects` 접속
2. 프로젝트 카드의 휴지통 아이콘 클릭
3. 확인 모달에서 "삭제" 버튼 클릭
4. `/trash`에서 삭제된 프로젝트 확인
5. (선택) 복구 또는 영구 삭제

---

## 🔧 로컬 환경 설정

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 환경 변수 (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. 개발 서버
```bash
pnpm dev
# http://localhost:3000
```

### 4. 프로덕션 빌드
```bash
pnpm build
pnpm start
```

---

## 🗄️ 데이터베이스 설정

### 마이그레이션 실행 순서

Supabase SQL Editor에서 순서대로 실행:

```
1. supabase/migrations/step1_basic_tables.sql
2. supabase/migrations/step2_team_and_project_tables.sql
3. supabase/migrations/step3_issue_tables.sql
4. supabase/migrations/step4_ai_and_notification_tables.sql
5. supabase/migrations/step5_functions_triggers.sql
6. supabase/migrations/step6_seed_data.sql (선택)
```

### 개발용 RLS 비활성화

```sql
-- supabase/FIX_disable_all_rls.sql 실행
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;
-- ... (모든 테이블)
```

### 팀 초대 테이블 설정

```sql
-- supabase/FIX_team_invitations_add_role.sql 실행
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'MEMBER';

ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255);
```

---

## 🔍 트러블슈팅

### Google OAuth 로그인 안 됨
1. Supabase Dashboard → Authentication → Providers → Google
2. Authorized redirect URIs 확인:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback`

### 팀 초대 오류
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'MEMBER';
```

### 빌드 에러
```bash
rm -rf .next
pnpm build
```

---

## 📊 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Charts | Recharts |
| Editor | React Quill |
| Deployment | Vercel |

---

## 📅 최근 업데이트 이력

| 날짜 | 내용 |
|------|------|
| 2024-11-29 | 팀 초대 링크 기능, 프로덕션 빌드 수정 (16개 에러) |
| 2024-11-28 | 프로젝트 소프트 삭제, 확인 모달 |
| 2024-11-27 | Google OAuth 수정, 방어적 프로그래밍 |

---

*Jira Lite MVP - Test Environment Guide v1.0*

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Jira Lite MVP** - Next.js 15 + Supabase 기반의 경량화된 이슈 트래킹 시스템입니다.
팀 협업, 프로젝트 관리, 이슈 트래킹, 칸반 보드를 제공하며, AI 기능과 실시간 동기화를 지원합니다.

## 주요 기술 스택

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: Tailwind CSS 4, class-variance-authority, clsx
- **Editor**: React Quill (Rich Text Editor)
- **Email**: Resend API
- **AI**: Anthropic SDK
- **UI Components**: Radix UI, Lucide React, Recharts

## 개발 환경 설정

### 필수 환경 변수

`.env.local` 파일에 다음 환경 변수를 설정해야 합니다:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 이메일 발송 (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 개발 서버 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev

# 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start

# 린트 실행
pnpm lint
```

## 데이터베이스 아키텍처

### Supabase 마이그레이션 실행 순서

**중요**: 데이터베이스 마이그레이션은 반드시 순서대로 실행해야 합니다.

1. `supabase/migrations/step1_basic_tables.sql` - 기본 테이블 (users, teams, team_members)
2. `supabase/migrations/step2_team_and_project_tables.sql` - 팀/프로젝트 관련 테이블
3. `supabase/migrations/step3_issue_tables.sql` - 이슈 관련 테이블
4. `supabase/migrations/step4_ai_and_notification_tables.sql` - AI/알림 테이블
5. `supabase/migrations/step5_functions_triggers.sql` - 함수 및 트리거 (22개)
6. `supabase/migrations/step6_seed_data.sql` - 테스트 데이터 (선택사항)

상세한 실행 가이드는 `supabase/migrations/EXECUTION_GUIDE.md` 참고.

### 핵심 테이블 구조

- **users**: 사용자 정보 (auth.users 확장)
- **teams**: 팀 정보
- **team_members**: 팀 멤버십
- **projects**: 프로젝트 정보
- **project_statuses**: 프로젝트 상태 (칸반 컬럼)
- **issues**: 이슈 정보 (이슈 키 자동 생성)
- **subtasks**: 서브태스크
- **comments**: 이슈 댓글
- **issue_history**: 이슈 변경 이력
- **labels**: 이슈 라벨
- **notifications**: 사용자 알림
- **ai_cache**: AI 응답 캐시 (24시간 만료)
- **ai_rate_limits**: AI 사용량 제한

### 데이터 제한사항

- 팀당 최대 15개 프로젝트
- 프로젝트당 최대 200개 이슈
- 이슈당 최대 10개 서브태스크
- 프로젝트당 최대 20개 라벨
- 이슈당 최대 5개 라벨
- 프로젝트당 최대 5개 커스텀 상태

## 코드 아키텍처

### 디렉토리 구조

```
src/
├── app/                      # Next.js App Router 페이지
│   ├── api/                  # API Routes
│   ├── dashboard/            # 대시보드 페이지
│   ├── inbox/                # 인박스 페이지
│   ├── issues/               # 이슈 목록 및 상세
│   ├── projects/             # 프로젝트 관리
│   ├── reviews/              # 코드 리뷰
│   ├── settings/             # 설정
│   ├── team/                 # 팀 관리
│   ├── test/                 # Supabase 기능 테스트 페이지
│   └── views/                # 커스텀 뷰
├── components/               # React 컴포넌트
│   ├── ui/                   # 재사용 가능한 UI 컴포넌트 (shadcn/ui)
│   ├── *WithDB.tsx           # Supabase 연동 컴포넌트
│   └── *.tsx                 # 기타 컴포넌트
├── lib/                      # 라이브러리 및 유틸리티
│   ├── supabase/
│   │   ├── client.ts         # 클라이언트 Supabase 인스턴스
│   │   └── server.ts         # 서버 Supabase 인스턴스
│   └── utils.ts              # 유틸리티 함수 (cn 등)
└── types/                    # TypeScript 타입 정의
    ├── database.ts           # 데이터베이스 타입
    ├── database.types.ts     # Supabase 생성 타입
    ├── editor.ts             # 에디터 타입
    └── team-invite.ts        # 팀 초대 타입
```

### Supabase 클라이언트 사용법

#### 클라이언트 컴포넌트 (`'use client'`)
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
```

#### 서버 컴포넌트 또는 API Routes
```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
```

### 네이밍 컨벤션

- **WithDB suffix**: Supabase와 직접 연동하는 컴포넌트 (예: `ProjectKanbanWithDB.tsx`)
- **일반 컴포넌트**: Mock 데이터 또는 props로 데이터를 받는 컴포넌트

### 주요 자동화 트리거

1. **generate_issue_key()**: 이슈 생성 시 프로젝트별로 고유한 이슈 키 자동 생성 (예: LIG-1, LIG-2)
2. **create_default_project_statuses()**: 프로젝트 생성 시 기본 상태 3개 자동 생성 (Backlog, In Progress, Done)
3. **record_issue_history()**: 이슈 변경 시 히스토리 자동 기록
4. **add_owner_to_team()**: 팀 생성 시 owner를 자동으로 팀 멤버에 추가
5. **handle_new_user()**: Supabase Auth 유저 생성 시 users 테이블 자동 생성
6. **notify_on_assignee_change()**: 담당자 변경 시 알림 생성
7. **notify_on_comment()**: 댓글 작성 시 관련 사용자에게 알림

## 테스트 페이지

`/test` 경로에 Supabase 기능 테스트 페이지가 있습니다:

- `/test/crud` - CRUD 기본 테스트
- `/test/storage` - 파일 업로드/다운로드
- `/test/auth` - 인증 (회원가입, 로그인, Google OAuth)
- `/test/realtime` - 실시간 데이터 동기화, Presence
- `/test/editor` - Rich Text Editor (이미지 업로드, 클립보드)
- `/test/soft-delete` - Soft Delete (논리적 삭제 및 복구)
- `/test/team-invite` - 팀 초대 (이메일 발송, 토큰 기반)

테스트 페이지 설정: `docs/SUPABASE_TEST_GUIDE.md` 참고

## 중요한 패턴 및 규칙

### RLS (Row Level Security)

- 모든 테이블에 RLS 활성화
- 테스트 페이지는 `true` 정책 사용 (프로덕션에서는 반드시 수정 필요)
- 실제 운영 시에는 `auth.uid()` 기반 정책으로 변경

### Realtime 기능

Realtime을 사용하려면 반드시 테이블을 publication에 추가해야 합니다:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

### Storage 사용

- `editor-images` 버킷: Rich Text Editor 이미지 저장
- `videos` 버킷: 동영상 파일 저장
- 모든 버킷은 Public으로 설정
- 한글 파일명은 자동으로 URL-safe하게 인코딩됨

### 이메일 발송 (Resend)

- API Route: `/api/send-invite`
- 무료 플랜 제한: 월 3,000통
- 테스트 시 `onboarding@resend.dev` 사용 가능

## 주의사항

1. **Service Role Key**: 절대 클라이언트에 노출하지 말 것 (서버에서만 사용)
2. **Migration 순서**: 반드시 step1 → step2 → ... 순서대로 실행
3. **team_invitations 테이블**: Step 2에서 DROP CASCADE 후 재생성됨
4. **deleted_at 컬럼**: Soft Delete 구현 (NULL이면 활성, NOT NULL이면 삭제됨)
5. **Google OAuth Redirect URL**: `/auth/callback` 경로 사용

## 참고 문서

- **마이그레이션 가이드**: `supabase/migrations/EXECUTION_GUIDE.md`
- **테스트 설정 가이드**: `docs/SUPABASE_TEST_GUIDE.md`
- **팀 초대 설정**: `docs/TEAM_INVITE_SETUP.md`
- **에디터 설정**: `docs/EDITOR_SETUP.md`
- **에디터 SQL 설정**: `docs/supabase-editor-setup.sql`

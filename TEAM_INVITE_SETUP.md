# 팀 초대 시스템 설정 가이드

이 가이드는 Next.js 15와 Supabase를 사용한 팀 초대 시스템을 설정하는 방법을 설명합니다.

## 📋 목차

1. [Supabase 설정](#1-supabase-설정)
2. [Resend 설정](#2-resend-설정)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [테이블 생성](#4-테이블-생성)
5. [테스트](#5-테스트)

---

## 1. Supabase 설정

### 1.1 Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호, 지역 선택
4. "Create new project" 클릭

### 1.2 API 키 확인

1. 프로젝트 대시보드에서 Settings > API로 이동
2. 다음 정보 복사:
   - `URL`: Project URL
   - `anon/public`: anon key
   - `service_role`: service_role key (주의: 절대 클라이언트에 노출하지 마세요!)

---

## 2. Resend 설정

### 2.1 Resend 계정 생성

1. [Resend](https://resend.com)에 가입
2. 이메일 인증 완료

### 2.2 API 키 발급

1. 대시보드에서 "API Keys" 메뉴로 이동
2. "Create API Key" 클릭
3. 키 이름 입력 (예: "jira-lite-team-invite")
4. API 키 복사 (한 번만 표시되므로 안전하게 보관)

### 2.3 도메인 인증 (선택사항)

테스트 시에는 `onboarding@resend.dev`를 사용할 수 있지만, 프로덕션에서는 자신의 도메인을 인증해야 합니다.

1. "Domains" 메뉴로 이동
2. "Add Domain" 클릭
3. 도메인 입력 및 DNS 레코드 설정
4. 인증 완료 후 `RESEND_FROM_EMAIL`을 업데이트

---

## 3. 환경 변수 설정

`.env.local` 파일에 다음 내용을 추가하세요:

```bash
# Supabase 프로젝트 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 이메일 발송 설정 (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev  # 또는 인증된 도메인 이메일

# 애플리케이션 기본 URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # 프로덕션에서는 실제 도메인 사용
```

---

## 4. 테이블 생성

### 4.1 Supabase SQL Editor 사용

1. Supabase 대시보드에서 SQL Editor로 이동
2. "New query" 클릭
3. `supabase/migrations/create_team_invitations.sql` 파일의 내용을 복사하여 붙여넣기
4. "Run" 클릭

### 4.2 테이블 구조 확인

생성된 `team_invitations` 테이블 구조:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 (자동 생성) |
| email | TEXT | 초대받는 사람의 이메일 |
| token | UUID | 초대 토큰 (링크에 사용) |
| status | TEXT | 초대 상태 (pending, accepted, expired) |
| invited_by | TEXT | 초대를 보낸 사람 |
| expires_at | TIMESTAMPTZ | 만료 시간 |
| created_at | TIMESTAMPTZ | 생성 시간 |
| updated_at | TIMESTAMPTZ | 수정 시간 |

---

## 5. 테스트

### 5.1 개발 서버 실행

```bash
pnpm dev
```

### 5.2 페이지 접속

브라우저에서 다음 URL로 접속:

```
http://localhost:3000/test/team-invite
```

### 5.3 초대 테스트

1. **초대 발송**
   - 테스트용 이메일 주소 입력
   - 초대자 이름 입력 (선택)
   - "초대 발송" 버튼 클릭
   - 이메일 수신 확인

2. **초대 수락**
   - 이메일에서 "초대 수락하기" 버튼 클릭
   - 또는 수동으로 초대 링크 복사하여 접속
   - "초대 수락하기" 버튼 클릭
   - 성공 메시지 확인

3. **초대 목록 확인**
   - 메인 페이지에서 발송된 초대 목록 확인
   - 상태별로 필터링 (대기중, 수락됨, 만료됨)
   - 재발송 및 삭제 기능 테스트

---

## 📁 파일 구조

```
src/
├── app/
│   ├── api/
│   │   └── send-invite/
│   │       └── route.ts          # 이메일 발송 API
│   └── test/
│       └── team-invite/
│           ├── page.tsx           # 초대 메인 페이지
│           └── accept/
│               └── page.tsx       # 초대 수락 페이지
├── lib/
│   └── supabase/
│       ├── client.ts              # 클라이언트 Supabase 인스턴스
│       └── server.ts              # 서버 Supabase 인스턴스
└── types/
    └── team-invite.ts             # 타입 정의

supabase/
└── migrations/
    └── create_team_invitations.sql # 테이블 생성 SQL
```

---

## 🔒 보안 고려사항

1. **환경 변수 보호**
   - `.env.local` 파일은 절대 Git에 커밋하지 마세요
   - `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용하세요

2. **Row Level Security (RLS)**
   - 현재는 테스트용으로 모든 접근을 허용합니다
   - 프로덕션에서는 인증된 사용자만 접근하도록 RLS 정책을 수정하세요

3. **이메일 발송 제한**
   - 스팸 방지를 위해 발송 빈도 제한 추가 고려
   - Resend의 무료 플랜 제한 확인 (월 3,000통)

---

## 🚀 다음 단계

1. **사용자 인증 통합**
   - Supabase Auth와 연동
   - 로그인한 사용자만 초대 발송 가능하도록 수정

2. **팀 멤버 관리**
   - 수락된 초대를 `team_members` 테이블에 추가
   - 팀별 권한 관리

3. **알림 기능**
   - 초대 수락 시 관리자에게 알림
   - 만료 임박 알림

4. **UI 개선**
   - 반응형 디자인 최적화
   - 로딩 상태 개선
   - 에러 처리 강화

---

## 🆘 문제 해결

### 이메일이 발송되지 않는 경우

1. `RESEND_API_KEY`가 올바른지 확인
2. Resend 대시보드에서 API 키 상태 확인
3. 이메일 주소 형식이 올바른지 확인
4. Resend 로그에서 오류 메시지 확인

### 데이터베이스 오류

1. Supabase 프로젝트가 활성 상태인지 확인
2. API 키가 올바른지 확인
3. 테이블이 올바르게 생성되었는지 확인
4. RLS 정책 확인

### 초대 링크가 작동하지 않는 경우

1. `NEXT_PUBLIC_BASE_URL`이 올바른지 확인
2. 토큰이 유효한지 확인
3. 만료 시간이 지나지 않았는지 확인

---

## 📚 참고 자료

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

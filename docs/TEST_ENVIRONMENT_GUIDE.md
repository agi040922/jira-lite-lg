# 테스트 환경 가이드

## 📌 빠른 시작

이 문서는 Jira Lite MVP 프로젝트의 테스트 환경 설정과 테스트 계정 정보를 제공합니다.

---

## 🌐 테스트 환경 URL

### 로컬 개발 환경
```
http://localhost:3000
```

### 테스트 페이지 목록
| 페이지 | URL | 테스트 가능 기능 |
|--------|-----|-----------------|
| CRUD 테스트 | `/test/crud` | 데이터 생성/조회/수정/삭제 |
| Storage 테스트 | `/test/storage` | 파일 업로드/다운로드 |
| Auth 테스트 | `/test/auth` | 회원가입, 로그인, OAuth |
| Realtime 테스트 | `/test/realtime` | 실시간 동기화, Presence |
| Editor 테스트 | `/test/editor` | Rich Text Editor |
| Soft Delete 테스트 | `/test/soft-delete` | 논리적 삭제/복구 |
| 팀 초대 테스트 | `/test/team-invite` | 이메일 초대 시스템 |

---

## 🔑 테스트 계정 정보

### Supabase Auth 계정

#### 관리자 계정
```
이메일: admin@test.com
비밀번호: Test1234!
역할: ADMIN
```

#### 일반 사용자 계정
```
이메일: user@test.com
비밀번호: Test1234!
역할: MEMBER
```

#### 테스트 사용자 계정 (추가 테스트용)
```
이메일: dev@test.com
비밀번호: Test1234!
역할: MEMBER
```

### Google OAuth 테스트
- Google 계정으로 로그인 가능
- 리다이렉트 URL: `http://localhost:3000/auth/callback`
- Supabase Dashboard에서 Google OAuth 설정 필요

---

## 🛠️ 환경 변수 설정

### 필수 환경 변수 (.env.local)

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 이메일 발송 (Resend API)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 환경 변수 확인 방법

1. **Supabase 정보**: https://app.supabase.com/project/_/settings/api
2. **Resend API Key**: https://resend.com/api-keys
3. **Google OAuth**: Supabase Dashboard → Authentication → Providers

---

## 🗄️ 데이터베이스 설정

### 마이그레이션 실행 순서

```bash
# Supabase SQL Editor에서 순서대로 실행
1. supabase/migrations/step1_basic_tables.sql
2. supabase/migrations/step2_team_and_project_tables.sql
3. supabase/migrations/step3_issue_tables.sql
4. supabase/migrations/step4_ai_and_notification_tables.sql
5. supabase/migrations/step5_functions_triggers.sql
6. supabase/migrations/step6_seed_data.sql (선택사항)
```

### 테스트 데이터 생성

`step6_seed_data.sql`을 실행하면 다음 데이터가 자동 생성됩니다:
- 샘플 팀 3개
- 샘플 프로젝트 5개
- 샘플 이슈 20개
- 샘플 라벨 및 상태

---

## 🧪 주요 테스트 시나리오

### 1. 인증 테스트 (/test/auth)
1. 이메일/비밀번호로 회원가입
2. 로그인 후 JWT 토큰 확인
3. Google OAuth 로그인 테스트
4. 로그아웃

### 2. CRUD 테스트 (/test/crud)
1. 새 레코드 생성
2. 목록 조회
3. 레코드 수정
4. 레코드 삭제

### 3. Storage 테스트 (/test/storage)
1. 이미지 파일 업로드
2. 한글 파일명 업로드
3. 파일 다운로드
4. 파일 삭제

### 4. Realtime 테스트 (/test/realtime)
1. 브라우저 2개 창 열기
2. 한 창에서 데이터 변경
3. 다른 창에서 실시간 업데이트 확인
4. Presence 기능으로 온라인 사용자 확인

### 5. 팀 초대 테스트 (/test/team-invite)
1. 초대 링크 생성
2. 이메일 발송 (Resend API 필요)
3. 초대 링크로 팀 가입
4. 멤버 역할 확인

---

## 📊 테스트 완료 체크리스트

- [ ] 로컬 개발 서버 실행 (`pnpm dev`)
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 테스트 계정으로 로그인 성공
- [ ] CRUD 기본 동작 확인
- [ ] 파일 업로드/다운로드 테스트
- [ ] Realtime 동기화 확인
- [ ] Google OAuth 로그인 테스트 (선택)
- [ ] 팀 초대 이메일 발송 테스트 (선택)

---

## 🔧 트러블슈팅

### 로그인이 안 돼요
- Supabase Dashboard에서 Email Auth가 활성화되어 있는지 확인
- `step1_basic_tables.sql`의 `handle_new_user()` 트리거가 실행되었는지 확인

### Google OAuth가 안 돼요
- Supabase Dashboard → Authentication → Providers → Google 설정 확인
- Authorized redirect URIs에 `http://localhost:3000/auth/callback` 추가
- Google Cloud Console에서 OAuth 클라이언트 ID 설정 확인

### Realtime이 동작하지 않아요
- 테이블이 Publication에 추가되어 있는지 확인:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE your_table_name;
  ```

### 이메일이 발송되지 않아요
- Resend API Key가 올바른지 확인
- 무료 플랜은 월 3,000통 제한
- 테스트용 이메일 주소 확인 (`onboarding@resend.dev` 사용 가능)

---

## 📚 추가 문서

- [Supabase 테스트 가이드](./SUPABASE_TEST_GUIDE.md)
- [팀 초대 설정](./TEAM_INVITE_SETUP.md)
- [에디터 설정](./EDITOR_SETUP.md)
- [데이터베이스 스키마](./database-schema.md)

---

## 💡 팁

1. **개발 중 자주 사용하는 명령어**
   ```bash
   pnpm dev          # 개발 서버 시작
   pnpm build        # 프로덕션 빌드
   pnpm lint         # 코드 린팅
   ```

2. **Supabase SQL Editor 단축키**
   - `Ctrl + Enter`: 선택한 쿼리 실행
   - `Ctrl + A`: 전체 선택

3. **빠른 테스트를 위한 북마크**
   ```
   http://localhost:3000/test/crud
   http://localhost:3000/test/auth
   http://localhost:3000/test/realtime
   ```

---

## 📞 문의

이슈나 질문사항은 프로젝트 GitHub Issues에 등록해주세요.

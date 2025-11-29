# RLS(Row Level Security) 완전 비활성화 가이드

## 개요

개발 환경에서 RLS 정책이 복잡도를 높이고 디버깅을 어렵게 만들므로, 모든 정책을 제거하고 RLS를 비활성화합니다.

⚠️ **주의**: 이 설정은 **개발 환경 전용**입니다. 프로덕션 환경에서는 반드시 RLS를 활성화하고 적절한 정책을 설정해야 합니다.

## 실행 방법

### 옵션 1: Supabase Dashboard (권장)

1. Supabase Dashboard 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. 아래 파일 중 하나를 복사하여 붙여넣기:
   - `QUICK_FIX.sql` (루트 디렉토리)
   - `supabase/migrations/step9_fix_project_statuses_policy.sql`
4. **RUN** 버튼 클릭
5. 결과 확인

### 옵션 2: Supabase CLI

```bash
cd /Users/jeong-gyeonghun/Downloads/jira-lite-lg

# 마이그레이션 실행
supabase db reset

# 또는 특정 파일만 실행
psql $DATABASE_URL -f QUICK_FIX.sql
```

## 실행 결과

### 삭제되는 정책

다음 테이블의 모든 RLS 정책이 제거됩니다:

- `users`
- `teams`, `team_members`, `team_invitations`, `team_activity_logs`
- `projects`, `project_favorites`, `project_statuses`
- `labels`, `issues`, `issue_labels`, `subtasks`
- `comments`, `issue_history`
- `notifications`, `ai_cache`, `ai_rate_limits`

### RLS 비활성화

모든 테이블의 RLS가 완전히 비활성화됩니다.

### 확인 쿼리

SQL 실행 후 다음 결과를 확인할 수 있습니다:

```
tablename                | status
-------------------------+--------------------
users                    | ✅ RLS 비활성화됨
teams                    | ✅ RLS 비활성화됨
team_members             | ✅ RLS 비활성화됨
projects                 | ✅ RLS 비활성화됨
project_statuses         | ✅ RLS 비활성화됨
...
```

## 해결되는 문제

### 1. 팀 생성 불가
- **증상**: 팀 생성 시 권한 오류 발생
- **원인**: `teams`, `team_members` 테이블의 RLS 정책
- **해결**: RLS 비활성화로 모든 사용자가 팀 생성 가능

### 2. 프로젝트 생성 불가
- **증상**: 프로젝트 생성 시 권한 오류 발생
- **원인**: `projects` 테이블의 RLS 정책
- **해결**: RLS 비활성화로 팀 멤버가 프로젝트 생성 가능

### 3. 기본 상태(칸반 컬럼) 생성 실패
- **증상**: 프로젝트는 생성되지만 Backlog, In Progress, Done 상태 생성 실패
- **원인**: `project_statuses` 정책이 `is_default = false` 조건으로 기본 상태 생성 차단
- **해결**: RLS 비활성화로 모든 상태 생성 가능

### 4. 이슈 생성/수정 불가
- **증상**: 이슈 CRUD 작업 시 권한 오류
- **원인**: `issues`, `comments` 등의 RLS 정책
- **해결**: RLS 비활성화로 자유로운 CRUD 가능

## 프로덕션 환경 고려사항

프로덕션 배포 전 반드시 다음을 수행해야 합니다:

1. **RLS 재활성화**
   ```sql
   ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
   -- ... 모든 테이블
   ```

2. **적절한 정책 생성**
   - 팀 멤버만 팀 데이터 조회 가능
   - 프로젝트 멤버만 프로젝트 데이터 조회 가능
   - 소유자/관리자만 수정/삭제 가능
   - 사용자 본인 데이터만 수정 가능

3. **보안 검토**
   - 민감한 데이터 접근 제한
   - API 엔드포인트 보안 강화
   - 환경 변수 보안 설정

## 참고 파일

- `/QUICK_FIX.sql`: 실행 가능한 SQL 스크립트
- `/supabase/migrations/step9_fix_project_statuses_policy.sql`: 마이그레이션 파일
- `/docs/database-schema.md`: 데이터베이스 스키마 문서

## 문제 해결

### SQL 실행 시 오류 발생

```sql
-- 특정 정책이 이미 삭제된 경우
-- DROP POLICY IF EXISTS를 사용하므로 오류가 발생하지 않습니다

-- 테이블이 없는 경우
-- 마이그레이션 파일을 순차적으로 실행했는지 확인하세요
```

### 여전히 권한 오류 발생

```sql
-- RLS 상태 확인
SELECT tablename, relrowsecurity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public';

-- 남아있는 정책 확인
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 작성일

2025-11-29

## 작성자

Cursor AI Assistant


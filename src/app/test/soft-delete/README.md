# Soft Delete 패턴 구현

Next.js 15와 Supabase를 사용한 Soft Delete 패턴 데모 페이지입니다.

## 🎯 주요 기능

### 1. Soft Delete (일반 삭제)
- `deleted_at` 컬럼에 현재 시간을 저장
- 실제로 데이터는 삭제되지 않음
- 나중에 복구 가능

### 2. 복구 (Restore)
- `deleted_at`을 `null`로 변경
- 삭제된 문서를 다시 활성 상태로 전환

### 3. 영구 삭제 (Hard Delete)
- 실제 `DELETE` 쿼리 실행
- 데이터베이스에서 완전히 제거
- 복구 불가능

### 4. 필터링
- 기본 뷰: `deleted_at IS NULL` (활성 문서만)
- 삭제함 뷰: `deleted_at IS NOT NULL` (삭제된 문서만)

## 📦 설치 방법

### 1. Supabase 테이블 생성

`setup.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

```sql
-- Supabase Dashboard > SQL Editor에서 실행
-- 또는 파일 내용을 복사하여 실행
```

### 2. 환경 변수 설정

`.env.local` 파일에 Supabase 정보를 입력하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 페이지 접속

```
http://localhost:3000/test/soft-delete
```

## 🏗️ 데이터베이스 구조

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,  -- 핵심: Soft Delete 컬럼
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

## 💡 왜 Soft Delete를 사용하나요?

### 장점
1. **실수 방지**: 잘못 삭제한 데이터를 복구 가능
2. **감사 추적**: 삭제된 데이터의 히스토리 유지
3. **규정 준수**: 일정 기간 데이터 보존이 필요한 경우
4. **사용자 경험**: "삭제 취소" 기능 제공 가능

### 단점
1. **데이터베이스 용량**: 삭제된 데이터도 계속 저장됨
2. **쿼리 복잡도**: 항상 `deleted_at IS NULL` 조건 추가 필요
3. **인덱스 관리**: deleted_at 컬럼에 대한 인덱스 필요

## 🔒 보안 (RLS 정책)

현재는 테스트용으로 모든 사용자에게 권한을 부여했지만, 실제 프로덕션에서는:

```sql
-- 1. user_id 컬럼 추가
ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. 본인이 생성한 문서만 수정/삭제 가능
CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. 본인이 생성한 문서만 삭제 가능
CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  USING (auth.uid() = user_id);
```

## 🚀 실전 팁

### 1. 자동 정리 (Auto Cleanup)
30일 이상 지난 삭제 문서는 자동으로 영구 삭제:

```sql
-- PostgreSQL Function
CREATE OR REPLACE FUNCTION auto_hard_delete_old_documents()
RETURNS void AS $$
BEGIN
  DELETE FROM documents
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Cron Job (Supabase의 pg_cron 사용)
SELECT cron.schedule(
  'auto-cleanup-documents',
  '0 2 * * *',  -- 매일 새벽 2시
  $$SELECT auto_hard_delete_old_documents()$$
);
```

### 2. deleted_by 추적
누가 삭제했는지 기록:

```sql
ALTER TABLE documents ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- 삭제 시
UPDATE documents
SET deleted_at = NOW(),
    deleted_by = auth.uid()
WHERE id = '...';
```

### 3. View 생성 (편의성)
항상 필터링하기 귀찮다면 View 사용:

```sql
-- 활성 문서만 보는 View
CREATE VIEW active_documents AS
SELECT * FROM documents
WHERE deleted_at IS NULL;

-- 삭제된 문서만 보는 View
CREATE VIEW deleted_documents AS
SELECT * FROM documents
WHERE deleted_at IS NOT NULL;
```

## 📚 관련 패턴

### Hard Delete vs Soft Delete

| 구분 | Hard Delete | Soft Delete |
|------|-------------|-------------|
| 데이터 | 완전히 제거됨 | 남아있음 |
| 복구 | 불가능 | 가능 |
| 디스크 용량 | 절약됨 | 계속 사용 |
| 쿼리 | 간단 | 필터링 필요 |
| 감사 추적 | 어려움 | 쉬움 |

### Archive 패턴
Soft Delete와 비슷하지만, 삭제된 데이터를 별도 테이블로 이동:

```sql
-- 아카이브 테이블
CREATE TABLE documents_archive (LIKE documents);

-- 삭제 시 아카이브로 이동
INSERT INTO documents_archive SELECT * FROM documents WHERE id = '...';
DELETE FROM documents WHERE id = '...';
```

## 🧪 테스트 시나리오

1. **문서 생성**: 새 문서 3개 생성
2. **Soft Delete**: 첫 번째 문서 삭제
3. **뷰 전환**: "삭제함" 탭으로 이동
4. **복구**: 삭제한 문서 복구
5. **영구 삭제**: 두 번째 문서 완전히 삭제
6. **확인**: 복구된 문서는 활성 탭에, 영구 삭제된 문서는 완전히 사라짐

## 🎓 학습 포인트

### 1. Supabase 쿼리 필터링
```typescript
// 활성 문서만
.is('deleted_at', null)

// 삭제된 문서만
.not('deleted_at', 'is', null)
```

### 2. UPDATE vs DELETE
```typescript
// Soft Delete (UPDATE)
.update({ deleted_at: new Date().toISOString() })

// Hard Delete (DELETE)
.delete()
```

### 3. 인덱스의 중요성
`deleted_at` 컬럼에 인덱스가 없으면 전체 테이블 스캔 발생:
```sql
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
```

## 🔧 문제 해결

### Q: RLS 오류가 발생해요
A: Supabase Dashboard에서 RLS 정책이 제대로 설정되었는지 확인하세요.

### Q: 삭제된 문서가 보이지 않아요
A: `showDeleted` 상태가 true인지 확인하고, Supabase에서 실제로 `deleted_at`이 null이 아닌지 확인하세요.

### Q: 영구 삭제가 안 돼요
A: RLS DELETE 정책이 설정되었는지 확인하세요.

## 📞 참고 자료

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Soft Delete Pattern](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

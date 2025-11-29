# Jira Lite - 데이터베이스 스키마 설계

## 개요

이 문서는 PRD 요구사항을 기반으로 설계된 Supabase(PostgreSQL) 데이터베이스 스키마입니다.

---

## ERD 개요

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   users     │────<│ team_members│>────│     teams       │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                   │                     │
       │                   │                     │
       ▼                   ▼                     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│notifications│     │team_activity│     │   projects      │
└─────────────┘     │   _logs     │     └─────────────────┘
                    └─────────────┘            │
                                               │
       ┌───────────────────────────────────────┼───────────────────┐
       │                                       │                   │
       ▼                                       ▼                   ▼
┌─────────────┐                         ┌─────────────┐     ┌─────────────┐
│   labels    │                         │   issues    │     │  project_   │
└─────────────┘                         └─────────────┘     │  statuses   │
       │                                       │            └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│issue_labels │     │  subtasks   │     │  comments   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │issue_history│
                                        └─────────────┘
```

---

## 테이블 상세

### 1. users (사용자)

Supabase Auth의 `auth.users`를 확장하는 프로필 테이블입니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, FK(auth.users) | Supabase Auth user id |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 |
| name | VARCHAR(50) | NOT NULL | 이름 (1~50자) |
| profile_image | TEXT | | 프로필 이미지 URL |
| provider | VARCHAR(20) | NOT NULL, DEFAULT 'email' | 인증 방식 (email/google) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |
| deleted_at | TIMESTAMPTZ | | Soft Delete |

**PRD 매핑**: FR-001, FR-004, FR-005, FR-007, FR-071

---

### 2. teams (팀)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 팀 ID |
| name | VARCHAR(50) | NOT NULL | 팀 이름 (1~50자) |
| owner_id | UUID | FK(users.id), NOT NULL | 팀 소유자 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |
| deleted_at | TIMESTAMPTZ | | Soft Delete |

**PRD 매핑**: FR-010, FR-011, FR-012, FR-071

---

### 3. team_members (팀 멤버)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 멤버 ID |
| team_id | UUID | FK(teams.id), NOT NULL | 팀 ID |
| user_id | UUID | FK(users.id), NOT NULL | 사용자 ID |
| role | VARCHAR(10) | NOT NULL, CHECK | OWNER/ADMIN/MEMBER |
| joined_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 가입일 |

**UNIQUE**: (team_id, user_id)

**PRD 매핑**: FR-010, FR-014, FR-015, FR-016, FR-017, FR-018

---

### 4. team_invitations (팀 초대)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 초대 ID |
| team_id | UUID | FK(teams.id), NOT NULL | 팀 ID |
| email | VARCHAR(255) | NOT NULL | 초대받을 이메일 |
| token | UUID | UNIQUE, NOT NULL | 초대 토큰 |
| status | VARCHAR(10) | NOT NULL, DEFAULT 'pending' | pending/accepted/expired |
| invited_by_id | UUID | FK(users.id), NOT NULL | 초대자 |
| expires_at | TIMESTAMPTZ | NOT NULL | 만료일 (7일 후) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |

**PRD 매핑**: FR-013

---

### 5. team_activity_logs (팀 활동 로그)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 로그 ID |
| team_id | UUID | FK(teams.id), NOT NULL | 팀 ID |
| user_id | UUID | FK(users.id), NOT NULL | 수행자 |
| action_type | VARCHAR(50) | NOT NULL | 활동 유형 |
| target_type | VARCHAR(50) | | 대상 유형 (member/project/team) |
| target_id | UUID | | 대상 ID |
| description | TEXT | NOT NULL | 활동 내용 |
| metadata | JSONB | | 추가 데이터 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 발생일 |

**action_type 예시**:
- `member_joined`, `member_left`, `member_kicked`
- `role_changed`
- `project_created`, `project_deleted`, `project_archived`
- `team_updated`

**PRD 매핑**: FR-019

---

### 6. projects (프로젝트)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 프로젝트 ID |
| team_id | UUID | FK(teams.id), NOT NULL | 팀 ID |
| name | VARCHAR(100) | NOT NULL | 프로젝트명 (1~100자) |
| description | VARCHAR(2000) | | 설명 (최대 2000자) |
| owner_id | UUID | FK(users.id), NOT NULL | 소유자 |
| is_archived | BOOLEAN | NOT NULL, DEFAULT false | 아카이브 여부 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |
| deleted_at | TIMESTAMPTZ | | Soft Delete |

**제한**: 팀당 최대 15개 프로젝트

**PRD 매핑**: FR-020~FR-026, FR-071

---

### 7. project_favorites (프로젝트 즐겨찾기)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | ID |
| project_id | UUID | FK(projects.id), NOT NULL | 프로젝트 ID |
| user_id | UUID | FK(users.id), NOT NULL | 사용자 ID |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 추가일 |

**UNIQUE**: (project_id, user_id)

**PRD 매핑**: FR-027

---

### 8. project_statuses (커스텀 상태/칸반 컬럼)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 상태 ID |
| project_id | UUID | FK(projects.id), NOT NULL | 프로젝트 ID |
| name | VARCHAR(30) | NOT NULL | 상태명 (1~30자) |
| color | VARCHAR(7) | | HEX 색상 코드 |
| position | INTEGER | NOT NULL | 컬럼 순서 |
| is_default | BOOLEAN | NOT NULL, DEFAULT false | 기본 상태 여부 |
| wip_limit | INTEGER | CHECK(1-50) | WIP 제한 (null=무제한) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

**UNIQUE**: (project_id, name)

**기본 상태**: Backlog(0), In Progress(1), Done(2)

**제한**: 기본 3개 + 커스텀 최대 5개 = 총 8개

**PRD 매핑**: FR-033, FR-053, FR-054

---

### 9. labels (라벨)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 라벨 ID |
| project_id | UUID | FK(projects.id), NOT NULL | 프로젝트 ID |
| name | VARCHAR(30) | NOT NULL | 라벨명 (1~30자) |
| color | VARCHAR(7) | NOT NULL | HEX 색상 코드 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

**UNIQUE**: (project_id, name)

**제한**: 프로젝트당 최대 20개

**PRD 매핑**: FR-038

---

### 10. issues (이슈)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 이슈 ID |
| project_id | UUID | FK(projects.id), NOT NULL | 프로젝트 ID |
| issue_number | SERIAL | | 이슈 번호 (프로젝트 내 순번) |
| issue_key | VARCHAR(20) | UNIQUE | 이슈 키 (예: LIG-325) |
| title | VARCHAR(200) | NOT NULL | 제목 (1~200자) |
| description | TEXT | | 설명 (최대 5000자) |
| status_id | UUID | FK(project_statuses.id) | 상태 ID |
| priority | VARCHAR(10) | NOT NULL, DEFAULT 'MEDIUM' | HIGH/MEDIUM/LOW |
| assignee_id | UUID | FK(users.id) | 담당자 |
| owner_id | UUID | FK(users.id), NOT NULL | 생성자 |
| due_date | DATE | | 마감일 |
| position | INTEGER | NOT NULL, DEFAULT 0 | 컬럼 내 순서 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |
| deleted_at | TIMESTAMPTZ | | Soft Delete |

**제한**: 프로젝트당 최대 200개

**PRD 매핑**: FR-030~FR-039, FR-071

---

### 11. issue_labels (이슈-라벨 연결)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | ID |
| issue_id | UUID | FK(issues.id), NOT NULL | 이슈 ID |
| label_id | UUID | FK(labels.id), NOT NULL | 라벨 ID |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 추가일 |

**UNIQUE**: (issue_id, label_id)

**제한**: 이슈당 최대 5개

**PRD 매핑**: FR-038

---

### 12. subtasks (서브태스크)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 서브태스크 ID |
| issue_id | UUID | FK(issues.id), NOT NULL | 이슈 ID |
| title | VARCHAR(200) | NOT NULL | 제목 (1~200자) |
| is_completed | BOOLEAN | NOT NULL, DEFAULT false | 완료 여부 |
| position | INTEGER | NOT NULL | 순서 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |

**제한**: 이슈당 최대 20개

**PRD 매핑**: FR-039-2

---

### 13. comments (댓글)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 댓글 ID |
| issue_id | UUID | FK(issues.id), NOT NULL | 이슈 ID |
| user_id | UUID | FK(users.id), NOT NULL | 작성자 |
| content | VARCHAR(1000) | NOT NULL | 내용 (1~1000자) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |
| deleted_at | TIMESTAMPTZ | | Soft Delete |

**PRD 매핑**: FR-060~FR-063, FR-071

---

### 14. issue_history (이슈 변경 히스토리)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 히스토리 ID |
| issue_id | UUID | FK(issues.id), NOT NULL | 이슈 ID |
| user_id | UUID | FK(users.id), NOT NULL | 변경자 |
| field_name | VARCHAR(50) | NOT NULL | 변경된 필드명 |
| old_value | TEXT | | 이전 값 |
| new_value | TEXT | | 새 값 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 변경일 |

**기록 대상 field_name**:
- `status`, `assignee`, `priority`, `title`, `due_date`

**PRD 매핑**: FR-039

---

### 15. notifications (알림)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 알림 ID |
| user_id | UUID | FK(users.id), NOT NULL | 수신자 |
| type | VARCHAR(50) | NOT NULL | 알림 유형 |
| title | VARCHAR(200) | NOT NULL | 알림 제목 |
| message | TEXT | | 알림 내용 |
| reference_type | VARCHAR(50) | | 참조 타입 (issue/team/project) |
| reference_id | UUID | | 참조 ID |
| is_read | BOOLEAN | NOT NULL, DEFAULT false | 읽음 여부 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

**알림 유형 (type)**:
- `issue_assigned` - 이슈 담당자 지정
- `comment_added` - 댓글 작성
- `due_date_approaching` - 마감일 임박 (1일 전)
- `due_date_today` - 마감일 당일
- `team_invited` - 팀 초대
- `role_changed` - 역할 변경

**PRD 매핑**: FR-090, FR-091

---

### 16. ai_cache (AI 결과 캐시)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 캐시 ID |
| issue_id | UUID | FK(issues.id), NOT NULL | 이슈 ID |
| cache_type | VARCHAR(30) | NOT NULL | 캐시 유형 |
| content | TEXT | NOT NULL | AI 결과 내용 |
| input_hash | VARCHAR(64) | NOT NULL | 입력값 해시 (무효화 판단용) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| expires_at | TIMESTAMPTZ | | 만료일 |

**UNIQUE**: (issue_id, cache_type)

**cache_type**:
- `summary` - 이슈 설명 요약 (FR-040)
- `suggestion` - 해결 전략 제안 (FR-041)
- `auto_label` - 자동 라벨 추천 (FR-043)
- `duplicate` - 중복 이슈 탐지 (FR-044)
- `comment_summary` - 댓글 요약 (FR-045)

**PRD 매핑**: FR-040, FR-041, FR-043, FR-044, FR-045

---

### 17. ai_rate_limits (AI Rate Limiting)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | ID |
| user_id | UUID | FK(users.id), NOT NULL | 사용자 ID |
| request_count | INTEGER | NOT NULL, DEFAULT 1 | 요청 횟수 |
| window_start | TIMESTAMPTZ | NOT NULL | 윈도우 시작 시간 |
| window_type | VARCHAR(10) | NOT NULL | minute/day |

**UNIQUE**: (user_id, window_type)

**제한**:
- 분당 10회 (window_type = 'minute')
- 일당 100회 (window_type = 'day')

**PRD 매핑**: FR-042

---

### 18. password_reset_tokens (비밀번호 재설정 토큰)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 토큰 ID |
| user_id | UUID | FK(users.id), NOT NULL | 사용자 ID |
| token | UUID | UNIQUE, NOT NULL | 재설정 토큰 |
| expires_at | TIMESTAMPTZ | NOT NULL | 만료일 (1시간 후) |
| used_at | TIMESTAMPTZ | | 사용일 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

**PRD 매핑**: FR-003

---

## 데이터 제한 요약 (PRD Section 4 기준)

| 항목 | 제한 | 구현 위치 |
|------|------|-----------|
| 팀당 프로젝트 수 | 최대 15개 | 트리거/함수 |
| 프로젝트당 이슈 수 | 최대 200개 | 트리거/함수 |
| 이슈당 서브태스크 수 | 최대 20개 | 트리거/함수 |
| 프로젝트당 라벨 수 | 최대 20개 | 트리거/함수 |
| 이슈당 라벨 수 | 최대 5개 | 트리거/함수 |
| 프로젝트당 커스텀 상태 수 | 최대 5개 (총 8개) | 트리거/함수 |
| 컬럼당 WIP Limit | 1~50 또는 무제한 | CHECK 제약 |
| 팀 이름 | 1~50자 | VARCHAR(50) |
| 프로젝트 이름 | 1~100자 | VARCHAR(100) |
| 프로젝트 설명 | 최대 2000자 | VARCHAR(2000) |
| 이슈 제목 | 1~200자 | VARCHAR(200) |
| 이슈 설명 | 최대 5000자 | TEXT + CHECK |
| 서브태스크 제목 | 1~200자 | VARCHAR(200) |
| 라벨 이름 | 1~30자 | VARCHAR(30) |
| 커스텀 상태 이름 | 1~30자 | VARCHAR(30) |
| 댓글 내용 | 1~1000자 | VARCHAR(1000) |
| 사용자 이름 | 1~50자 | VARCHAR(50) |
| 이메일 | 최대 255자 | VARCHAR(255) |
| 팀 초대 만료 | 7일 | expires_at |
| 비밀번호 재설정 만료 | 1시간 | expires_at |
| AI Rate Limit (분당) | 10회 | ai_rate_limits |
| AI Rate Limit (일당) | 100회 | ai_rate_limits |

---

## 인덱스 전략

### 자주 사용되는 쿼리 패턴별 인덱스

1. **팀 멤버 조회**: `team_members(team_id)`
2. **프로젝트 목록**: `projects(team_id, deleted_at, is_archived)`
3. **이슈 목록 (칸반)**: `issues(project_id, status_id, deleted_at)`
4. **이슈 필터링**: `issues(assignee_id)`, `issues(priority)`, `issues(due_date)`
5. **알림 목록**: `notifications(user_id, is_read, created_at)`
6. **활동 로그**: `team_activity_logs(team_id, created_at)`
7. **Soft Delete**: 모든 주요 테이블에 `deleted_at` 인덱스

---

## 트리거 목록

1. **updated_at 자동 업데이트**: 모든 테이블
2. **이슈 번호 자동 생성**: issues 테이블
3. **이슈 키 자동 생성**: issues 테이블
4. **이슈 변경 히스토리 기록**: issues 테이블 UPDATE 시
5. **프로젝트 개수 제한**: projects INSERT 시
6. **이슈 개수 제한**: issues INSERT 시
7. **서브태스크 개수 제한**: subtasks INSERT 시
8. **라벨 개수 제한**: labels INSERT 시
9. **이슈-라벨 개수 제한**: issue_labels INSERT 시
10. **커스텀 상태 개수 제한**: project_statuses INSERT 시
11. **기본 상태 자동 생성**: projects INSERT 시

# Rich Text Editor 설정 가이드

Next.js 15와 Supabase를 활용한 Rich Text Editor 페이지가 구현되었습니다.

## 주요 기능

✅ **React Quill 기반 에디터**
- 텍스트 서식 (굵게, 기울임, 밑줄, 취소선)
- 헤더 스타일 (H1, H2, H3)
- 리스트 (순서, 비순서)
- 색상 및 배경색
- 링크 삽입
- 이미지 업로드

✅ **이미지 관리**
- 툴바에서 이미지 파일 선택 업로드
- Ctrl+V로 클립보드 이미지 바로 붙여넣기
- 한글 파일명 자동 처리 (URL-safe하게 변환)
- Supabase Storage에 자동 저장

✅ **게시글 관리**
- HTML 형태로 저장 및 불러오기
- 저장된 게시글 목록 표시
- 게시글 미리보기 (HTML 렌더링)
- 게시글 수정 및 삭제

## 설정 방법

### 1. Supabase 설정

#### 1-1. 테이블 생성
Supabase Dashboard의 SQL Editor에서 `supabase-editor-setup.sql` 파일 내용을 실행하세요.

```sql
-- posts 테이블이 생성되고 필요한 정책들이 자동으로 설정됩니다
```

#### 1-2. Storage 버킷 생성
Supabase Dashboard에서 Storage 메뉴로 이동:

1. **Storage** 메뉴 선택
2. **New bucket** 클릭
3. 다음 정보 입력:
   - Bucket name: `editor-images`
   - Public bucket: **ON** (체크)
4. **Create bucket** 클릭

#### 1-3. Storage 정책 설정
생성된 `editor-images` 버킷에 대한 정책 설정:

1. Storage > editor-images 버킷 선택
2. **Policies** 탭 선택
3. **New Policy** 클릭
4. 아래 정책들을 추가:

**업로드 정책:**
```sql
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'editor-images');
```

**읽기 정책:**
```sql
CREATE POLICY "Anyone can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'editor-images');
```

### 2. 환경 변수 확인

`.env.local` 파일에 Supabase 설정이 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 패키지 설치

```bash
pnpm install
```

## 사용 방법

### 에디터 페이지 접속

```
http://localhost:3000/test/editor
```

### 기본 사용법

1. **제목 입력**: 상단 입력창에 제목 작성
2. **내용 작성**:
   - 툴바를 사용하여 텍스트 서식 지정
   - 이미지 아이콘 클릭으로 파일 업로드
   - Ctrl+V로 클립보드 이미지 붙여넣기
3. **저장**: "저장하기" 버튼 클릭
4. **관리**: 오른쪽 패널에서 게시글 목록 확인, 미리보기, 수정, 삭제

## 파일 구조

```
src/
├── app/
│   └── test/
│       └── editor/
│           └── page.tsx              # 에디터 메인 페이지
├── components/
│   └── editor/
│       └── RichTextEditor.tsx        # 재사용 가능한 에디터 컴포넌트
├── types/
│   └── editor.ts                     # 에디터 관련 타입 정의
└── utils/
    └── sanitizeFilename.ts           # 파일명 정제 유틸리티
```

## 주요 코드 설명

### RichTextEditor 컴포넌트

**위치**: `src/components/editor/RichTextEditor.tsx`

주요 기능:
- `uploadImage()`: Supabase Storage에 이미지 업로드
- `imageHandler()`: 툴바 이미지 버튼 클릭 시 파일 선택 및 업로드
- `handlePaste()`: Ctrl+V로 클립보드 이미지 붙여넣기
- Dynamic Import로 SSR 이슈 해결

### 페이지 컴포넌트

**위치**: `src/app/test/editor/page.tsx`

주요 기능:
- `fetchPosts()`: 저장된 게시글 목록 불러오기
- `handleSave()`: 새 게시글 저장
- `handleDelete()`: 게시글 삭제
- `handleLoadPost()`: 게시글 불러와서 수정

### 파일명 처리

**위치**: `src/utils/sanitizeFilename.ts`

한글 파일명을 URL-safe하게 변환:
- 특수문자 → 언더스코어
- 타임스탬프 추가로 중복 방지

## 트러블슈팅

### 이미지가 업로드되지 않을 때
- Supabase Storage 버킷이 Public인지 확인
- Storage 정책이 올바르게 설정되었는지 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 게시글이 저장되지 않을 때
- `posts` 테이블이 생성되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- Supabase 연결 상태 확인

### SSR 에러가 발생할 때
- `react-quill`은 Dynamic Import로 로드되는지 확인
- `'use client'` 지시문이 파일 최상단에 있는지 확인

## 다음 단계 개선 사항

- [ ] 사용자 인증 추가 (Supabase Auth)
- [ ] 게시글 작성자 정보 저장
- [ ] 이미지 크기 제한 및 압축
- [ ] 드래그 앤 드롭 이미지 업로드
- [ ] 게시글 검색 기능
- [ ] 페이지네이션
- [ ] 자동 저장 (Draft)
- [ ] 마크다운 모드 지원

## 참고 자료

- [React Quill 문서](https://github.com/zenoamaro/react-quill)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [Next.js 15 문서](https://nextjs.org/docs)

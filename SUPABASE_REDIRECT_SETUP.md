# Supabase Redirect URL 설정 가이드

## 📍 설정해야 할 Redirect URLs

Supabase Dashboard → Authentication → URL Configuration에서 다음 URL들을 추가하세요.

### 1. **Site URL** (필수)
```
http://localhost:3000
```
프로덕션:
```
https://your-production-domain.com
```

### 2. **Redirect URLs** (필수)
다음 URL들을 **모두** 추가하세요:

#### 로컬 개발 환경
```
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/test/auth
```

#### 프로덕션 환경 (배포 시)
```
https://your-production-domain.com/auth/callback
https://your-production-domain.com/dashboard
https://your-production-domain.com/test/auth
```

## 🔧 설정 방법

### Supabase Dashboard에서:

1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** 클릭
4. **URL Configuration** 탭 클릭
5. **Redirect URLs** 섹션에서 위 URL들을 하나씩 추가

### 스크린샷 예시:
```
Site URL: http://localhost:3000

Redirect URLs:
  - http://localhost:3000/auth/callback    ← Google OAuth 콜백
  - http://localhost:3000/dashboard        ← 로그인 성공 후
  - http://localhost:3000/test/auth        ← 테스트 페이지용
```

## ⚠️ 주의사항

1. **localhost 포트**: 개발 서버 포트(3000)와 일치해야 함
2. **프로토콜**: http (로컬), https (프로덕션)
3. **슬래시**: URL 끝에 슬래시(/) 붙이지 말 것
4. **대소문자**: 정확히 일치해야 함

## ✅ 확인 방법

설정 후 Google 로그인 테스트:
1. `http://localhost:3000`에서 Google 로그인 클릭
2. Google 인증 완료
3. `/auth/callback` → `/dashboard`로 리다이렉트 확인

## 🚨 자주 발생하는 에러

### "redirect_uri_mismatch" 에러
→ Redirect URL이 정확히 추가되지 않음. 다시 확인하세요.

### "Invalid redirect URL" 에러
→ Site URL이 설정되지 않았거나 잘못됨. Site URL 먼저 설정하세요.

## 📝 Google OAuth 추가 설정 (선택)

Google Cloud Console에서도 동일한 Redirect URI 추가 필요:
```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

위치: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

/**
 * 파일명을 안전하게 변환하는 유틸리티
 * 한글 파일명을 URL-safe한 형태로 변환
 */
export function sanitizeFilename(filename: string): string {
  // 파일 확장자 분리
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  const ext = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';

  // 한글 및 특수문자를 언더스코어로 변환
  const sanitized = name
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
    .replace(/^_|_$/g, ''); // 앞뒤 언더스코어 제거

  // 타임스탬프 추가로 파일명 중복 방지
  const timestamp = Date.now();

  return `${sanitized}_${timestamp}${ext}`;
}

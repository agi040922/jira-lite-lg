/**
 * 한글을 영문으로 변환하는 유틸리티 함수
 *
 * 이 파일은 한글 파일명을 안전하게 처리하기 위한 유틸리티입니다.
 * Supabase Storage에서 한글 파일명이 깨지는 것을 방지하기 위해 사용됩니다.
 */

// 한글 초성, 중성, 종성 배열
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 한글 자음/모음을 영문으로 변환하는 매핑
const HANGUL_TO_ROMAN: { [key: string]: string } = {
  // 초성
  'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt',
  'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's',
  'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch',
  'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h',
  // 중성
  'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo',
  'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa',
  'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo',
  'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui',
  'ㅣ': 'i',
  // 종성 (받침)
  'ㄳ': 'k', 'ㄵ': 'n', 'ㄶ': 'n', 'ㄺ': 'k', 'ㄻ': 'm',
  'ㄼ': 'l', 'ㄽ': 'l', 'ㄾ': 'l', 'ㄿ': 'p', 'ㅀ': 'l',
  'ㅄ': 'p',
};

/**
 * 한글 음절을 자음과 모음으로 분해하는 함수
 * @param char - 분해할 한글 음절 (예: '한')
 * @returns 초성, 중성, 종성의 배열 (예: ['ㅎ', 'ㅏ', 'ㄴ'])
 */
function decomposeHangul(char: string): string[] {
  const code = char.charCodeAt(0) - 0xAC00;

  // 한글이 아닌 경우 그대로 반환
  if (code < 0 || code > 11171) {
    return [char];
  }

  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;

  return [CHO[cho], JUNG[jung], JONG[jong]].filter(Boolean);
}

/**
 * 한글 문자열을 로마자(영문)로 변환하는 함수
 *
 * 사용 예시:
 * hangulToRoman('안녕하세요.pdf') => 'annyeonghaseyo.pdf'
 * hangulToRoman('테스트_파일.jpg') => 'teseuteu_pail.jpg'
 *
 * @param text - 변환할 한글 문자열
 * @returns 로마자로 변환된 문자열
 */
export function hangulToRoman(text: string): string {
  let result = '';

  for (const char of text) {
    // 한글 음절인 경우
    if (char >= '가' && char <= '힣') {
      const parts = decomposeHangul(char);
      result += parts.map(part => HANGUL_TO_ROMAN[part] || part).join('');
    }
    // 그 외의 문자 (영문, 숫자, 특수문자 등)는 그대로 유지
    else {
      result += char;
    }
  }

  return result;
}

/**
 * 파일명을 안전하게 변환하는 함수
 *
 * 주요 기능:
 * 1. 한글을 로마자로 변환
 * 2. 공백을 언더스코어로 변환
 * 3. 특수문자 제거 (파일명에 안전한 문자만 유지)
 * 4. 확장자는 그대로 유지
 *
 * 사용 예시:
 * sanitizeFilename('내 파일.pdf') => 'nae_pail.pdf'
 * sanitizeFilename('프로젝트 문서 (최종).docx') => 'peurojekteu_munseo_choeijong.docx'
 *
 * @param filename - 변환할 파일명
 * @returns 안전하게 변환된 파일명
 */
export function sanitizeFilename(filename: string): string {
  // 파일명과 확장자 분리
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  // 한글을 로마자로 변환
  let sanitized = hangulToRoman(name);

  // 공백을 언더스코어로 변환
  sanitized = sanitized.replace(/\s+/g, '_');

  // 안전하지 않은 특수문자 제거 (영문, 숫자, 하이픈, 언더스코어만 허용)
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');

  // 연속된 언더스코어 제거
  sanitized = sanitized.replace(/_+/g, '_');

  // 앞뒤 언더스코어 제거
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // 빈 문자열인 경우 타임스탬프 사용
  if (!sanitized) {
    sanitized = `file_${Date.now()}`;
  }

  return sanitized + extension.toLowerCase();
}

/**
 * 파일 경로에서 안전한 경로를 생성하는 함수
 *
 * 사용 예시:
 * sanitizePath('사용자/문서/파일.pdf') => 'sayongja/munseo/pail.pdf'
 *
 * @param path - 변환할 경로
 * @returns 안전하게 변환된 경로
 */
export function sanitizePath(path: string): string {
  return path
    .split('/')
    .map(segment => sanitizeFilename(segment))
    .join('/');
}

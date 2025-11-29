/**
 * 에디터 관련 타입 정의
 */

// 게시글 타입
export interface Post {
  id: string;
  title: string;
  content_html: string;
  created_at: string;
  updated_at: string;
}

// react-quill 기본 타입
export interface ReactQuillProps {
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  formats?: string[];
  theme?: string;
  placeholder?: string;
}

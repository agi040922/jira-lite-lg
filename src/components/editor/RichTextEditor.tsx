'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { sanitizeFilename } from '@/utils/sanitizeFilename';
import 'react-quill-new/dist/quill.snow.css';

// react-quill-new를 dynamic import로 불러와서 SSR 이슈 해결
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Rich Text Editor 컴포넌트
 * - react-quill 기반
 * - 이미지 업로드 기능 (Supabase Storage)
 * - 클립보드 이미지 붙여넣기 (Ctrl+V)
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
}: RichTextEditorProps) {
  const quillRef = useRef<any>(null);
  const supabase = createClient();

  /**
   * 이미지를 Supabase Storage에 업로드
   * @param file 업로드할 파일
   * @returns 업로드된 이미지의 Public URL
   */
  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        // 한글 파일명 처리
        const sanitizedName = sanitizeFilename(file.name);
        const filePath = `${Date.now()}-${sanitizedName}`;

        // Supabase Storage에 업로드
        const { data, error } = await supabase.storage
          .from('post-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('이미지 업로드 실패:', error);
          alert('이미지 업로드에 실패했습니다.');
          return null;
        }

        // Public URL 가져오기
        const {
          data: { publicUrl },
        } = supabase.storage.from('post-images').getPublicUrl(data.path);

        return publicUrl;
      } catch (error) {
        console.error('이미지 업로드 중 오류:', error);
        return null;
      }
    },
    [supabase]
  );

  /**
   * Quill 에디터의 이미지 핸들러 커스터마이징
   * 툴바의 이미지 버튼 클릭 시 동작
   */
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // 이미지 타입 확인
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }

      // 업로드 중 로딩 표시 (선택사항)
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true);
      editor.insertText(range.index, '업로드 중...');

      // 이미지 업로드
      const url = await uploadImage(file);

      // 로딩 텍스트 제거
      editor.deleteText(range.index, '업로드 중...'.length);

      if (url) {
        // 에디터에 이미지 삽입
        editor.insertEmbed(range.index, 'image', url);
        editor.setSelection(range.index + 1);
      }
    };
  }, [uploadImage]);

  /**
   * 클립보드에서 이미지 붙여넣기 핸들러
   * Ctrl+V로 이미지를 붙여넣으면 자동으로 업로드
   */
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 클립보드에서 이미지 찾기
      const items = Array.from(clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));

      if (!imageItem) return;

      e.preventDefault(); // 기본 붙여넣기 동작 방지

      const file = imageItem.getAsFile();
      if (!file) return;

      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true);

      // 업로드 중 로딩 표시
      editor.insertText(range.index, '이미지 업로드 중...');

      // 이미지 업로드
      const url = await uploadImage(file);

      // 로딩 텍스트 제거
      editor.deleteText(range.index, '이미지 업로드 중...'.length);

      if (url) {
        // 에디터에 이미지 삽입
        editor.insertEmbed(range.index, 'image', url);
        editor.setSelection(range.index + 1);
      }
    },
    [uploadImage]
  );

  /**
   * 에디터가 마운트될 때 클립보드 이벤트 리스너 등록
   */
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const editorElement = editor.root;
    editorElement.addEventListener('paste', handlePaste);

    return () => {
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  /**
   * Quill 에디터 모듈 설정
   * - 툴바 옵션
   * - 이미지 핸들러 커스터마이징
   */
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ color: [] }, { background: [] }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  /**
   * Quill 에디터 포맷 설정
   */
  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'color',
    'background',
    'link',
    'image',
  ];

  return (
    <div className="rich-text-editor">
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        theme="snow"
        placeholder={placeholder}
        className="h-96"
      />
    </div>
  );
}

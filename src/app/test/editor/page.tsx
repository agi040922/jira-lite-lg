'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import RichTextEditor from '@/components/editor/RichTextEditor';
import type { Post } from '@/types/editor';

/**
 * Rich Text Editor 테스트 페이지
 * - 게시글 작성 및 저장
 * - 저장된 게시글 목록 표시
 * - 게시글 HTML 미리보기
 */
export default function EditorTestPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  /**
   * 저장된 게시글 목록 불러오기
   */
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('게시글 목록 불러오기 실패:', error);
        return;
      }

      setPosts(data || []);
    } catch (error) {
      console.error('게시글 목록 불러오기 중 오류:', error);
    }
  };

  /**
   * 컴포넌트 마운트 시 게시글 목록 불러오기
   */
  useEffect(() => {
    fetchPosts();
  }, []);

  /**
   * 게시글 저장
   */
  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      alert('내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // id, created_at, updated_at은 DB에서 자동 생성되므로 제외
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          content_html: content,
        })
        .select();

      if (error) {
        console.error('게시글 저장 실패:', error);
        alert(`게시글 저장에 실패했습니다: ${error.message}`);
        return;
      }

      alert('게시글이 저장되었습니다!');

      // 폼 초기화
      setTitle('');
      setContent('');

      // 게시글 목록 새로고침
      fetchPosts();
    } catch (error) {
      console.error('게시글 저장 중 오류:', error);
      alert('게시글 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 게시글 삭제
   */
  const handleDelete = async (postId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) {
        console.error('게시글 삭제 실패:', error);
        alert('게시글 삭제에 실패했습니다.');
        return;
      }

      alert('게시글이 삭제되었습니다.');

      // 선택된 게시글이 삭제된 경우 초기화
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }

      // 게시글 목록 새로고침
      fetchPosts();
    } catch (error) {
      console.error('게시글 삭제 중 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  /**
   * 게시글 불러오기
   */
  const handleLoadPost = (post: Post) => {
    setTitle(post.title);
    setContent(post.content_html);
    setSelectedPost(null); // 미리보기 닫기
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Rich Text Editor 테스트
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 에디터 영역 */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">새 게시글 작성</h2>

              {/* 제목 입력 */}
              <div className="mb-4">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  제목
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rich Text Editor */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용
                </label>
                <div className="border border-gray-300 rounded-md">
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="내용을 입력하세요. Ctrl+V로 이미지를 붙여넣을 수 있습니다."
                  />
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>

            {/* 사용 팁 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                💡 사용 팁
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 툴바의 이미지 아이콘을 클릭하여 이미지 업로드</li>
                <li>• Ctrl+V로 클립보드의 이미지를 바로 붙여넣기</li>
                <li>• 이미지는 'post-images' 버킷에 자동 저장</li>
                <li>• 한글 파일명도 안전하게 처리됩니다</li>
              </ul>
            </div>
          </div>

          {/* 게시글 목록 및 미리보기 영역 */}
          <div className="space-y-4">
            {/* 저장된 게시글 목록 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                저장된 게시글 ({posts.length})
              </h2>

              {posts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  저장된 게시글이 없습니다.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {new Date(post.created_at).toLocaleString('ko-KR')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          미리보기
                        </button>
                        <button
                          onClick={() => handleLoadPost(post)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          불러오기
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HTML 미리보기 */}
            {selectedPost && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">HTML 미리보기</h2>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedPost.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedPost.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                {/* Quill 스타일을 적용한 HTML 렌더링 */}
                <div
                  className="prose max-w-none ql-editor"
                  dangerouslySetInnerHTML={{
                    __html: selectedPost.content_html,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

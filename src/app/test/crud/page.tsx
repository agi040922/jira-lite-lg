'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TestItem, TestItemInsert, TestItemUpdate } from '@/types/database';

/**
 * Supabase CRUD 테스트 페이지
 *
 * 주요 기능:
 * 1. Create - 새 항목 추가
 * 2. Read - 전체 항목 조회 (실시간)
 * 3. Update - 기존 항목 수정
 * 4. Delete - 항목 삭제
 */
export default function CrudTestPage() {
  // Supabase 클라이언트 생성
  const supabase = createClient();

  // 상태 관리
  const [items, setItems] = useState<TestItem[]>([]); // 전체 항목 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지

  // Create 폼 상태
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Update 폼 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  /**
   * READ - 데이터 조회 함수
   *
   * 작동 방식:
   * 1. Supabase에서 test_items 테이블의 모든 데이터 조회
   * 2. created_at 기준으로 내림차순 정렬 (최신순)
   * 3. 에러 처리 및 상태 업데이트
   */
  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('test_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setItems(data || []);
    } catch (err) {
      console.error('데이터 조회 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * CREATE - 새 항목 추가 함수
   *
   * 작동 방식:
   * 1. 입력값 검증 (name은 필수)
   * 2. Supabase에 새 데이터 INSERT
   * 3. 성공 시 폼 초기화 및 목록 새로고침
   */
  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!newName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    try {
      setError(null);

      const newItem: TestItemInsert = {
        name: newName.trim(),
        description: newDescription.trim() || null,
      };

      const { error: insertError } = await supabase
        .from('test_items')
        .insert(newItem);

      if (insertError) throw insertError;

      // 성공 시 폼 초기화
      setNewName('');
      setNewDescription('');

      // 목록 새로고침 (실시간 구독이 있어도 명시적으로 호출)
      await fetchItems();
    } catch (err) {
      console.error('항목 추가 실패:', err);
      setError(err instanceof Error ? err.message : '항목 추가에 실패했습니다.');
    }
  };

  /**
   * UPDATE - 항목 수정 함수
   *
   * 작동 방식:
   * 1. 수정할 항목의 ID로 데이터 찾기
   * 2. 변경된 데이터만 UPDATE
   * 3. 성공 시 수정 모드 종료 및 목록 새로고침
   */
  const updateItem = async () => {
    if (!editingId) return;

    try {
      setError(null);

      const updates: TestItemUpdate = {
        name: editName.trim(),
        description: editDescription.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('test_items')
        .update(updates)
        .eq('id', editingId);

      if (updateError) throw updateError;

      // 수정 모드 종료
      setEditingId(null);
      setEditName('');
      setEditDescription('');

      // 목록 새로고침
      await fetchItems();
    } catch (err) {
      console.error('항목 수정 실패:', err);
      setError(err instanceof Error ? err.message : '항목 수정에 실패했습니다.');
    }
  };

  /**
   * DELETE - 항목 삭제 함수
   *
   * 작동 방식:
   * 1. 사용자에게 삭제 확인 요청
   * 2. ID로 해당 항목 DELETE
   * 3. 성공 시 목록 새로고침
   */
  const deleteItem = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('test_items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // 목록 새로고침
      await fetchItems();
    } catch (err) {
      console.error('항목 삭제 실패:', err);
      setError(err instanceof Error ? err.message : '항목 삭제에 실패했습니다.');
    }
  };

  /**
   * 수정 모드 시작 함수
   *
   * 현재 항목의 데이터를 수정 폼에 채워넣기
   */
  const startEditing = (item: TestItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description || '');
  };

  /**
   * 수정 모드 취소 함수
   */
  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  /**
   * 실시간 구독 설정 (useEffect)
   *
   * 작동 방식:
   * 1. 컴포넌트 마운트 시 초기 데이터 조회
   * 2. Supabase Realtime으로 test_items 테이블의 변경사항 구독
   * 3. INSERT, UPDATE, DELETE 이벤트 발생 시 자동으로 목록 새로고침
   * 4. 컴포넌트 언마운트 시 구독 해제
   */
  useEffect(() => {
    // 초기 데이터 로드
    fetchItems();

    // 실시간 구독 설정
    const channel = supabase
      .channel('test_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 모든 이벤트 (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'test_items',
        },
        (payload) => {
          console.log('실시간 변경 감지:', payload);
          // 변경사항 발생 시 데이터 새로고침
          fetchItems();
        }
      )
      .subscribe();

    // 클린업: 컴포넌트 언마운트 시 구독 해제
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Supabase CRUD 테스트 페이지
        </h1>

        {/* 에러 메시지 표시 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* CREATE 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            새 항목 추가 (Create)
          </h2>
          <form onSubmit={createItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="항목 이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="항목 설명을 입력하세요 (선택사항)"
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              추가하기
            </button>
          </form>
        </div>

        {/* READ - 항목 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            항목 목록 (Read - 실시간)
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              데이터를 불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              항목이 없습니다. 위에서 새 항목을 추가해보세요!
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* 수정 모드가 아닐 때 */}
                  {editingId !== item.id ? (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {item.description || '설명 없음'}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            생성일: {new Date(item.created_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {/* UPDATE 버튼 */}
                          <button
                            onClick={() => startEditing(item)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          >
                            수정
                          </button>
                          {/* DELETE 버튼 */}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* 수정 모드일 때 */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          이름
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          설명
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={updateItem}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">사용 방법</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 위 폼에서 새 항목을 추가할 수 있습니다 (Create)</li>
            <li>• 추가된 항목은 자동으로 실시간 업데이트됩니다 (Read)</li>
            <li>• 각 항목의 &quot;수정&quot; 버튼으로 내용을 변경할 수 있습니다 (Update)</li>
            <li>• &quot;삭제&quot; 버튼으로 항목을 제거할 수 있습니다 (Delete)</li>
          </ul>
        </div>

        {/* 데이터베이스 설정 안내 */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">데이터베이스 테이블 생성 필요</h3>
          <p className="text-sm text-yellow-800 mb-2">
            이 페이지를 사용하려면 Supabase에서 다음 SQL을 실행해주세요:
          </p>
          <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`CREATE TABLE test_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime을 위한 설정
ALTER PUBLICATION supabase_realtime ADD TABLE test_items;`}
          </pre>
        </div>
      </div>
    </div>
  );
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, RotateCcw, X, Plus, Archive } from 'lucide-react'

/**
 * Document 타입 정의
 * - id: 문서 고유 ID
 * - name: 문서 이름
 * - content: 문서 내용
 * - deleted_at: 삭제 시간 (null이면 활성 상태)
 * - created_at: 생성 시간
 */
type Document = {
  id: string
  name: string
  content: string
  deleted_at: string | null
  created_at: string
}

export default function SoftDeletePage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [showDeleted, setShowDeleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newDoc, setNewDoc] = useState({ name: '', content: '' })
  const supabase = createClient()

  /**
   * 문서 목록 불러오기
   * - showDeleted가 false면 활성 문서만 (deleted_at이 null)
   * - showDeleted가 true면 삭제된 문서만 (deleted_at이 not null)
   */
  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      // deleted_at 필터링
      if (showDeleted) {
        // 삭제된 항목만 보기
        query.not('deleted_at', 'is', null)
      } else {
        // 활성 항목만 보기
        query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('문서 불러오기 실패:', error)
      alert('문서를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 새 문서 생성
   */
  const createDocument = async () => {
    if (!newDoc.name.trim() || !newDoc.content.trim()) {
      alert('이름과 내용을 모두 입력해주세요.')
      return
    }

    try {
      const { error } = await supabase
        .from('documents')
        .insert([
          {
            name: newDoc.name,
            content: newDoc.content,
            deleted_at: null, // 생성 시 활성 상태
          },
        ])

      if (error) throw error

      setNewDoc({ name: '', content: '' })
      fetchDocuments()
    } catch (error) {
      console.error('문서 생성 실패:', error)
      alert('문서 생성에 실패했습니다.')
    }
  }

  /**
   * Soft Delete (일반 삭제)
   * - deleted_at에 현재 시간을 저장
   * - 실제로 데이터는 삭제되지 않음
   */
  const softDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      fetchDocuments()
    } catch (error) {
      console.error('Soft Delete 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  /**
   * 문서 복구
   * - deleted_at을 null로 변경
   * - 다시 활성 상태로 전환
   */
  const restore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: null })
        .eq('id', id)

      if (error) throw error
      fetchDocuments()
    } catch (error) {
      console.error('복구 실패:', error)
      alert('복구에 실패했습니다.')
    }
  }

  /**
   * 영구 삭제 (Hard Delete)
   * - 실제로 데이터베이스에서 DELETE
   * - 복구 불가능
   */
  const hardDelete = async (id: string) => {
    if (!confirm('정말로 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      const { error } = await supabase.from('documents').delete().eq('id', id)

      if (error) throw error
      fetchDocuments()
    } catch (error) {
      console.error('영구 삭제 실패:', error)
      alert('영구 삭제에 실패했습니다.')
    }
  }

  // 컴포넌트 마운트 시 또는 showDeleted 변경 시 문서 불러오기
  useEffect(() => {
    fetchDocuments()
  }, [showDeleted])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Soft Delete 패턴 데모
          </h1>
          <p className="text-gray-600">
            삭제된 항목을 완전히 제거하지 않고 복구 가능하게 관리하는 패턴입니다.
          </p>
        </div>

        {/* 뷰 전환 버튼 */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowDeleted(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !showDeleted
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            활성 문서
          </button>
          <button
            onClick={() => setShowDeleted(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showDeleted
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Archive size={18} />
            삭제함
          </button>
        </div>

        {/* 문서 생성 폼 (활성 문서 뷰에서만 표시) */}
        {!showDeleted && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">새 문서 만들기</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="문서 이름"
                value={newDoc.name}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                placeholder="문서 내용"
                value={newDoc.content}
                onChange={(e) =>
                  setNewDoc({ ...newDoc, content: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={createDocument}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                문서 만들기
              </button>
            </div>
          </div>
        )}

        {/* 문서 목록 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              {showDeleted ? '삭제된 문서' : '활성 문서'}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              로딩 중...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {showDeleted
                ? '삭제된 문서가 없습니다.'
                : '문서가 없습니다. 새 문서를 만들어보세요.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {doc.name}
                      </h3>
                      <p className="text-gray-600 mb-3">{doc.content}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>
                          생성일:{' '}
                          {new Date(doc.created_at).toLocaleString('ko-KR')}
                        </span>
                        {doc.deleted_at && (
                          <span className="text-red-600">
                            삭제일:{' '}
                            {new Date(doc.deleted_at).toLocaleString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 ml-4">
                      {showDeleted ? (
                        // 삭제된 문서: 복구 및 영구 삭제 버튼
                        <>
                          <button
                            onClick={() => restore(doc.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="복구"
                          >
                            <RotateCcw size={20} />
                          </button>
                          <button
                            onClick={() => hardDelete(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="영구 삭제"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        // 활성 문서: Soft Delete 버튼
                        <button
                          onClick={() => softDelete(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 설명 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Soft Delete 패턴이란?
          </h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>
              <strong>일반 삭제:</strong> deleted_at 컬럼에 현재 시간을 저장하여
              "삭제됨" 상태로 표시
            </li>
            <li>
              <strong>복구:</strong> deleted_at을 null로 변경하여 다시 활성 상태로
              전환
            </li>
            <li>
              <strong>영구 삭제:</strong> 실제 DELETE 쿼리를 실행하여 데이터베이스에서
              완전히 제거
            </li>
            <li>
              <strong>필터링:</strong> 기본 뷰에서는 deleted_at이 null인 항목만 표시
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

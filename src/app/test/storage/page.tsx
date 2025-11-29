'use client'

/**
 * Supabase Storage 테스트 페이지
 *
 * 주요 기능:
 * 1. 버킷 이름 입력 및 버킷 정보 조회
 * 2. 파일 업로드 (한글 파일명 자동 변환)
 * 3. 업로드된 파일 목록 표시
 * 4. 이미지 파일 미리보기
 * 5. 파일 다운로드
 * 6. 파일 삭제
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sanitizeFilename } from '@/utils/hangul'
import { Upload, Download, Trash2, Image as ImageIcon, File, RefreshCw } from 'lucide-react'

// 파일 정보 타입 정의
interface FileObject {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: {
    eTag: string
    size: number
    mimetype: string
    cacheControl: string
  }
}

export default function StorageTestPage() {
  // Supabase 클라이언트 초기화
  const supabase = createClient()

  // 상태 관리
  const [bucketName, setBucketName] = useState('')
  const [currentBucket, setCurrentBucket] = useState('')
  const [files, setFiles] = useState<FileObject[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({})

  /**
   * 버킷의 파일 목록을 가져오는 함수
   *
   * 왜 이렇게 작성했는지:
   * - list() 메서드는 버킷의 모든 파일을 가져옵니다
   * - limit을 100으로 설정하여 최대 100개까지 가져옵니다
   * - sortBy를 사용하여 최신 파일이 먼저 표시되도록 정렬합니다
   */
  const fetchFiles = async (bucket: string) => {
    if (!bucket) return

    setLoading(true)
    setError('')

    try {
      // 버킷에서 파일 목록 조회
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        throw error
      }

      setFiles((data || []) as any)
      setCurrentBucket(bucket)

      // 이미지 파일의 미리보기 URL 생성
      if (data) {
        const urls: { [key: string]: string } = {}
        for (const file of data) {
          if (file.metadata?.mimetype?.startsWith('image/')) {
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(file.name)
            urls[file.name] = urlData.publicUrl
          }
        }
        setPreviewUrls(urls)
      }
    } catch (err) {
      console.error('파일 목록 조회 오류:', err)
      setError(err instanceof Error ? err.message : '파일 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 파일 업로드 처리 함수
   *
   * 왜 이렇게 작성했는지:
   * 1. sanitizeFilename()으로 한글 파일명을 안전하게 변환
   * 2. 타임스탬프를 추가하여 파일명 충돌 방지
   * 3. upsert: true로 설정하여 동일한 이름의 파일이 있으면 덮어쓰기
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentBucket) return

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // 원본 파일명
      const originalFilename = file.name

      // 한글 파일명을 영문으로 변환
      const sanitizedFilename = sanitizeFilename(originalFilename)

      // 타임스탬프 추가 (파일명 충돌 방지)
      const timestamp = Date.now()
      const extension = sanitizedFilename.split('.').pop()
      const nameWithoutExt = sanitizedFilename.replace(`.${extension}`, '')
      const finalFilename = `${nameWithoutExt}_${timestamp}.${extension}`

      console.log('원본 파일명:', originalFilename)
      console.log('변환된 파일명:', finalFilename)

      // 파일 업로드
      const { data, error } = await supabase.storage
        .from(currentBucket)
        .upload(finalFilename, file, {
          cacheControl: '3600',
          upsert: false // 중복 파일 방지
        })

      if (error) {
        throw error
      }

      setSuccess(`파일이 성공적으로 업로드되었습니다: ${finalFilename}`)

      // 파일 목록 새로고침
      await fetchFiles(currentBucket)
    } catch (err) {
      console.error('파일 업로드 오류:', err)
      setError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      // 파일 입력 초기화
      e.target.value = ''
    }
  }

  /**
   * 파일 다운로드 함수
   *
   * 왜 이렇게 작성했는지:
   * 1. download() 메서드로 파일 데이터를 Blob으로 받아옵니다
   * 2. Blob을 URL로 변환하여 다운로드 링크를 생성합니다
   * 3. 임시로 <a> 태그를 만들어 클릭 이벤트를 발생시켜 다운로드합니다
   * 4. 사용 후 URL을 해제하여 메모리 누수를 방지합니다
   */
  const handleDownload = async (filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(currentBucket)
        .download(filename)

      if (error) {
        throw error
      }

      // Blob을 다운로드 가능한 URL로 변환
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess(`파일을 다운로드했습니다: ${filename}`)
    } catch (err) {
      console.error('다운로드 오류:', err)
      setError(err instanceof Error ? err.message : '파일 다운로드에 실패했습니다.')
    }
  }

  /**
   * 파일 삭제 함수
   *
   * 왜 이렇게 작성했는지:
   * 1. remove() 메서드는 배열을 받아 여러 파일을 한 번에 삭제할 수 있습니다
   * 2. 삭제 전 확인 창을 띄워 실수로 삭제하는 것을 방지합니다
   * 3. 삭제 후 파일 목록을 새로고침합니다
   */
  const handleDelete = async (filename: string) => {
    if (!confirm(`정말로 "${filename}" 파일을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const { error } = await supabase.storage
        .from(currentBucket)
        .remove([filename])

      if (error) {
        throw error
      }

      setSuccess(`파일이 삭제되었습니다: ${filename}`)

      // 파일 목록 새로고침
      await fetchFiles(currentBucket)
    } catch (err) {
      console.error('삭제 오류:', err)
      setError(err instanceof Error ? err.message : '파일 삭제에 실패했습니다.')
    }
  }

  /**
   * 파일 크기를 읽기 좋은 형식으로 변환하는 함수
   *
   * 예시: 1024 => '1 KB', 1048576 => '1 MB'
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * 날짜를 읽기 좋은 형식으로 변환하는 함수
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Supabase Storage 테스트
          </h1>
          <p className="text-gray-600">
            버킷에 파일을 업로드하고 관리할 수 있습니다. 한글 파일명은 자동으로 영문으로 변환됩니다.
          </p>
        </div>

        {/* 버킷 입력 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">버킷 선택</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="버킷 이름을 입력하세요 (예: avatars)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => fetchFiles(bucketName)}
              disabled={!bucketName || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  로딩 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  버킷 열기
                </>
              )}
            </button>
          </div>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* 파일 업로드 섹션 */}
        {currentBucket && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              파일 업로드 <span className="text-gray-500 text-sm font-normal">(버킷: {currentBucket})</span>
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">
                    {uploading ? '업로드 중...' : '파일 선택'}
                  </span>
                </div>
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 한글 파일명은 자동으로 영문으로 변환됩니다. (예: "내파일.pdf" → "naepail_1234567890.pdf")
            </p>
          </div>
        )}

        {/* 파일 목록 섹션 */}
        {currentBucket && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                파일 목록 <span className="text-gray-500 text-sm font-normal">({files.length}개)</span>
              </h2>
              <button
                onClick={() => fetchFiles(currentBucket)}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>업로드된 파일이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => {
                  const isImage = file.metadata?.mimetype?.startsWith('image/')
                  const previewUrl = previewUrls[file.name]

                  return (
                    <div
                      key={file.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                    >
                      {/* 미리보기 또는 파일 아이콘 */}
                      <div className="mb-3 bg-gray-50 rounded-lg overflow-hidden">
                        {isImage && previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center">
                            <File className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* 파일 정보 */}
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </h3>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>크기: {formatFileSize(file.metadata.size)}</p>
                          <p>타입: {file.metadata.mimetype || 'Unknown'}</p>
                          <p>업로드: {formatDate(file.created_at)}</p>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleDownload(file.name)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 text-sm"
                          >
                            <Download className="w-4 h-4" />
                            다운로드
                          </button>
                          <button
                            onClick={() => handleDelete(file.name)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

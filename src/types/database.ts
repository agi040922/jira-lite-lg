// Supabase 데이터베이스 테이블 타입 정의

/**
 * test_items 테이블의 Row 타입
 * - 데이터베이스에서 조회할 때 받는 데이터 형태
 */
export interface TestItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

/**
 * test_items 테이블에 INSERT할 때 사용하는 타입
 * - id와 created_at은 자동 생성되므로 제외
 */
export interface TestItemInsert {
  name: string;
  description?: string | null;
}

/**
 * test_items 테이블을 UPDATE할 때 사용하는 타입
 * - 모든 필드가 선택적(optional)
 */
export interface TestItemUpdate {
  name?: string;
  description?: string | null;
}

/**
 * Database 타입
 * - Supabase 클라이언트의 타입 안정성을 위한 전체 스키마 정의
 */
export interface Database {
  public: {
    Tables: {
      test_items: {
        Row: TestItem;
        Insert: TestItemInsert;
        Update: TestItemUpdate;
      };
    };
  };
}

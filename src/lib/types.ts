// ============================================
// 共享类型定义
// ============================================

export type Difficulty = "easy" | "medium" | "hard";

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  answer: string;
  category_id: string | null;
  difficulty: Difficulty;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithRelations extends Question {
  category?: Category | null;
  tags?: Tag[];
  user_state?: UserQuestionState | null;
}

export interface UserQuestionState {
  id: string;
  question_id: string;
  is_favorite: boolean;
  is_mastered: boolean;
  reviewed_at: string | null;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatsResponse {
  total_questions: number;
  mastered_count: number;
  favorite_count: number;
  by_category: {
    category_id: string;
    category_name: string;
    count: number;
  }[];
  by_difficulty: {
    difficulty: Difficulty;
    count: number;
  }[];
}

export interface QuestionFormData {
  title: string;
  content: string;
  answer: string;
  category_id: string | null;
  difficulty: Difficulty;
  source: string;
  tag_ids: string[];
}

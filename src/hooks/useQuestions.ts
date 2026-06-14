"use client";

import { useState, useEffect, useCallback } from "react";
import { QuestionWithRelations, PaginatedResponse } from "@/lib/types";

interface UseQuestionsParams {
  search?: string;
  category?: string;
  difficulty?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export function useQuestions(params: UseQuestionsParams = {}) {
  const [data, setData] = useState<PaginatedResponse<QuestionWithRelations> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      if (params.category) searchParams.set("category", params.category);
      if (params.difficulty) searchParams.set("difficulty", params.difficulty);
      if (params.tag) searchParams.set("tag", params.tag);
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));

      const res = await fetch(`/api/questions?${searchParams.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "请求失败");
      } else {
        setData(json);
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [params.search, params.category, params.difficulty, params.tag, params.page, params.limit]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return { data, loading, error, refetch: fetchQuestions };
}

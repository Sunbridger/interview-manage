"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ============================================
// Types
// ============================================
export interface Annotation {
  id: string;
  question_id: string;
  block_id: string;       // 对应段落的 data-block-id
  content: string;        // 批注内容
  created_at: string;     // ISO 时间戳
  updated_at: string;
}

interface AnnotationState {
  annotations: Annotation[];
  activeAnnotationId: string | null;
  loading: boolean;
}

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD"; payload: Annotation[] }
  | { type: "ADD"; payload: Annotation }
  | { type: "UPDATE"; payload: { id: string; content: string } }
  | { type: "DELETE"; payload: string }
  | { type: "SET_ACTIVE"; payload: string | null };

// ============================================
// Reducer
// ============================================
function reducer(state: AnnotationState, action: Action): AnnotationState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true };
    case "LOAD":
      return { ...state, annotations: action.payload, loading: false };
    case "ADD":
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        activeAnnotationId: action.payload.id,
      };
    case "UPDATE":
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id
            ? { ...a, content: action.payload.content, updated_at: new Date().toISOString() }
            : a
        ),
      };
    case "DELETE":
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        activeAnnotationId:
          state.activeAnnotationId === action.payload ? null : state.activeAnnotationId,
      };
    case "SET_ACTIVE":
      return { ...state, activeAnnotationId: action.payload };
    default:
      return state;
  }
}

// ============================================
// Context
// ============================================
interface AnnotationContextValue {
  state: AnnotationState;
  addAnnotation: (blockId: string, content: string) => Promise<void>;
  updateAnnotation: (id: string, content: string) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  setActiveAnnotation: (id: string | null) => void;
  getAnnotationsForBlock: (blockId: string) => Annotation[];
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

// ============================================
// Provider
// ============================================
export function AnnotationProvider({
  questionId,
  children,
}: {
  questionId: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    annotations: [],
    activeAnnotationId: null,
    loading: true,
  });

  // 从服务端加载批注
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "LOAD_START" });
    fetch(`/api/annotations?questionId=${questionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          // 适配数据库字段名 → 前端字段名
          const mapped: Annotation[] = data.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            question_id: item.question_id as string,
            block_id: (item.block_id || item.blockId) as string,
            content: item.content as string,
            created_at: (item.created_at || item.createdAt) as string,
            updated_at: (item.updated_at || item.updatedAt) as string,
          }));
          dispatch({ type: "LOAD", payload: mapped });
        } else if (!cancelled) {
          dispatch({ type: "LOAD", payload: [] });
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "LOAD", payload: [] });
      });
    return () => { cancelled = true; };
  }, [questionId]);

  const addAnnotation = useCallback(
    async (blockId: string, content: string) => {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, block_id: blockId, content }),
      });
      if (res.ok) {
        const data = await res.json();
        dispatch({
          type: "ADD",
          payload: {
            id: data.id,
            question_id: questionId,
            block_id: blockId,
            content,
            created_at: data.created_at,
            updated_at: data.updated_at,
          },
        });
      }
    },
    [questionId]
  );

  const updateAnnotation = useCallback(async (id: string, content: string) => {
    const res = await fetch(`/api/annotations?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      dispatch({ type: "UPDATE", payload: { id, content } });
    }
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    const res = await fetch(`/api/annotations?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      dispatch({ type: "DELETE", payload: id });
    }
  }, []);

  const setActiveAnnotation = useCallback((id: string | null) => {
    dispatch({ type: "SET_ACTIVE", payload: id });
  }, []);

  const getAnnotationsForBlock = useCallback(
    (blockId: string) => {
      return state.annotations.filter((a) => a.block_id === blockId);
    },
    [state.annotations]
  );

  return (
    <AnnotationContext.Provider
      value={{
        state,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        setActiveAnnotation,
        getAnnotationsForBlock,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotations() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) {
    throw new Error("useAnnotations must be used within AnnotationProvider");
  }
  return ctx;
}

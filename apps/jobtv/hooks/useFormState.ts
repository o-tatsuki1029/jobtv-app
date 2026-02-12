import { useState, useCallback } from "react";

export interface UseFormStateOptions {
  initialFieldErrors?: Record<string, string>;
}

export interface UseFormStateReturn {
  loading: boolean;
  saving: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setFieldError: (field: string, error: string | undefined) => void;
  setFieldErrors: (errors: Record<string, string>) => void;
  clearFieldErrors: () => void;
  clearAllErrors: () => void;
}

/**
 * フォーム状態管理用のカスタムフック
 * loading, saving, error, fieldErrorsを共通化
 */
export function useFormState(options: UseFormStateOptions = {}): UseFormStateReturn {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(options.initialFieldErrors || {});

  const setFieldError = useCallback((field: string, error: string | undefined) => {
    setFieldErrors((prev) => {
      if (error === undefined) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: error };
    });
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const clearAllErrors = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return {
    loading,
    saving,
    error,
    fieldErrors,
    setLoading,
    setSaving,
    setError,
    setFieldError,
    setFieldErrors,
    clearFieldErrors,
    clearAllErrors
  };
}


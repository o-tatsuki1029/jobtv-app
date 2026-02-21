import { useState, useEffect } from "react";
import { supabaseInsert, supabaseUpdate } from "@/lib/actions/supabase-actions";
import type { Candidate, CandidateFormDataWithEmail } from "@/types/candidate.types";
import { isKatakana } from "@/utils/validation/index";

type UseCandidateFormProps = {
  initialData?: Candidate;
  onSuccess?: () => void;
};

const initialFormState: CandidateFormDataWithEmail = {
  first_name: "",
  first_name_kana: "",
  last_name: "",
  last_name_kana: "",
  email: "",
  phone: "",
  gender: "",
  graduation_year: 0,
  school_name: "",
  major_field: null,
  school_type: null,
  entry_channel: null,
  referrer: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
};

type ValidationErrors = {
  [key in keyof CandidateFormDataWithEmail]?: string;
};


export function useCandidateForm({ initialData, onSuccess }: UseCandidateFormProps) {
  const [form, setForm] = useState<CandidateFormDataWithEmail>(initialFormState);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const isEditMode = !!initialData?.id;

  // フォーム初期化（initialData は CandidateWithEmail のこともある）
  useEffect(() => {
    if (initialData) {
      const dataWithEmail = initialData as Candidate & { email?: string | null };
      setForm({
        first_name: initialData.first_name || "",
        first_name_kana: initialData.first_name_kana || "",
        last_name: initialData.last_name || "",
        last_name_kana: initialData.last_name_kana || "",
        email: dataWithEmail.email ?? "",
        phone: initialData.phone || "",
        gender: initialData.gender || "",
        graduation_year: initialData.graduation_year || 0,
        school_name: initialData.school_name || "",
        major_field: initialData.major_field || null,
        school_type: initialData.school_type || null,
        entry_channel: initialData.entry_channel || null,
        referrer: initialData.referrer || null,
        utm_source: initialData.utm_source || null,
        utm_medium: initialData.utm_medium || null,
        utm_campaign: initialData.utm_campaign || null,
        utm_term: initialData.utm_term || null,
        utm_content: initialData.utm_content || null,
      });
    } else {
      setForm(initialFormState);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // カナフィールドの場合はカタカナのみ許可
    if (name === "first_name_kana" || name === "last_name_kana") {
      // カタカナ以外の文字が含まれている場合はエラー
      if (value && !isKatakana(value)) {
        setErrors((prev) => ({
          ...prev,
          [name]: "カタカナで入力してください",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name as keyof ValidationErrors];
          return newErrors;
        });
      }
      
      // 値をフォームに設定（変換なし）
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "graduation_year"
          ? Number(value)
          : (name === "major_field" ||
             name === "school_type" ||
             name === "entry_channel" ||
             name === "referrer" ||
             name === "utm_source" ||
             name === "utm_medium" ||
             name === "utm_campaign" ||
             name === "utm_term" ||
             name === "utm_content") && value === ""
          ? null
          : value,
    }));
  };

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    // 必須チェック
    if (!form.last_name || !form.last_name.trim()) {
      newErrors.last_name = "姓は必須です";
    }
    if (!form.first_name || !form.first_name.trim()) {
      newErrors.first_name = "名は必須です";
    }
    if (!form.last_name_kana || !form.last_name_kana.trim()) {
      newErrors.last_name_kana = "姓（カナ）は必須です";
    } else if (!isKatakana(form.last_name_kana || "")) {
      newErrors.last_name_kana = "カタカナで入力してください";
    }
    if (!form.first_name_kana || !form.first_name_kana.trim()) {
      newErrors.first_name_kana = "名（カナ）は必須です";
    } else if (!isKatakana(form.first_name_kana || "")) {
      newErrors.first_name_kana = "カタカナで入力してください";
    }
    if (!form.email || !form.email.trim()) {
      newErrors.email = "メールアドレスは必須です";
    }
    if (!form.phone || !form.phone.trim()) {
      newErrors.phone = "電話番号は必須です";
    }
    if (!form.gender) {
      newErrors.gender = "性別は必須です";
    }
    if (!form.graduation_year || form.graduation_year === 0) {
      newErrors.graduation_year = "卒業年度は必須です";
    }
    if (!form.school_name || !form.school_name.trim()) {
      newErrors.school_name = "学校名は必須です";
    }
    if (!form.major_field) {
      newErrors.major_field = "文理は必須です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!validate()) {
      setStatus("入力内容を確認してください");
      return;
    }

    setIsSubmitting(true);
    setStatus("送信中...");

    try {
      if (isEditMode && initialData?.id) {
        const { email: _email, ...candidateFields } = form;
        const updateData = {
          ...candidateFields,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabaseUpdate("candidates", updateData, {
          id: initialData.id,
        });

        if (error) {
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? String((error as { message: string }).message)
              : "エラーが発生しました";
          setStatus("エラー: " + errorMessage);
        } else {
          setStatus("更新しました！");
          onSuccess?.();
        }
      } else {
        const { email: _email, ...candidateFields } = form;
        const { data, error } = await supabaseInsert("candidates", candidateFields);

        if (error) {
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? String((error as { message: string }).message)
              : "エラーが発生しました";
          setStatus("エラー: " + errorMessage);
        } else {
          setStatus("登録しました！ID: " + data?.id);
          setForm(initialFormState);
          onSuccess?.();
        }
      }
    } catch {
      setStatus("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    status,
    isSubmitting,
    isEditMode,
    errors,
    handleChange,
    handleSubmit,
  };
}

// 後方互換性のため、useJobSeekerFormもエクスポート（非推奨）
/** @deprecated Use useCandidateForm instead */
export const useJobSeekerForm = useCandidateForm;


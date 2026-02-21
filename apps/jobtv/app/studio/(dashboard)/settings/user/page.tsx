"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Save,
} from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import { createClient } from "@/lib/supabase/client";

export default function UserSettingsPage() {
  const [profile, setProfile] = useState<{
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
    email: string;
  }>({
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // バリデーション状態
  const [lastNameKanaValid, setLastNameKanaValid] = useState(true);
  const [firstNameKanaValid, setFirstNameKanaValid] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setProfile({
            last_name: profile.last_name || "",
            first_name: profile.first_name || "",
            last_name_kana: profile.last_name_kana || "",
            first_name_kana: profile.first_name_kana || "",
            email: user.email || "",
          });
        }
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザーが見つかりません");

      const { error } = await supabase
        .from("profiles")
        .update({
          last_name: profile.last_name,
          first_name: profile.first_name,
          last_name_kana: profile.last_name_kana,
          first_name_kana: profile.first_name_kana,
        })
        .eq("id", user.id);

      if (error) throw error;
      setMessage({ type: "success", text: "設定を保存しました" });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-lg">ユーザー設定</h2>
          </div>
          <p className="text-sm text-gray-600">現在ログイン中のユーザーの設定を変更できます。</p>
        </div>
        <div className="p-8 space-y-6">
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              <p className="text-sm font-bold">{message.text}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StudioFormField
              label="姓"
              name="last_name"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              required
            />
            <StudioFormField
              label="名"
              name="first_name"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              required
            />
                  <StudioFormField
                    label="姓（カナ）"
                    name="last_name_kana"
                    value={profile.last_name_kana}
                    onChange={(e) => setProfile({ ...profile, last_name_kana: e.target.value })}
                    placeholder="ヤマダ"
                    required
                    validateKatakana={true}
                    onValidationChange={setLastNameKanaValid}
                  />
                  <StudioFormField
                    label="名（カナ）"
                    name="first_name_kana"
                    value={profile.first_name_kana}
                    onChange={(e) => setProfile({ ...profile, first_name_kana: e.target.value })}
                    placeholder="タロウ"
                    required
                    validateKatakana={true}
                    onValidationChange={setFirstNameKanaValid}
                  />
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700">メールアドレス</label>
              <p className="text-base text-gray-900 font-medium">
                {profile.email}
              </p>
              <p className="text-xs text-gray-500">メールアドレスは変更できません</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <StudioButton
              onClick={handleSave}
              disabled={isSaving || !lastNameKanaValid || !firstNameKanaValid}
              icon={isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
            >
              設定を保存
            </StudioButton>
          </div>
        </div>
      </div>
    </div>
  );
}


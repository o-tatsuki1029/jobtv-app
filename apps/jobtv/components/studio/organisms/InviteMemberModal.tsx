"use client";

import React, { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";
import StudioButton from "../atoms/StudioButton";
import StudioFormField from "../molecules/StudioFormField";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    firstName: string,
    lastName: string,
    firstNameKana: string,
    lastNameKana: string
  ) => Promise<void>;
  isInviting: boolean;
}

export default function InviteMemberModal({ isOpen, onClose, onInvite, isInviting }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameKana, setFirstNameKana] = useState("");
  const [lastNameKana, setLastNameKana] = useState("");
  const [error, setError] = useState<string | null>(null);

  // バリデーション状態
  const [lastNameKanaValid, setLastNameKanaValid] = useState(true);
  const [firstNameKanaValid, setFirstNameKanaValid] = useState(true);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isInviting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isInviting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (!email || !firstName || !lastName || !firstNameKana || !lastNameKana) {
      setError("全ての項目を入力してください");
      return;
    }

    if (!email.includes("@")) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    try {
      await onInvite(email, firstName, lastName, firstNameKana, lastNameKana);
      // 成功したらフォームをリセット
      setEmail("");
      setFirstName("");
      setLastName("");
      setFirstNameKana("");
      setLastNameKana("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "招待に失敗しました");
    }
  };

  const handleClose = () => {
    if (!isInviting) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setFirstNameKana("");
      setLastNameKana("");
      setError(null);
      setLastNameKanaValid(true);
      setFirstNameKanaValid(true);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* ローディングオーバーレイ */}
        {isInviting && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-bold text-gray-900">招待メール送信中...</p>
                <p className="text-sm text-gray-600">しばらくお待ちください</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          disabled={isInviting}
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">メンバーを招待</h2>
          </div>
          <p className="text-sm text-gray-600 ml-13">
            招待メールが送信されます。メンバーはメール内のリンクからアカウントを作成できます。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}

          <StudioFormField
            label="メールアドレス"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            required
            disabled={isInviting}
          />

          <div className="grid grid-cols-2 gap-4">
            <StudioFormField
              label="姓"
              name="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="山田"
              required
              disabled={isInviting}
            />

            <StudioFormField
              label="名"
              name="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="太郎"
              required
              disabled={isInviting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StudioFormField
              label="姓（カナ）"
              name="last_name_kana"
              value={lastNameKana}
              onChange={(e) => setLastNameKana(e.target.value)}
              placeholder="ヤマダ"
              required
              disabled={isInviting}
              validateKatakana={true}
              onValidationChange={setLastNameKanaValid}
            />

            <StudioFormField
              label="名（カナ）"
              name="first_name_kana"
              value={firstNameKana}
              onChange={(e) => setFirstNameKana(e.target.value)}
              placeholder="タロウ"
              required
              disabled={isInviting}
              validateKatakana={true}
              onValidationChange={setFirstNameKanaValid}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <StudioButton
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isInviting}
              className="flex-1"
            >
              キャンセル
            </StudioButton>
            <StudioButton
              type="submit"
              disabled={isInviting || !lastNameKanaValid || !firstNameKanaValid}
              className="flex-1"
            >
              招待メールを送信
            </StudioButton>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { UserCog, Plus, Trash2, Edit, Loader2, Mail } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import { getAllAdmins, createAdmin, deleteAdmin, updateAdmin } from "@/lib/actions/admin-user-actions";

interface Admin {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  first_name_kana: string | null;
  last_name_kana: string | null;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // モーダル関連
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  // フォーム入力
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameKana, setLastNameKana] = useState("");
  const [firstNameKana, setFirstNameKana] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // バリデーション状態
  const [lastNameKanaValid, setLastNameKanaValid] = useState(true);
  const [firstNameKanaValid, setFirstNameKanaValid] = useState(true);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getAllAdmins();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setAdmins(result.data);
    }
    setIsLoading(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!email || !password || !lastName || !firstName || !lastNameKana || !firstNameKana) {
      setMessage({ type: "error", text: "全ての項目を入力してください" });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setMessage({ type: "error", text: "パスワードは8文字以上で入力してください" });
      setIsSubmitting(false);
      return;
    }

    const result = await createAdmin(email, password, lastName, firstName, lastNameKana, firstNameKana);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "管理者アカウントを作成しました" });
      setIsCreateModalOpen(false);
      resetForm();
      await loadAdmins();
    }
    setIsSubmitting(false);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setIsSubmitting(true);
    setMessage(null);

    if (!lastName || !firstName || !lastNameKana || !firstNameKana) {
      setMessage({ type: "error", text: "全ての項目を入力してください" });
      setIsSubmitting(false);
      return;
    }

    const result = await updateAdmin(editingAdmin.id, lastName, firstName, lastNameKana, firstNameKana);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "管理者アカウントを更新しました" });
      setIsEditModalOpen(false);
      setEditingAdmin(null);
      resetForm();
      await loadAdmins();
    }
    setIsSubmitting(false);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("この管理者アカウントを削除しますか？この操作は取り消せません。")) {
      return;
    }

    setDeletingId(adminId);
    setMessage(null);

    const result = await deleteAdmin(adminId);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "管理者アカウントを削除しました" });
      await loadAdmins();
    }
    setDeletingId(null);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setLastName(admin.last_name || "");
    setFirstName(admin.first_name || "");
    setLastNameKana(admin.last_name_kana || "");
    setFirstNameKana(admin.first_name_kana || "");
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setLastName("");
    setFirstName("");
    setLastNameKana("");
    setFirstNameKana("");
    setLastNameKanaValid(true);
    setFirstNameKanaValid(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
    setMessage(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAdmin(null);
    resetForm();
    setMessage(null);
  };

  const getAdminName = (admin: Admin) => {
    if (admin.first_name && admin.last_name) {
      return `${admin.last_name} ${admin.first_name}`;
    }
    return admin.email;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">管理者アカウント管理</h1>
          <p className="text-gray-500 font-medium mt-1">システム管理者アカウントの作成・編集・削除を行います。</p>
        </div>
        <StudioButton icon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateModalOpen(true)}>
          管理者を追加
        </StudioButton>
      </div>

      {/* メッセージ */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* 管理者リスト */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg text-gray-900">管理者一覧</h2>
          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded">
            {admins.length}
          </span>
        </div>
        <div className="p-6">
          {admins.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">管理者アカウントがありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <UserCog className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{getAdminName(admin)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        作成日: {new Date(admin.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StudioButton
                      variant="outline"
                      icon={<Edit className="w-4 h-4" />}
                      onClick={() => openEditModal(admin)}
                    >
                      編集
                    </StudioButton>
                    <StudioButton
                      variant="outline"
                      icon={
                        deletingId === admin.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )
                      }
                      onClick={() => handleDeleteAdmin(admin.id)}
                      disabled={deletingId === admin.id}
                    >
                      削除
                    </StudioButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={closeCreateModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            )}
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">管理者を追加</h2>
              <p className="text-sm text-gray-500 mt-2">新しい管理者アカウントを作成します。</p>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-8 space-y-6">
              <StudioFormField
                label="メールアドレス"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jobtv.jp"
                required
                disabled={isSubmitting}
              />
              <StudioFormField
                label="パスワード"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                required
                disabled={isSubmitting}
              />
              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="姓"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="山田"
                  required
                  disabled={isSubmitting}
                />
                <StudioFormField
                  label="名"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="太郎"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="姓（カナ）"
                  name="lastNameKana"
                  value={lastNameKana}
                  onChange={(e) => setLastNameKana(e.target.value)}
                  placeholder="ヤマダ"
                  required
                  disabled={isSubmitting}
                  validateKatakana={true}
                  onValidationChange={setLastNameKanaValid}
                />
                <StudioFormField
                  label="名（カナ）"
                  name="firstNameKana"
                  value={firstNameKana}
                  onChange={(e) => setFirstNameKana(e.target.value)}
                  placeholder="タロウ"
                  required
                  disabled={isSubmitting}
                  validateKatakana={true}
                  onValidationChange={setFirstNameKanaValid}
                />
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <StudioButton variant="outline" onClick={closeCreateModal} disabled={isSubmitting}>
                  キャンセル
                </StudioButton>
                <StudioButton type="submit" disabled={isSubmitting || !lastNameKanaValid || !firstNameKanaValid}>
                  {isSubmitting ? "作成中..." : "作成"}
                </StudioButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {isEditModalOpen && editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={closeEditModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            )}
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">管理者を編集</h2>
              <p className="text-sm text-gray-500 mt-2">{editingAdmin.email}</p>
            </div>
            <form onSubmit={handleUpdateAdmin} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="姓"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="山田"
                  required
                  disabled={isSubmitting}
                />
                <StudioFormField
                  label="名"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="太郎"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="姓（カナ）"
                  name="lastNameKana"
                  value={lastNameKana}
                  onChange={(e) => setLastNameKana(e.target.value)}
                  placeholder="ヤマダ"
                  required
                  disabled={isSubmitting}
                  validateKatakana={true}
                  onValidationChange={setLastNameKanaValid}
                />
                <StudioFormField
                  label="名（カナ）"
                  name="firstNameKana"
                  value={firstNameKana}
                  onChange={(e) => setFirstNameKana(e.target.value)}
                  placeholder="タロウ"
                  required
                  disabled={isSubmitting}
                  validateKatakana={true}
                  onValidationChange={setFirstNameKanaValid}
                />
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <StudioButton variant="outline" onClick={closeEditModal} disabled={isSubmitting}>
                  キャンセル
                </StudioButton>
                <StudioButton type="submit" disabled={isSubmitting || !lastNameKanaValid || !firstNameKanaValid}>
                  {isSubmitting ? "更新中..." : "更新"}
                </StudioButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


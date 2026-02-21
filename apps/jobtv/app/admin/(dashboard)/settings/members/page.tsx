"use client";

import React, { useState, useEffect } from "react";
import { User, Users, Loader2, Shield } from "lucide-react";
import { getAllAdmins } from "@/lib/actions/admin-user-actions";

interface AdminUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  first_name_kana: string | null;
  last_name_kana: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
}

export default function AdminMembersSettingsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdmins = async () => {
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
    fetchAdmins();
  }, []);

  const getAdminName = (admin: AdminUser) => {
    if (admin.first_name && admin.last_name) {
      return `${admin.last_name} ${admin.first_name}`;
    }
    return admin.email || "名前未設定";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">メンバー管理</h2>
        </div>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-600 font-bold">×</span>
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-lg text-gray-900">管理者メンバー</h2>
          </div>
          <p className="text-sm text-gray-600">システム管理者の一覧を表示しています。</p>
        </div>
        <div className="p-6">
          {admins.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">管理者メンバーがいません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{getAdminName(admin)}</p>
                      <p className="text-sm text-gray-500 truncate">{admin.email || "メールアドレス未設定"}</p>
                      <p className="text-xs text-gray-400 mt-1">登録日: {formatDate(admin.created_at)}</p>
                    </div>
                    <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-purple-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-200">
                      管理者
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-900 mb-1">管理者権限について</p>
            <p className="text-xs text-blue-700">
              管理者は全ての機能にアクセスでき、企業の審査や承認、ユーザー管理などの重要な操作を行うことができます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import { User, Users, Loader2, Mail } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import InviteMemberModal from "@/components/studio/organisms/InviteMemberModal";
import { getTeamMembers, inviteTeamMember } from "@/lib/actions/team-member-actions";
import type { Tables } from "@jobtv-app/shared/types";

export default function MembersSettingsPage() {
  const [members, setMembers] = useState<Tables<"profiles">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getTeamMembers();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setMembers(result.data);
      }
      setIsLoading(false);
    };
    fetchMembers();
  }, []);

  const handleInviteMember = async (
    email: string,
    firstName: string,
    lastName: string,
    firstNameKana: string,
    lastNameKana: string
  ) => {
    setIsInviting(true);
    setError(null);
    setSuccess(null);

    const result = await inviteTeamMember(email, firstName, lastName, firstNameKana, lastNameKana);

    if (result.error) {
      setError(result.error);
      setIsInviting(false);
      throw new Error(result.error);
    } else {
      setSuccess(`${email} に招待メールを送信しました`);
      setIsInviteModalOpen(false);
      // メンバーリストを再取得
      const membersResult = await getTeamMembers();
      if (membersResult.data) {
        setMembers(membersResult.data);
      }
    }

    setIsInviting(false);
  };

  const getMemberName = (member: Tables<"profiles">) => {
    if (member.first_name && member.last_name) {
      return `${member.last_name} ${member.first_name}`;
    }
    return member.email || "名前未設定";
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

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-green-600 font-bold">✓</span>
          <p className="text-sm font-bold text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg text-gray-900">メンバー管理</h2>
            </div>
            <p className="text-sm text-gray-600">チームメンバーの招待・管理ができます。</p>
          </div>
          <StudioButton
            variant="outline"
            icon={<Mail className="w-4 h-4" />}
            onClick={() => setIsInviteModalOpen(true)}
          >
            メンバーを招待
          </StudioButton>
        </div>
        <div className="p-6">
          {members.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">チームメンバーがいません</p>
              <p className="text-sm text-gray-400 mt-2">メンバーを招待してチームに追加してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{getMemberName(member)}</p>
                      <p className="text-sm text-gray-500 truncate">{member.email || "メールアドレス未設定"}</p>
                    </div>
                    <div className="px-3 py-2 bg-gray-50 text-gray-700 text-sm font-bold rounded-lg border border-gray-200">
                      採用担当者
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteMember}
        isInviting={isInviting}
      />
    </div>
  );
}

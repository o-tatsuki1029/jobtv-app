"use client";

import HeroItemsContent from "@/components/admin/HeroItemsContent";

export default function HeroItemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ヒーロー管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          トップページのヒーローセクションに表示するスライド（サムネ・動画）を追加・編集・並び替えできます。
        </p>
      </div>
      <HeroItemsContent />
    </div>
  );
}

import { Suspense } from "react";
import { SessionsListContent } from "@/components/sessions-list-content";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">説明会管理</h1>
        <p className="text-muted-foreground">説明会情報の審査・管理</p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          </div>
        }
      >
        <SessionsListContent />
      </Suspense>
    </div>
  );
}


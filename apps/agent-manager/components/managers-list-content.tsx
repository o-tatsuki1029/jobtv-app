"use client";

import { useState, useEffect } from "react";
import { getManagers, updateManager } from "@/lib/actions/manager-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCog } from "lucide-react";
import type { Tables } from "@jobtv-app/shared/types";

type Manager = Tables<"profiles">;

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  RA: "RA",
  CA: "CA",
  MRK: "MRK",
};

export function ManagersListContent() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    first_name: string;
    last_name: string;
    role: string;
  }>({ first_name: "", last_name: "", role: "admin" });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    const { data, error } = await getManagers();

    if (error) {
      console.error("Error fetching managers:", error);
      return;
    }

    setManagers(data || []);
    setLoading(false);
  };

  const handleEdit = (manager: Manager) => {
    setEditingId(manager.id);
    setEditForm({
      first_name: manager.first_name || "",
      last_name: manager.last_name || "",
      role: manager.role || "admin",
    });
  };

  const handleSave = async (id: string) => {
    const { error } = await updateManager(id, {
      first_name: editForm.first_name || null,
      last_name: editForm.last_name || null,
      role: editForm.role,
    });

    if (error) {
      console.error("Error updating manager:", error);
      alert(`更新エラー: ${error}`);
      return;
    }

    setEditingId(null);
    fetchManagers();
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ first_name: "", last_name: "", role: "admin" });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          管理者一覧
        </CardTitle>
      </CardHeader>
      <CardContent>
        {managers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              管理者が登録されていません
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {managers.map((manager) => (
              <div key={manager.id} className="border rounded-lg p-4 space-y-4">
                {editingId === manager.id ? (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`email-${manager.id}`}>
                        メールアドレス
                      </Label>
                      <Input
                        id={`email-${manager.id}`}
                        value={manager.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`last-name-${manager.id}`}>
                        姓 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`last-name-${manager.id}`}
                        value={editForm.last_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            last_name: e.target.value,
                          })
                        }
                        placeholder="山田"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`first-name-${manager.id}`}>
                        名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`first-name-${manager.id}`}
                        value={editForm.first_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            first_name: e.target.value,
                          })
                        }
                        placeholder="太郎"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`role-${manager.id}`}>
                        ロール <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={editForm.role}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, role: value })
                        }
                      >
                        <SelectTrigger id={`role-${manager.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="RA">RA</SelectItem>
                          <SelectItem value="CA">CA</SelectItem>
                          <SelectItem value="MRK">MRK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(manager.id)}>
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {manager.last_name && manager.first_name
                          ? `${manager.last_name} ${manager.first_name}`
                          : manager.email || "不明"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {manager.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ロール:{" "}
                        {ROLE_LABELS[manager.role || ""] || manager.role}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(manager)}
                    >
                      編集
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

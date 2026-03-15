"use server";

import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";
import type { LineRichMenu } from "@/types/line-richmenu.types";

const LINE_API_BASE = "https://api.line.me";

function getToken(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null;
}

export async function listRichMenus(): Promise<{
  data: LineRichMenu[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = getToken();
  if (!token) return { data: null, error: "LINE 設定がありません" };

  try {
    const res = await fetch(`${LINE_API_BASE}/v2/bot/richmenu/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ action: "listRichMenus", status: res.status, body }, "リッチメニュー一覧取得に失敗");
      return { data: null, error: `取得に失敗しました (${res.status})` };
    }
    const json = await res.json();
    return { data: json.richmenus ?? [], error: null };
  } catch (e) {
    logger.error({ action: "listRichMenus", err: e }, "リッチメニュー一覧取得に失敗");
    return { data: null, error: "取得に失敗しました" };
  }
}

export async function createRichMenu(input: {
  name: string;
  chatBarText: string;
  sizeWidth: number;
  sizeHeight: number;
  areas: { bounds: { x: number; y: number; width: number; height: number }; action: { type: string; uri?: string; text?: string; label?: string } }[];
  selected?: boolean;
}): Promise<{ data: string | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = getToken();
  if (!token) return { data: null, error: "LINE 設定がありません" };

  try {
    const body = {
      size: { width: input.sizeWidth, height: input.sizeHeight },
      selected: input.selected ?? false,
      name: input.name,
      chatBarText: input.chatBarText,
      areas: input.areas,
    };

    const res = await fetch(`${LINE_API_BASE}/v2/bot/richmenu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ action: "createRichMenu", status: res.status, body: errBody }, "リッチメニュー作成に失敗");
      return { data: null, error: `作成に失敗しました (${res.status})` };
    }

    const json = await res.json();
    return { data: json.richMenuId, error: null };
  } catch (e) {
    logger.error({ action: "createRichMenu", err: e }, "リッチメニュー作成に失敗");
    return { data: null, error: "作成に失敗しました" };
  }
}

export async function uploadRichMenuImage(
  richMenuId: string,
  imageData: ArrayBuffer,
  contentType: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = getToken();
  if (!token) return { data: null, error: "LINE 設定がありません" };

  try {
    const res = await fetch(
      `${LINE_API_BASE}/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          Authorization: `Bearer ${token}`,
        },
        body: imageData,
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ action: "uploadRichMenuImage", status: res.status, body: errBody }, "画像アップロードに失敗");
      return { data: null, error: `画像アップロードに失敗しました (${res.status})` };
    }
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "uploadRichMenuImage", err: e }, "画像アップロードに失敗");
    return { data: null, error: "画像アップロードに失敗しました" };
  }
}

export async function deleteRichMenu(
  richMenuId: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = getToken();
  if (!token) return { data: null, error: "LINE 設定がありません" };

  try {
    const res = await fetch(`${LINE_API_BASE}/v2/bot/richmenu/${richMenuId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ action: "deleteRichMenu", status: res.status, body: errBody }, "リッチメニュー削除に失敗");
      return { data: null, error: `削除に失敗しました (${res.status})` };
    }
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "deleteRichMenu", err: e }, "リッチメニュー削除に失敗");
    return { data: null, error: "削除に失敗しました" };
  }
}

export async function setDefaultRichMenu(
  richMenuId: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = getToken();
  if (!token) return { data: null, error: "LINE 設定がありません" };

  try {
    const res = await fetch(
      `${LINE_API_BASE}/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ action: "setDefaultRichMenu", status: res.status, body: errBody }, "デフォルト設定に失敗");
      return { data: null, error: `デフォルト設定に失敗しました (${res.status})` };
    }
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "setDefaultRichMenu", err: e }, "デフォルト設定に失敗");
    return { data: null, error: "デフォルト設定に失敗しました" };
  }
}

export async function getDefaultRichMenuId(): Promise<{
  data: string | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = getToken();
  if (!token) return { data: null, error: "LINE 設定がありません" };

  try {
    const res = await fetch(`${LINE_API_BASE}/v2/bot/user/all/richmenu`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 404 means no default set
      if (res.status === 404) return { data: null, error: null };
      return { data: null, error: `取得に失敗しました (${res.status})` };
    }
    const json = await res.json();
    return { data: json.richMenuId ?? null, error: null };
  } catch (e) {
    logger.error({ action: "getDefaultRichMenuId", err: e }, "デフォルトメニュー取得に失敗");
    return { data: null, error: "取得に失敗しました" };
  }
}

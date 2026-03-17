"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LayoutGrid, RefreshCw, Trash2, Star, Plus } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioInput from "@/components/studio/atoms/StudioInput";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import type { LineRichMenu, LineRichMenuArea } from "@/types/line-richmenu.types";
import {
  listRichMenus,
  createRichMenu,
  uploadRichMenuImage,
  deleteRichMenu,
  setDefaultRichMenu,
  getDefaultRichMenuId,
} from "@/lib/actions/line-richmenu-actions";

const AREA_COLORS = [
  "rgba(6,199,85,0.35)",
  "rgba(59,130,246,0.35)",
  "rgba(239,68,68,0.35)",
  "rgba(245,158,11,0.35)",
  "rgba(139,92,246,0.35)",
  "rgba(236,72,153,0.35)",
  "rgba(20,184,166,0.35)",
  "rgba(249,115,22,0.35)",
];

type AreaEntry = {
  bounds: { x: number; y: number; width: number; height: number };
  actionType: "uri" | "message";
  value: string;
};

export default function RichMenuPage() {
  const [menus, setMenus] = useState<LineRichMenu[]>([]);
  const [defaultMenuId, setDefaultMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [chatBarText, setChatBarText] = useState("");
  const [sizeHeight, setSizeHeight] = useState<1686 | 843>(1686);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Drawing state
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BASE_WIDTH = 2500;
  const PREVIEW_MAX_WIDTH = 500;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [menusResult, defaultResult] = await Promise.all([
      listRichMenus(),
      getDefaultRichMenuId(),
    ]);
    if (menusResult.error) {
      setError(menusResult.error);
    } else {
      setMenus(menusResult.data ?? []);
    }
    if (!defaultResult.error) {
      setDefaultMenuId(defaultResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(
    async (richMenuId: string) => {
      if (!confirm("このリッチメニューを削除しますか？")) return;
      setActionLoading(richMenuId);
      const result = await deleteRichMenu(richMenuId);
      if (result.error) {
        alert(result.error);
      } else {
        await fetchData();
      }
      setActionLoading(null);
    },
    [fetchData]
  );

  const handleSetDefault = useCallback(
    async (richMenuId: string) => {
      setActionLoading(richMenuId);
      const result = await setDefaultRichMenu(richMenuId);
      if (result.error) {
        alert(result.error);
      } else {
        setDefaultMenuId(richMenuId);
      }
      setActionLoading(null);
    },
    []
  );

  const handleImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    },
    []
  );

  // Area drawing handlers
  const clientToBase = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const displayWidth = containerRef.current.offsetWidth;
      const displayHeight = containerRef.current.offsetHeight;
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const scale = BASE_WIDTH / displayWidth;
      const baseHeight = sizeHeight;
      return {
        x: Math.max(0, Math.min(BASE_WIDTH, Math.round(relX * scale))),
        y: Math.max(0, Math.min(baseHeight, Math.round(relY * scale))),
        displayX: Math.max(0, Math.min(displayWidth, relX)),
        displayY: Math.max(0, Math.min(displayHeight, relY)),
      };
    },
    [sizeHeight]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const coords = clientToBase(e.clientX, e.clientY);
      if (!coords) return;
      setDrawing(true);
      setDrawStart({ x: coords.displayX, y: coords.displayY });
      setDrawCurrent({ x: coords.displayX, y: coords.displayY });
    },
    [clientToBase]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      const coords = clientToBase(e.clientX, e.clientY);
      if (!coords) return;
      setDrawCurrent({ x: coords.displayX, y: coords.displayY });
    },
    [drawing, clientToBase]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || !drawStart || !containerRef.current) return;
      setDrawing(false);

      const coords = clientToBase(e.clientX, e.clientY);
      if (!coords) return;

      const displayWidth = containerRef.current.offsetWidth;
      const scale = BASE_WIDTH / displayWidth;

      const x1 = Math.round(Math.min(drawStart.x, coords.displayX) * scale);
      const y1 = Math.round(Math.min(drawStart.y, coords.displayY) * scale);
      const x2 = Math.round(Math.max(drawStart.x, coords.displayX) * scale);
      const y2 = Math.round(Math.max(drawStart.y, coords.displayY) * scale);

      const w = x2 - x1;
      const h = y2 - y1;

      if (w < 20 || h < 20) {
        setDrawStart(null);
        setDrawCurrent(null);
        return;
      }

      setAreas((prev) => [
        ...prev,
        {
          bounds: { x: x1, y: y1, width: w, height: h },
          actionType: "uri",
          value: "",
        },
      ]);
      setDrawStart(null);
      setDrawCurrent(null);
    },
    [drawing, drawStart, clientToBase]
  );

  const updateArea = useCallback(
    (index: number, field: "actionType" | "value", val: string) => {
      setAreas((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [field]: val } : a))
      );
    },
    []
  );

  const removeArea = useCallback((index: number) => {
    setAreas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreate = useCallback(async () => {
    setCreateError("");
    if (!name.trim()) {
      setCreateError("名前を入力してください");
      return;
    }
    if (!chatBarText.trim()) {
      setCreateError("チャットバーテキストを入力してください");
      return;
    }
    if (!imageFile) {
      setCreateError("画像を選択してください");
      return;
    }
    if (areas.length === 0) {
      setCreateError("エリアを1つ以上設定してください");
      return;
    }

    setCreating(true);

    const apiAreas: LineRichMenuArea[] = areas.map((a) => ({
      bounds: a.bounds,
      action:
        a.actionType === "uri"
          ? { type: "uri" as const, uri: a.value || "https://example.com", label: a.value || "Link" }
          : { type: "message" as const, text: a.value || "tap", label: a.value || "Message" },
    }));

    const result = await createRichMenu({
      name: name.trim(),
      chatBarText: chatBarText.trim(),
      sizeWidth: BASE_WIDTH,
      sizeHeight: sizeHeight,
      areas: apiAreas,
      selected: false,
    });

    if (result.error || !result.data) {
      setCreateError(result.error || "作成に失敗しました");
      setCreating(false);
      return;
    }

    const richMenuId = result.data;

    // Upload image
    const arrayBuffer = await imageFile.arrayBuffer();
    const contentType = imageFile.type || "image/png";
    const uploadResult = await uploadRichMenuImage(richMenuId, arrayBuffer, contentType);

    if (uploadResult.error) {
      setCreateError(uploadResult.error);
      setCreating(false);
      return;
    }

    // Reset form
    setName("");
    setChatBarText("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setAreas([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    await fetchData();
    setCreating(false);
  }, [name, chatBarText, sizeHeight, imageFile, areas, fetchData]);

  const displayScale = containerRef.current
    ? containerRef.current.offsetWidth / BASE_WIDTH
    : PREVIEW_MAX_WIDTH / BASE_WIDTH;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <LayoutGrid size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              リッチメニュー管理
            </h1>
            <p className="text-sm text-gray-500">
              LINE リッチメニューの作成・管理
            </p>
          </div>
        </div>
        <StudioButton
          variant="outline"
          size="sm"
          icon={<RefreshCw size={16} />}
          onClick={fetchData}
          disabled={loading}
        >
          更新
        </StudioButton>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Existing Rich Menus */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          リッチメニュー一覧
        </h2>
        {loading ? (
          <LoadingSpinner message="読み込み中..." />
        ) : menus.length === 0 ? (
          <div className="text-gray-500 text-sm py-8 text-center bg-gray-50 rounded-lg">
            リッチメニューがありません
          </div>
        ) : (
          <div className="space-y-3">
            {menus.map((menu) => (
              <div
                key={menu.richMenuId}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {menu.name}
                      </span>
                      {defaultMenuId === menu.richMenuId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                          <Star size={12} />
                          デフォルト
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      チャットバー: {menu.chatBarText}
                    </p>
                    <p className="text-xs text-gray-400">
                      サイズ: {menu.size.width}x{menu.size.height} | エリア数:{" "}
                      {menu.areas.length}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      ID: {menu.richMenuId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {defaultMenuId !== menu.richMenuId && (
                      <StudioButton
                        variant="outline"
                        size="sm"
                        icon={<Star size={14} />}
                        onClick={() => handleSetDefault(menu.richMenuId)}
                        disabled={actionLoading === menu.richMenuId}
                      >
                        デフォルトに設定
                      </StudioButton>
                    )}
                    <StudioButton
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleDelete(menu.richMenuId)}
                      disabled={actionLoading === menu.richMenuId}
                    >
                      削除
                    </StudioButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create New Rich Menu */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Plus size={20} className="text-green-600" />
          <h2 className="text-lg font-bold text-gray-900">新規作成</h2>
        </div>

        {createError && <ErrorMessage message={createError} className="mb-4" />}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <StudioLabel required>名前</StudioLabel>
            <StudioInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="リッチメニュー名"
              maxLength={300}
            />
          </div>

          {/* Chat Bar Text */}
          <div>
            <StudioLabel required>チャットバーテキスト</StudioLabel>
            <StudioInput
              value={chatBarText}
              onChange={(e) => setChatBarText(e.target.value)}
              placeholder="メニュー"
              maxLength={14}
            />
            <p className="text-xs text-gray-500 mt-1">
              チャット画面下部に表示されるテキスト（最大14文字）
            </p>
          </div>

          {/* Size */}
          <div>
            <StudioLabel required>サイズ</StudioLabel>
            <StudioSelect
              value={sizeHeight}
              onChange={(e) => {
                setSizeHeight(Number(e.target.value) as 1686 | 843);
                setAreas([]);
              }}
            >
              <option value={1686}>Full（2500x1686）</option>
              <option value={843}>Half（2500x843）</option>
            </StudioSelect>
          </div>

          {/* Image */}
          <div>
            <StudioLabel required>画像</StudioLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <StudioButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => fileInputRef.current?.click()}
            >
              画像を選択
            </StudioButton>
            <p className="text-xs text-gray-500 mt-1">
              PNG/JPEG、2500x{sizeHeight}px推奨（1MB以下）
            </p>
            {imageFile && (
              <p className="text-xs text-green-600 mt-1">
                選択済み: {imageFile.name}
              </p>
            )}
          </div>

          {/* Area Drawing */}
          {imagePreviewUrl && (
            <div>
              <StudioLabel hideBadge>
                エリア設定（画像上をドラッグしてエリアを作成）
              </StudioLabel>
              <div
                ref={containerRef}
                className="relative border border-gray-200 rounded-lg overflow-hidden cursor-crosshair select-none mt-2"
                style={{ maxWidth: PREVIEW_MAX_WIDTH }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="リッチメニュー画像"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                  }}
                  draggable={false}
                />

                {/* Existing areas */}
                {areas.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: entry.bounds.x * displayScale,
                      top: entry.bounds.y * displayScale,
                      width: entry.bounds.width * displayScale,
                      height: entry.bounds.height * displayScale,
                      backgroundColor: AREA_COLORS[i % AREA_COLORS.length],
                      border: `2px solid ${AREA_COLORS[i % AREA_COLORS.length].replace("0.35", "0.8")}`,
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      className="absolute top-0 left-0 bg-black/60 text-white text-xs px-1 rounded-br"
                      style={{ fontSize: 10, lineHeight: "16px" }}
                    >
                      {i + 1}
                    </span>
                  </div>
                ))}

                {/* Drawing rectangle */}
                {drawing && drawStart && drawCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      left: Math.min(drawStart.x, drawCurrent.x),
                      top: Math.min(drawStart.y, drawCurrent.y),
                      width: Math.abs(drawCurrent.x - drawStart.x),
                      height: Math.abs(drawCurrent.y - drawStart.y),
                      border: "2px dashed #06C755",
                      backgroundColor: "rgba(6,199,85,0.15)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Area List */}
          {areas.length > 0 && (
            <div>
              <StudioLabel hideBadge>エリア一覧</StudioLabel>
              <div className="space-y-2 mt-2">
                {areas.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100"
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        backgroundColor: AREA_COLORS[
                          i % AREA_COLORS.length
                        ].replace("0.35", "0.8"),
                      }}
                    >
                      {i + 1}
                    </span>

                    <StudioSelect
                      value={entry.actionType}
                      onChange={(e) =>
                        updateArea(i, "actionType", e.target.value)
                      }
                      className="!w-24 flex-shrink-0"
                    >
                      <option value="uri">URI</option>
                      <option value="message">メッセージ</option>
                    </StudioSelect>

                    <StudioInput
                      value={entry.value}
                      onChange={(e) => updateArea(i, "value", e.target.value)}
                      placeholder={
                        entry.actionType === "uri"
                          ? "https://..."
                          : "送信テキスト"
                      }
                      className="flex-1"
                    />

                    <button
                      type="button"
                      onClick={() => removeArea(i)}
                      className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Button */}
          <div className="pt-4">
            <StudioButton
              variant="primary"
              onClick={handleCreate}
              disabled={creating}
              icon={<Plus size={16} />}
            >
              {creating ? "作成中..." : "リッチメニューを作成"}
            </StudioButton>
          </div>
        </div>
      </div>
    </div>
  );
}

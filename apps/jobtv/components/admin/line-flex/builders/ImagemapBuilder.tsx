"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Plus, Image as ImageIcon } from "lucide-react";
import type {
  LineMessage,
  LineImagemapAction,
  LineImagemapArea,
} from "@/types/line-flex.types";
import { buildImagemapMessage } from "@/lib/line-flex-builder";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioInput from "@/components/studio/atoms/StudioInput";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";

/** LINE Imagemap の基準幅 */
const BASE_WIDTH = 1040;
/** プレビュー表示の最大幅 */
const PREVIEW_MAX_WIDTH = 520;
/** 最大エリア数 */
const MAX_AREAS = 50;

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
  area: LineImagemapArea;
  actionType: "uri" | "message";
  value: string;
};

interface ImagemapBuilderProps {
  onMessageChange: (msg: LineMessage | null) => void;
  onUploadImage: (
    file: File
  ) => Promise<{ data: string | null; error: string | null }>;
}

export function ImagemapBuilder({
  onMessageChange,
  onUploadImage,
}: ImagemapBuilderProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [areas, setAreas] = useState<AreaEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  // drawing state
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emit message when valid
  useEffect(() => {
    if (!imageUrl || areas.length === 0) {
      onMessageChange(null);
      return;
    }
    const actions: LineImagemapAction[] = areas.map((a) => {
      if (a.actionType === "uri") {
        return { type: "uri", linkUri: a.value || "https://example.com", area: a.area };
      }
      return { type: "message", text: a.value || "tap", area: a.area };
    });
    const baseHeight = imageNaturalSize
      ? Math.round((imageNaturalSize.h / imageNaturalSize.w) * BASE_WIDTH)
      : BASE_WIDTH;
    onMessageChange(
      buildImagemapMessage(imageUrl, altText || "Imagemap", actions, {
        width: BASE_WIDTH,
        height: baseHeight,
      })
    );
  }, [imageUrl, altText, areas, imageNaturalSize, onMessageChange]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const result = await onUploadImage(file);
      if (result.data) {
        setImageUrl(result.data);
      }
      setUploading(false);
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onUploadImage]
  );

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    },
    []
  );

  // Convert client coordinates to base-1040 coordinates
  const clientToBase = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !imageNaturalSize) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const displayWidth = containerRef.current.offsetWidth;
      const displayHeight = containerRef.current.offsetHeight;
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const scale = BASE_WIDTH / displayWidth;
      const baseHeight = Math.round(
        (imageNaturalSize.h / imageNaturalSize.w) * BASE_WIDTH
      );
      return {
        x: Math.max(0, Math.min(BASE_WIDTH, Math.round(relX * scale))),
        y: Math.max(0, Math.min(baseHeight, Math.round(relY * scale))),
        displayX: Math.max(0, Math.min(displayWidth, relX)),
        displayY: Math.max(0, Math.min(displayHeight, relY)),
      };
    },
    [imageNaturalSize]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (areas.length >= MAX_AREAS) return;
      const coords = clientToBase(e.clientX, e.clientY);
      if (!coords) return;
      setDrawing(true);
      setDrawStart({ x: coords.displayX, y: coords.displayY });
      setDrawCurrent({ x: coords.displayX, y: coords.displayY });
    },
    [clientToBase, areas.length]
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
      if (!drawing || !drawStart || !containerRef.current || !imageNaturalSize)
        return;
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

      // Ignore tiny accidental clicks
      if (w < 10 || h < 10) {
        setDrawStart(null);
        setDrawCurrent(null);
        return;
      }

      setAreas((prev) => [
        ...prev,
        {
          area: { x: x1, y: y1, width: w, height: h },
          actionType: "uri",
          value: "",
        },
      ]);
      setDrawStart(null);
      setDrawCurrent(null);
    },
    [drawing, drawStart, clientToBase, imageNaturalSize]
  );

  const updateArea = useCallback(
    (
      index: number,
      field: "actionType" | "value",
      val: string
    ) => {
      setAreas((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, [field]: val } : a
        )
      );
    },
    []
  );

  const removeArea = useCallback((index: number) => {
    setAreas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Compute display scale for overlays
  const displayScale =
    containerRef.current && imageNaturalSize
      ? containerRef.current.offsetWidth / BASE_WIDTH
      : 1;

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div>
        <StudioLabel required>ベース画像</StudioLabel>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />
        <StudioButton
          type="button"
          variant="outline"
          size="sm"
          icon={<ImageIcon size={16} />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "アップロード中..." : "画像を選択"}
        </StudioButton>
        <p className="text-xs text-gray-500 mt-1">
          JPEG/PNG。LINE Imagemap の基準幅は1040pxです。
        </p>
      </div>

      {/* Alt Text */}
      <div>
        <StudioLabel required>代替テキスト</StudioLabel>
        <StudioInput
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="画像の説明（最大400文字）"
          maxLength={400}
        />
      </div>

      {/* Image Preview + Area Drawing */}
      {imageUrl && (
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
              src={imageUrl}
              alt={altText || "Imagemap base"}
              onLoad={handleImageLoad}
              style={{ width: "100%", height: "auto", display: "block" }}
              draggable={false}
            />

            {/* Existing areas */}
            {areas.map((entry, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: entry.area.x * displayScale,
                  top: entry.area.y * displayScale,
                  width: entry.area.width * displayScale,
                  height: entry.area.height * displayScale,
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
          {areas.length >= MAX_AREAS && (
            <p className="text-xs text-amber-600 mt-1">
              エリアは最大{MAX_AREAS}個までです。
            </p>
          )}
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
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100"
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    backgroundColor: AREA_COLORS[i % AREA_COLORS.length].replace(
                      "0.35",
                      "0.8"
                    ),
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
    </div>
  );
}

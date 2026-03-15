"use client";

import type {
  BubbleBuilderState,
  ButtonBuilderState,
} from "@/types/line-flex.types";
import StudioInput from "@/components/studio/atoms/StudioInput";
import StudioTextarea from "@/components/studio/atoms/StudioTextarea";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import { VariableInserter } from "./VariableInserter";
import { Plus, Trash2 } from "lucide-react";

const ASPECT_RATIOS = [
  { value: "20:13", label: "20:13（推奨）" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "3:1", label: "3:1" },
];

const BUTTON_STYLES = [
  { value: "primary", label: "Primary（塗り）" },
  { value: "secondary", label: "Secondary（枠線）" },
  { value: "link", label: "Link（テキスト）" },
];

const MAX_BUTTONS = 3;

interface BubbleFormFieldsProps {
  value: BubbleBuilderState;
  onChange: (state: BubbleBuilderState) => void;
  onUploadImage: (
    file: File
  ) => Promise<{ data: string | null; error: string | null }>;
}

export function BubbleFormFields({
  value,
  onChange,
  onUploadImage,
}: BubbleFormFieldsProps) {
  const updateField = <K extends keyof BubbleBuilderState>(
    key: K,
    val: BubbleBuilderState[K]
  ) => {
    onChange({ ...value, [key]: val });
  };

  const updateButton = (
    index: number,
    patch: Partial<ButtonBuilderState>
  ) => {
    const next = [...value.buttons];
    next[index] = { ...next[index], ...patch };
    updateField("buttons", next);
  };

  const addButton = () => {
    if (value.buttons.length >= MAX_BUTTONS) return;
    updateField("buttons", [
      ...value.buttons,
      { label: "", uri: "", style: "primary" as const },
    ]);
  };

  const removeButton = (index: number) => {
    updateField(
      "buttons",
      value.buttons.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-4">
      {/* Hero image */}
      <div>
        <StudioLabel>ヒーロー画像</StudioLabel>
        <StudioImageUpload
          label="ヒーロー画像"
          type="cover"
          currentUrl={value.heroImageUrl || undefined}
          onUploadComplete={(url) => updateField("heroImageUrl", url)}
          customUploadFunction={onUploadImage}
          aspectRatio="wide"
          helperText="JPEG/PNG、10MB以下"
        />
      </div>

      {/* Aspect ratio */}
      {value.heroImageUrl && (
        <div>
          <StudioLabel>アスペクト比</StudioLabel>
          <StudioSelect
            value={value.heroAspectRatio}
            onChange={(e) =>
              updateField("heroAspectRatio", e.target.value)
            }
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </StudioSelect>
        </div>
      )}

      {/* Title */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <StudioLabel className="mb-0">タイトル</StudioLabel>
          <VariableInserter
            onInsert={(v) =>
              updateField(
                "title",
                (value.title + v).slice(0, 40)
              )
            }
          />
        </div>
        <StudioInput
          value={value.title}
          onChange={(e) =>
            updateField("title", e.target.value.slice(0, 40))
          }
          placeholder="カードのタイトル（変数使用可）"
          maxLength={40}
        />
        <p className="mt-1 text-xs text-gray-500">
          {value.title.length}/40
        </p>
      </div>

      {/* Description */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <StudioLabel className="mb-0">説明文</StudioLabel>
          <VariableInserter
            onInsert={(v) =>
              updateField(
                "description",
                (value.description + v).slice(0, 200)
              )
            }
          />
        </div>
        <StudioTextarea
          value={value.description}
          onChange={(e) =>
            updateField(
              "description",
              e.target.value.slice(0, 200)
            )
          }
          placeholder="カードの説明文（変数使用可）"
          maxLength={200}
          rows={3}
        />
        <p className="mt-1 text-xs text-gray-500">
          {value.description.length}/200
        </p>
      </div>

      {/* Buttons */}
      <div>
        <StudioLabel>ボタン</StudioLabel>
        <div className="space-y-3">
          {value.buttons.map((btn, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  ボタン {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeButton(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <StudioInput
                value={btn.label}
                onChange={(e) =>
                  updateButton(i, {
                    label: e.target.value.slice(0, 40),
                  })
                }
                placeholder="ラベル"
                maxLength={40}
              />
              <StudioInput
                value={btn.uri}
                onChange={(e) =>
                  updateButton(i, { uri: e.target.value.slice(0, 1000) })
                }
                placeholder="https://..."
                type="url"
                maxLength={1000}
              />
              <StudioSelect
                value={btn.style}
                onChange={(e) =>
                  updateButton(i, {
                    style: e.target
                      .value as ButtonBuilderState["style"],
                  })
                }
              >
                {BUTTON_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </StudioSelect>
            </div>
          ))}
          {value.buttons.length < MAX_BUTTONS && (
            <StudioButton
              variant="outline"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={addButton}
              type="button"
            >
              ボタンを追加
            </StudioButton>
          )}
        </div>
      </div>
    </div>
  );
}

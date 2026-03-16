"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  getLineBroadcastEligibleCount,
  sendLineBroadcast,
  sendLineTestMessage,
  scheduleLineBroadcast,
  uploadLineBroadcastImage,
  getAdminLineUserId,
  setAdminLineUserId,
  type LineBroadcastFilters,
} from "@/lib/actions/line-broadcast-actions";
import {
  getLineMessageTemplates,
  getLineMessageTemplate,
  createLineMessageTemplate,
} from "@/lib/actions/line-template-actions";
import {
  getGraduationYears,
  DESIRED_INDUSTRIES,
  DESIRED_JOB_TYPES,
  SCHOOL_TYPES,
  MAJOR_CATEGORIES,
} from "@/constants/signup-options";
import type {
  MessageType,
  LineMessage,
  BubbleBuilderState,
} from "@/types/line-flex.types";
import { EMPTY_BUBBLE_STATE } from "@/types/line-flex.types";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioInput from "@/components/studio/atoms/StudioInput";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import { LineChatFrame } from "@/components/admin/line-flex/LineChatFrame";
import { MobilePreviewDrawer } from "@/components/admin/line-flex/MobilePreviewDrawer";
import { MessageTypeSelector } from "@/components/admin/line-flex/builders/MessageTypeSelector";
import { TextMessageBuilder } from "@/components/admin/line-flex/builders/TextMessageBuilder";
import { BubbleBuilder } from "@/components/admin/line-flex/builders/BubbleBuilder";
import { CarouselBuilder } from "@/components/admin/line-flex/builders/CarouselBuilder";
import { ImageMessageBuilder } from "@/components/admin/line-flex/builders/ImageMessageBuilder";
import { ImagemapBuilder } from "@/components/admin/line-flex/builders/ImagemapBuilder";
import { JsonEditor } from "@/components/admin/line-flex/builders/JsonEditor";
import { Send, Clock, Save, FlaskConical, Eye, Code } from "lucide-react";

export default function AdminLineBroadcastPage() {
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("templateId");

  const [filters, setFilters] = useState<LineBroadcastFilters>({});
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  // Message type & per-type state
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [textValue, setTextValue] = useState("");
  const [bubbleState, setBubbleState] = useState<BubbleBuilderState>({
    ...EMPTY_BUBBLE_STATE,
    buttons: [],
  });
  const [bubbleAltText, setBubbleAltText] = useState("");
  const [carouselStates, setCarouselStates] = useState<BubbleBuilderState[]>([
    { ...EMPTY_BUBBLE_STATE, buttons: [] },
  ]);
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
  const [carouselAltText, setCarouselAltText] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Current message for preview + send
  const [currentMessage, setCurrentMessage] = useState<LineMessage | null>(null);

  // Schedule state
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Test send state
  const [testSendLoading, setTestSendLoading] = useState(false);
  const [testSendResult, setTestSendResult] = useState<string | null>(null);
  const [showLineIdDialog, setShowLineIdDialog] = useState(false);
  const [adminLineUserId, setAdminLineUserIdState] = useState("");
  const [lineIdSaving, setLineIdSaving] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);

  // JSON editor mode
  const [jsonEditorMode, setJsonEditorMode] = useState(false);
  const [jsonValue, setJsonValue] = useState("");

  // Mobile preview drawer
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Load templates list
  useEffect(() => {
    getLineMessageTemplates().then((result) => {
      if (result.data) {
        setTemplates(result.data.map((t) => ({ id: t.id, name: t.name })));
      }
    });
  }, []);

  // Load template from URL param
  useEffect(() => {
    if (!templateIdParam) return;
    getLineMessageTemplate(templateIdParam).then((result) => {
      if (!result.data) return;
      const tmpl = result.data;
      setSelectedTemplateId(tmpl.id);
      const msgType = tmpl.message_type as MessageType;
      setMessageType(msgType);

      // Restore builder state if available
      if (tmpl.builder_state_json) {
        const state = tmpl.builder_state_json as Record<string, unknown>;
        if (msgType === "text" && typeof state.text === "string") {
          setTextValue(state.text);
        } else if (msgType === "bubble") {
          if (state.bubbleState) setBubbleState(state.bubbleState as BubbleBuilderState);
          if (typeof state.altText === "string") setBubbleAltText(state.altText);
        } else if (msgType === "carousel") {
          if (Array.isArray(state.carouselStates)) setCarouselStates(state.carouselStates as BubbleBuilderState[]);
          if (typeof state.altText === "string") setCarouselAltText(state.altText);
          setCarouselActiveIndex(0);
        } else if (msgType === "image" && typeof state.imageUrl === "string") {
          setImageUrl(state.imageUrl);
        }
      }
    });
  }, [templateIdParam]);

  // Update currentMessage when text changes
  useEffect(() => {
    if (messageType === "text") {
      const trimmed = textValue.trim();
      setCurrentMessage(trimmed ? { type: "text", text: trimmed } : null);
    }
  }, [messageType, textValue]);

  const handleBubbleMessageChange = useCallback(
    (msg: LineMessage | null) => {
      if (messageType === "bubble") setCurrentMessage(msg);
    },
    [messageType]
  );

  const handleCarouselMessageChange = useCallback(
    (msg: LineMessage | null) => {
      if (messageType === "carousel") setCurrentMessage(msg);
    },
    [messageType]
  );

  const handleImageMessageChange = useCallback(
    (msg: LineMessage | null) => {
      if (messageType === "image") setCurrentMessage(msg);
    },
    [messageType]
  );

  const handleImagemapMessageChange = useCallback(
    (msg: LineMessage | null) => {
      if (messageType === "imagemap") setCurrentMessage(msg);
    },
    [messageType]
  );

  const handleJsonValidMessage = useCallback(
    (msg: LineMessage | null) => {
      if (jsonEditorMode) setCurrentMessage(msg);
    },
    [jsonEditorMode]
  );

  // When switching types, re-derive currentMessage
  useEffect(() => {
    if (messageType === "text") {
      const trimmed = textValue.trim();
      setCurrentMessage(trimmed ? { type: "text", text: trimmed } : null);
    }
  }, [messageType, textValue]);

  const handleUploadImage = useCallback(async (file: File) => {
    return uploadLineBroadcastImage(file);
  }, []);

  const refreshCount = useCallback(async () => {
    setCountLoading(true);
    setCountError(null);
    const result = await getLineBroadcastEligibleCount(filters);
    setCountLoading(false);
    if (result.error) {
      setCountError(result.error);
      setCount(null);
    } else {
      setCount(result.data);
      setCountError(null);
    }
  }, [filters]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  /** 現在のビルダー状態を取得 */
  const getBuilderState = useCallback((): Record<string, unknown> => {
    switch (messageType) {
      case "text":
        return { text: textValue };
      case "bubble":
        return { bubbleState, altText: bubbleAltText };
      case "carousel":
        return { carouselStates, altText: carouselAltText };
      case "image":
        return { imageUrl };
      case "imagemap":
        return {};
      default:
        return {};
    }
  }, [messageType, textValue, bubbleState, bubbleAltText, carouselStates, carouselAltText, imageUrl]);

  const handleSend = async () => {
    if (!currentMessage) {
      setSendError("メッセージを作成してください。");
      return;
    }
    if (!confirm("配信を実行しますか？")) return;
    setSendLoading(true);
    setSendError(null);
    setSendResult(null);
    const result = await sendLineBroadcast(filters, [currentMessage], {
      templateId: selectedTemplateId || undefined,
    });
    setSendLoading(false);
    if (result.error) {
      setSendError(result.error);
      return;
    }
    setSendResult(result.data);
    if (messageType === "text") setTextValue("");
    refreshCount();
  };

  const handleSchedule = async () => {
    if (!currentMessage) {
      setSendError("メッセージを作成してください。");
      return;
    }
    if (!scheduledAt) {
      setSendError("予約日時を指定してください。");
      return;
    }
    if (!confirm(`${scheduledAt} に予約配信しますか？`)) return;
    setScheduleLoading(true);
    setSendError(null);
    setSendResult(null);
    const result = await scheduleLineBroadcast(filters, [currentMessage], scheduledAt, {
      templateId: selectedTemplateId || undefined,
    });
    setScheduleLoading(false);
    if (result.error) {
      setSendError(result.error);
      return;
    }
    setSendError(null);
    setSendResult(null);
    alert("配信を予約しました。配信履歴から確認できます。");
  };

  const handleTestSend = async () => {
    if (!currentMessage) {
      setSendError("メッセージを作成してください。");
      return;
    }
    // Check if admin has LINE userId
    const lineIdResult = await getAdminLineUserId();
    if (!lineIdResult.data) {
      setShowLineIdDialog(true);
      return;
    }

    setTestSendLoading(true);
    setTestSendResult(null);
    const result = await sendLineTestMessage([currentMessage]);
    setTestSendLoading(false);
    if (result.error) {
      setTestSendResult(`テスト送信失敗: ${result.error}`);
    } else {
      setTestSendResult("テスト送信完了。LINEアプリを確認してください。");
    }
  };

  const handleSaveLineUserId = async () => {
    if (!adminLineUserId.trim()) return;
    setLineIdSaving(true);
    const result = await setAdminLineUserId(adminLineUserId.trim());
    setLineIdSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      setShowLineIdDialog(false);
      // Retry test send
      handleTestSend();
    }
  };

  const handleLoadTemplate = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId("");
      return;
    }
    const result = await getLineMessageTemplate(templateId);
    if (!result.data) return;
    const tmpl = result.data;
    setSelectedTemplateId(tmpl.id);
    const msgType = tmpl.message_type as MessageType;
    setMessageType(msgType);

    if (tmpl.builder_state_json) {
      const state = tmpl.builder_state_json as Record<string, unknown>;
      if (msgType === "text" && typeof state.text === "string") {
        setTextValue(state.text);
      } else if (msgType === "bubble") {
        if (state.bubbleState) setBubbleState(state.bubbleState as BubbleBuilderState);
        if (typeof state.altText === "string") setBubbleAltText(state.altText);
      } else if (msgType === "carousel") {
        if (Array.isArray(state.carouselStates)) setCarouselStates(state.carouselStates as BubbleBuilderState[]);
        if (typeof state.altText === "string") setCarouselAltText(state.altText);
        setCarouselActiveIndex(0);
      } else if (msgType === "image" && typeof state.imageUrl === "string") {
        setImageUrl(state.imageUrl);
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert("テンプレート名を入力してください。");
      return;
    }
    if (!currentMessage) {
      alert("メッセージを作成してください。");
      return;
    }
    setTemplateSaving(true);
    const result = await createLineMessageTemplate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      message_type: messageType,
      messages_json: [currentMessage],
      builder_state_json: getBuilderState(),
    });
    setTemplateSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      setShowSaveTemplate(false);
      setTemplateName("");
      setTemplateDescription("");
      if (result.data) {
        setSelectedTemplateId(result.data.id);
        setTemplates((prev) => [{ id: result.data!.id, name: result.data!.name }, ...prev]);
      }
      alert("テンプレートを保存しました。");
    }
  };

  const graduationYears = getGraduationYears();

  return (
    <div className="relative pb-4">
      {/* Main content - leave space for preview on right */}
      <div className="mr-0 min-w-0 md:mr-[391px]">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">LINE配信</h1>
          <p className="text-sm text-gray-600">
            セグメント条件に該当し、LINE連携済みの学生にメッセージを配信します。
          </p>

          {/* Segment filters */}
          <section className="rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">セグメント条件</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  卒年度（複数選択可）
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-gray-200 bg-white p-3">
                  {graduationYears.map((y) => (
                    <label
                      key={y}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={filters.graduation_years?.includes(y) ?? false}
                        onChange={(e) => {
                          const current = filters.graduation_years ?? [];
                          const next = e.target.checked
                            ? [...current, y].sort((a, b) => a - b)
                            : current.filter((n) => n !== y);
                          setFilters((prev) => ({
                            ...prev,
                            graduation_years: next.length ? next : undefined,
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span>{y}年卒</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  学校種別
                </label>
                <StudioSelect
                  value={filters.school_type ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      school_type: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">指定なし</option>
                  {SCHOOL_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </StudioSelect>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  文理
                </label>
                <StudioSelect
                  value={filters.major_field ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      major_field: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">指定なし</option>
                  {MAJOR_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </StudioSelect>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                興味のある業界（複数選択可）
              </label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
                <div className="flex flex-col gap-1">
                  {DESIRED_INDUSTRIES.map((i) => (
                    <label
                      key={i}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={filters.desired_industries?.includes(i) ?? false}
                        onChange={(e) => {
                          const current = filters.desired_industries ?? [];
                          const next = e.target.checked
                            ? [...current, i]
                            : current.filter((v) => v !== i);
                          setFilters((prev) => ({
                            ...prev,
                            desired_industries: next.length ? next : undefined,
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span>{i}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                興味のある職種（複数選択可）
              </label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
                <div className="flex flex-col gap-1">
                  {DESIRED_JOB_TYPES.map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={filters.desired_job_types?.includes(t) ?? false}
                        onChange={(e) => {
                          const current = filters.desired_job_types ?? [];
                          const next = e.target.checked
                            ? [...current, t]
                            : current.filter((v) => v !== t);
                          setFilters((prev) => ({
                            ...prev,
                            desired_job_types: next.length ? next : undefined,
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Target count */}
          <section className="rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-2">配信対象</h2>
            {countLoading ? (
              <LoadingSpinner />
            ) : countError ? (
              <ErrorMessage message={countError} />
            ) : (
              <p className="text-lg font-medium">
                配信対象:{" "}
                <span className="text-gray-700">{count ?? 0}</span> 人
              </p>
            )}
          </section>

          {/* Message builder */}
          <section className="rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">メッセージ作成</h2>
              {/* Template dropdown */}
              <div className="flex items-center gap-2">
                <StudioSelect
                  value={selectedTemplateId}
                  onChange={(e) => handleLoadTemplate(e.target.value)}
                  className="text-sm"
                >
                  <option value="">テンプレートから読み込み</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </StudioSelect>
              </div>
            </div>

            <MessageTypeSelector value={messageType} onChange={setMessageType} />

            {messageType === "text" && !jsonEditorMode && (
              <TextMessageBuilder value={textValue} onChange={setTextValue} />
            )}
            {messageType === "bubble" && !jsonEditorMode && (
              <BubbleBuilder
                bubbleState={bubbleState}
                altText={bubbleAltText}
                onBubbleStateChange={setBubbleState}
                onAltTextChange={setBubbleAltText}
                onMessageChange={handleBubbleMessageChange}
                onUploadImage={handleUploadImage}
              />
            )}
            {messageType === "carousel" && !jsonEditorMode && (
              <CarouselBuilder
                carouselStates={carouselStates}
                activeCardIndex={carouselActiveIndex}
                altText={carouselAltText}
                onCarouselStatesChange={setCarouselStates}
                onActiveCardIndexChange={setCarouselActiveIndex}
                onAltTextChange={setCarouselAltText}
                onMessageChange={handleCarouselMessageChange}
                onUploadImage={handleUploadImage}
              />
            )}
            {messageType === "image" && !jsonEditorMode && (
              <ImageMessageBuilder
                imageUrl={imageUrl}
                onImageUrlChange={setImageUrl}
                onMessageChange={handleImageMessageChange}
                onUploadImage={handleUploadImage}
              />
            )}
            {messageType === "imagemap" && !jsonEditorMode && (
              <ImagemapBuilder
                onMessageChange={handleImagemapMessageChange}
                onUploadImage={handleUploadImage}
              />
            )}

            {/* Builder / JSON toggle */}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  if (!jsonEditorMode && currentMessage) {
                    setJsonValue(JSON.stringify(currentMessage, null, 2));
                  }
                  setJsonEditorMode((v) => !v);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Code className="h-4 w-4" />
                {jsonEditorMode ? "ビルダーに戻る" : "JSON 編集"}
              </button>
            </div>
            {jsonEditorMode && (
              <JsonEditor
                value={jsonValue}
                onChange={setJsonValue}
                onValidMessage={handleJsonValidMessage}
              />
            )}

            {/* Template save */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplate((v) => !v)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                テンプレートとして保存
              </button>
            </div>
            {showSaveTemplate && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート名</label>
                  <StudioInput
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="例: 新卒向けイベント案内"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
                  <StudioInput
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="テンプレートの用途を記載"
                    maxLength={200}
                  />
                </div>
                <StudioButton
                  onClick={handleSaveTemplate}
                  disabled={templateSaving || !templateName.trim() || !currentMessage}
                  size="sm"
                  icon={<Save className="h-4 w-4" />}
                >
                  {templateSaving ? "保存中..." : "保存"}
                </StudioButton>
              </div>
            )}

            {/* Schedule */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                予約配信（日時を指定すると予約になります）
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]/50 focus:border-[#06C755]"
              />
            </div>

            {sendError && <ErrorMessage message={sendError} />}
            {sendResult && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                送信完了: 成功 {sendResult.sent} 件、失敗{" "}
                {sendResult.failed} 件
              </div>
            )}
            {testSendResult && (
              <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {testSendResult}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <StudioButton
                onClick={handleTestSend}
                variant="outline"
                disabled={testSendLoading || !currentMessage}
                icon={<FlaskConical className="h-4 w-4" />}
              >
                {testSendLoading ? "送信中..." : "テスト送信"}
              </StudioButton>

              {scheduledAt ? (
                <StudioButton
                  onClick={handleSchedule}
                  disabled={scheduleLoading || !currentMessage}
                  icon={<Clock className="h-4 w-4" />}
                >
                  {scheduleLoading ? "予約中..." : "予約する"}
                </StudioButton>
              ) : (
                <StudioButton
                  onClick={handleSend}
                  disabled={sendLoading || (count ?? 0) === 0 || !currentMessage}
                  icon={<Send className="h-4 w-4" />}
                >
                  {sendLoading ? "送信中..." : "配信する"}
                </StudioButton>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Right-fixed LINE preview (desktop) */}
      <div className="fixed bottom-6 right-6 z-10 hidden md:block md:bottom-6 md:right-10">
        <LineChatFrame message={currentMessage} />
      </div>

      {/* Mobile preview floating button */}
      <button
        type="button"
        onClick={() => setMobilePreviewOpen(true)}
        className="fixed bottom-6 right-6 z-20 md:hidden flex items-center gap-2 rounded-full bg-[#06C755] px-4 py-3 text-white shadow-lg hover:bg-[#05b54d] transition-colors"
      >
        <Eye className="h-5 w-5" />
        プレビュー
      </button>

      {/* Mobile preview drawer */}
      <MobilePreviewDrawer
        isOpen={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        message={currentMessage}
      />

      {/* LINE userId setting dialog */}
      {showLineIdDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white p-6 shadow-xl max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">LINE userId の設定</h3>
            <p className="text-sm text-gray-600">
              テスト送信するには、あなたの LINE userId を登録してください。
              LINE Official Account Manager で確認できます。
            </p>
            <StudioInput
              value={adminLineUserId}
              onChange={(e) => setAdminLineUserIdState(e.target.value)}
              placeholder="U1234567890abcdef..."
            />
            <div className="flex gap-2 justify-end">
              <StudioButton variant="outline" onClick={() => setShowLineIdDialog(false)}>
                キャンセル
              </StudioButton>
              <StudioButton
                onClick={handleSaveLineUserId}
                disabled={lineIdSaving || !adminLineUserId.trim()}
              >
                {lineIdSaving ? "保存中..." : "保存して送信"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

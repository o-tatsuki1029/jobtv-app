"use client";

import { useEffect } from "react";
import type { BubbleBuilderState, LineFlexMessage } from "@/types/line-flex.types";
import { EMPTY_BUBBLE_STATE } from "@/types/line-flex.types";
import { buildBubbleFromState, buildCarouselMessage } from "@/lib/line-flex-builder";
import StudioInput from "@/components/studio/atoms/StudioInput";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioButton from "@/components/studio/atoms/StudioButton";
import { BubbleFormFields } from "./BubbleFormFields";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MAX_CARDS = 12;

interface SortableCardTabProps {
  id: string;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function SortableCardTab({ id, index, isActive, onClick }: SortableCardTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      {index + 1}
    </button>
  );
}

interface CarouselBuilderProps {
  carouselStates: BubbleBuilderState[];
  activeCardIndex: number;
  altText: string;
  onCarouselStatesChange: (states: BubbleBuilderState[]) => void;
  onActiveCardIndexChange: (index: number) => void;
  onAltTextChange: (text: string) => void;
  onMessageChange: (message: LineFlexMessage | null) => void;
  onUploadImage: (file: File) => Promise<{ data: string | null; error: string | null }>;
}

export function CarouselBuilder({
  carouselStates,
  activeCardIndex,
  altText,
  onCarouselStatesChange,
  onActiveCardIndexChange,
  onAltTextChange,
  onMessageChange,
  onUploadImage,
}: CarouselBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    const hasAny = carouselStates.some(
      (s) => s.heroImageUrl || s.title || s.description || s.buttons.length > 0
    );
    if (!hasAny) {
      onMessageChange(null);
      return;
    }
    const bubbles = carouselStates.map(buildBubbleFromState);
    onMessageChange(buildCarouselMessage(bubbles, altText));
  }, [carouselStates, altText, onMessageChange]);

  const updateCard = (index: number, state: BubbleBuilderState) => {
    const next = [...carouselStates];
    next[index] = state;
    onCarouselStatesChange(next);
  };

  const addCard = () => {
    if (carouselStates.length >= MAX_CARDS) return;
    const next = [...carouselStates, { ...EMPTY_BUBBLE_STATE, buttons: [] }];
    onCarouselStatesChange(next);
    onActiveCardIndexChange(next.length - 1);
  };

  const removeCard = (index: number) => {
    if (carouselStates.length <= 1) return;
    const next = carouselStates.filter((_, i) => i !== index);
    onCarouselStatesChange(next);
    if (activeCardIndex >= next.length) {
      onActiveCardIndexChange(next.length - 1);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = carouselStates.findIndex((_, i) => `card-${i}` === active.id);
    const newIndex = carouselStates.findIndex((_, i) => `card-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(carouselStates, oldIndex, newIndex);
    onCarouselStatesChange(reordered);

    // Adjust activeCardIndex to follow the active card
    if (activeCardIndex === oldIndex) {
      onActiveCardIndexChange(newIndex);
    } else if (oldIndex < activeCardIndex && newIndex >= activeCardIndex) {
      onActiveCardIndexChange(activeCardIndex - 1);
    } else if (oldIndex > activeCardIndex && newIndex <= activeCardIndex) {
      onActiveCardIndexChange(activeCardIndex + 1);
    }
  };

  const cardIds = carouselStates.map((_, i) => `card-${i}`);

  return (
    <div className="space-y-4">
      <div>
        <StudioLabel required>代替テキスト</StudioLabel>
        <StudioInput
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value.slice(0, 400))}
          placeholder="通知やトーク一覧に表示されるテキスト"
          maxLength={400}
        />
        <p className="mt-1 text-xs text-gray-500">{altText.length}/400</p>
      </div>

      {/* Card tabs */}
      <div>
        <StudioLabel>カード一覧</StudioLabel>
        <div className="flex flex-wrap items-center gap-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cardIds}
              strategy={horizontalListSortingStrategy}
            >
              {carouselStates.map((_, i) => (
                <SortableCardTab
                  key={cardIds[i]}
                  id={cardIds[i]}
                  index={i}
                  isActive={i === activeCardIndex}
                  onClick={() => onActiveCardIndexChange(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {carouselStates.length < MAX_CARDS && (
            <button
              type="button"
              onClick={addCard}
              className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600"
            >
              <Plus className="inline h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div className="flex items-center gap-2">
        <StudioButton
          variant="danger"
          size="sm"
          icon={<Trash2 className="h-3 w-3" />}
          onClick={() => removeCard(activeCardIndex)}
          disabled={carouselStates.length <= 1}
          type="button"
        >
          削除
        </StudioButton>
      </div>

      {/* Active card form */}
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">
          カード {activeCardIndex + 1} / {carouselStates.length}
        </p>
        <BubbleFormFields
          value={carouselStates[activeCardIndex]}
          onChange={(state) => updateCard(activeCardIndex, state)}
          onUploadImage={onUploadImage}
        />
      </div>
    </div>
  );
}

import type { LineMessage } from "@/types/line-flex.types";

export type LineVariable = {
  key: string;
  label: string;
  example: string;
};

/** 配信メッセージで使用可能な変数一覧 */
export const LINE_MESSAGE_VARIABLES: LineVariable[] = [
  { key: "last_name", label: "姓", example: "山田" },
  { key: "first_name", label: "名", example: "太郎" },
  { key: "full_name", label: "氏名", example: "山田太郎" },
  { key: "graduation_year", label: "卒年度", example: "2027" },
  { key: "school_name", label: "学校名", example: "東京大学" },
];

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

/** テキスト内の {{key}} を値に置換 */
export function replaceVariables(
  text: string,
  vars: Record<string, string>
): string {
  return text.replace(VAR_PATTERN, (match, key: string) => {
    return vars[key] ?? match;
  });
}

/** プレビュー用: {{key}} をサンプル値に置換 */
export function replaceWithExamples(text: string): string {
  const exampleMap: Record<string, string> = {};
  for (const v of LINE_MESSAGE_VARIABLES) {
    exampleMap[v.key] = v.example;
  }
  return replaceVariables(text, exampleMap);
}

/** LineMessage 内の全テキストフィールドで変数を置換（deep clone + replace） */
export function replaceMessageVariables(
  message: LineMessage,
  vars: Record<string, string>
): LineMessage {
  // Deep clone to avoid mutation
  const msg = JSON.parse(JSON.stringify(message)) as LineMessage;
  return replaceInValue(msg, vars) as LineMessage;
}

function replaceInValue(
  value: unknown,
  vars: Record<string, string>
): unknown {
  if (typeof value === "string") {
    return replaceVariables(value, vars);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceInValue(item, vars));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = replaceInValue(v, vars);
    }
    return result;
  }
  return value;
}

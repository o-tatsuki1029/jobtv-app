/**
 * フォームの変更検知用ユーティリティ関数
 */

/**
 * 2つのオブジェクトの指定されたフィールドに変更があるかチェック
 */
export function hasFieldChanges<T extends Record<string, any>>(
  current: T,
  initial: T,
  fieldsToCompare: (keyof T)[]
): boolean {
  return fieldsToCompare.some((field) => {
    const currentValue = current[field] ?? "";
    const initialValue = initial[field] ?? "";
    return currentValue !== initialValue;
  });
}

/**
 * 2つの配列に変更があるかチェック（JSON.stringifyを使用）
 */
export function hasArrayChanges<T>(current: T[], initial: T[]): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

/**
 * 2つのオブジェクトに変更があるかチェック（JSON.stringifyを使用）
 */
export function hasObjectChanges<T extends Record<string, any>>(current: T, initial: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

/**
 * 複数の変更チェックを組み合わせる
 */
export function hasChanges(...checks: boolean[]): boolean {
  return checks.some((check) => check);
}


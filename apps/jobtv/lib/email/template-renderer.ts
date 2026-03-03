// {variable_name} 記法でテンプレート変数を置換するユーティリティ

/**
 * テンプレート文字列内の {variable_name} を変数オブジェクトの値で置換する。
 * 未定義の変数はそのまま残す（デバッグ可視化のため）。
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : `{${key}}`;
  });
}

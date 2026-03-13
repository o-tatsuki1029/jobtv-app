// {variable_name} 記法でテンプレート変数を置換するユーティリティ

/**
 * HTML特殊文字をエスケープする。
 * メールテンプレートの変数値に含まれる可能性のあるXSSベクタを無害化する。
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * テンプレート文字列内の {variable_name} を変数オブジェクトの値で置換する。
 * 変数値は HTML エスケープされる（XSS 防止）。
 * 未定義の変数はそのまま残す（デバッグ可視化のため）。
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? escapeHtml(variables[key])
      : `{${key}}`;
  });
}

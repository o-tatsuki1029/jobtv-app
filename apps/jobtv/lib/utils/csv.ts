/**
 * 2次元配列からBOM付きUTF-8 CSVを生成してブラウザにダウンロードさせる。
 * @param headers ヘッダー行の配列
 * @param rows    データ行の2次元配列
 * @param filename ダウンロードファイル名（拡張子なし）
 */
export function downloadCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  filename: string
): void {
  const allRows = [headers, ...rows];
  const csv = allRows
    .map((row) =>
      row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

import { redirect } from "next/navigation";

/**
 * サービス一覧ページのプレースホルダー。
 * 現時点ではサービス一覧がないため、採用マーケティングLPへリダイレクトする。
 */
export default function ServicePage() {
  redirect("/service/recruitment-marketing");
}

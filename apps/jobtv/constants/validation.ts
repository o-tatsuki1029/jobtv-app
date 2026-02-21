/**
 * スタジオ・管理画面で使用する文字数制限の共通定数
 * 入力は制限を超えても受け付ける。制限超過時はバリデーションエラーとする。
 */

/** 求人タイトル・説明会タイトル・動画タイトル・勤務地/詳細・場所詳細・キャッチコピー */
export const TITLE_MAX_LENGTH = 30;

/** 職務内容・応募資格・おすすめポイント・選考フロー・説明会説明文・会社紹介文 */
export const LONG_DESCRIPTION_MAX_LENGTH = 2000;

/** 代表者名 */
export const REPRESENTATIVE_NAME_MAX_LENGTH = 50;

/** 企業情報（プロフィール・管理画面） */
export const COMPANY_INFO_MAX_LENGTH = 300;

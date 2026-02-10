/**
 * Supabase認証エラーメッセージを日本語に変換
 */
export function translateAuthError(error: { message: string }): string {
  const { message } = error;

  if (message.includes("Email not confirmed")) {
    return "メールアドレスの確認が必要です。登録時に送信されたメールを確認してください。";
  }
  if (message.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("Email signups are disabled")) {
    return "メールアドレスによる新規登録が無効になっています。管理者に連絡してください。";
  }
  if (message.includes("User already registered")) {
    return "このメールアドレスは既に登録されています。";
  }
  if (message.includes("Password")) {
    return "パスワードが弱すぎます。より強力なパスワードを設定してください。";
  }

  return message;
}



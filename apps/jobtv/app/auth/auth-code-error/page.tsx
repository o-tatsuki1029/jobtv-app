import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center px-4 py-20 bg-white">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">認証エラーが発生しました</h1>
        <p className="text-gray-600 mb-8">
          認証コードが無効か、有効期限が切れています。もう一度お試しください。
        </p>
        <Link href="/auth/login" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
          ログイン画面へ戻る
        </Link>
      </div>
    </div>
  );
}

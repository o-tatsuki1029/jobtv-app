export default function SignupThanksPage() {
  return (
    <div className="flex items-center justify-center px-2 py-20 sm:px-4 bg-white">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">会員登録が完了しました！</h1>
        <p className="text-gray-600 mb-8">ご登録ありがとうございます。</p>

        <div className="rounded-lg border border-[#06C755] bg-[#f0fff4] p-5 text-center">
          <p className="mb-1 font-bold text-gray-900">LINE連携をお願いします</p>
          <p className="mb-4 text-sm text-gray-600">企業からの通知・求人・説明会の案内等はLINEから受け取れます。</p>
          <a
            href="/api/line/authorize"
            className="mx-auto flex w-fit items-center justify-center rounded-md bg-[#06C755] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#05b34d]"
          >
            LINEと連携する
          </a>
        </div>
      </div>
    </div>
  );
}

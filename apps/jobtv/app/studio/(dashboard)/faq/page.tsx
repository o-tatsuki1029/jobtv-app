"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, Mail } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData: FAQItem[] = [
    {
      category: "アカウント・ログイン",
      question: "パスワードを忘れてしまいました",
      answer: "ログイン画面の「パスワードをお忘れですか？」リンクから、パスワードリセットのメールを送信できます。メールに記載されたリンクから新しいパスワードを設定してください。",
    },
    {
      category: "アカウント・ログイン",
      question: "メールアドレスを変更したい",
      answer: "セキュリティ上の理由から、メールアドレスの変更はサポートチームにお問い合わせください。本人確認の上、変更手続きをサポートいたします。",
    },
    {
      category: "メンバー管理",
      question: "チームメンバーを招待するにはどうすればよいですか？",
      answer: "「設定」→「メンバー管理」から「メンバーを招待」ボタンをクリックし、招待したいメンバーのメールアドレスと名前を入力してください。招待メールが送信されます。",
    },
    {
      category: "メンバー管理",
      question: "メンバーを削除したい",
      answer: "「設定」→「メンバー管理」から削除したいメンバーの「削除」ボタンをクリックしてください。削除されたメンバーはシステムにアクセスできなくなります。",
    },
    {
      category: "求人管理",
      question: "求人情報を公開するにはどうすればよいですか？",
      answer: "「求人管理」から求人を作成し、必要な情報を入力後、ステータスを「公開」に変更してください。公開された求人は求職者に表示されます。",
    },
    {
      category: "求人管理",
      question: "求人の掲載期間を設定できますか？",
      answer: "はい、求人作成・編集画面で掲載開始日と終了日を設定できます。終了日を過ぎると自動的に非公開になります。",
    },
    {
      category: "動画管理",
      question: "アップロードできる動画のサイズに制限はありますか？",
      answer: "1つの動画ファイルにつき最大2GBまでアップロード可能です。推奨フォーマットはMP4、解像度は1080p以下を推奨しています。",
    },
    {
      category: "動画管理",
      question: "動画の処理にどのくらい時間がかかりますか？",
      answer: "動画のサイズにもよりますが、通常5〜15分程度で処理が完了します。処理中は動画管理画面で進行状況を確認できます。",
    },
    {
      category: "候補者管理",
      question: "候補者にメッセージを送信できますか？",
      answer: "はい、候補者の詳細ページから直接メッセージを送信できます。送信したメッセージは候補者のメールアドレスに通知されます。",
    },
    {
      category: "候補者管理",
      question: "候補者のステータスを変更するにはどうすればよいですか？",
      answer: "候補者の詳細ページまたは一覧画面から、ステータスのドロップダウンメニューを選択して変更できます。変更は即座に反映されます。",
    },
    {
      category: "説明会・インターン管理",
      question: "説明会の参加者上限を設定できますか？",
      answer: "はい、説明会作成・編集画面で定員を設定できます。定員に達すると自動的に受付が終了します。",
    },
    {
      category: "説明会・インターン管理",
      question: "説明会の参加者にリマインドメールを送信できますか？",
      answer: "はい、説明会の詳細ページから参加者全員にリマインドメールを一括送信できます。開催日の前日に自動送信する設定も可能です。",
    },
    {
      category: "企業プロフィール",
      question: "企業ロゴを変更するにはどうすればよいですか？",
      answer: "「設定」→「企業プロフィール」から企業ロゴをアップロードできます。推奨サイズは500x500px、形式はPNGまたはJPEGです。",
    },
    {
      category: "企業プロフィール",
      question: "企業情報の審査にどのくらい時間がかかりますか？",
      answer: "通常、営業日2〜3日以内に審査が完了します。審査結果はメールでお知らせします。",
    },
    {
      category: "その他",
      question: "システムの推奨ブラウザは何ですか？",
      answer: "Google Chrome、Safari、Microsoft Edge、Firefoxの最新版を推奨しています。Internet Explorerには対応していません。",
    },
    {
      category: "その他",
      question: "スマートフォンからも利用できますか？",
      answer: "はい、レスポンシブデザインに対応しているため、スマートフォンやタブレットからもご利用いただけます。ただし、一部の機能はPC版での利用を推奨しています。",
    },
  ];

  const categories = Array.from(new Set(faqData.map((item) => item.category)));

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-gray-900 mb-4">よくある質問 (FAQ)</h1>
          <p className="text-gray-600 mb-6">
            JOBTV Studioの利用方法に関するよくある質問をまとめました。
          </p>
          
          {/* ベータ版の注意書き */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2">AI生成コンテンツ（ベータ版）</h3>
                <p className="text-sm text-blue-800 mb-3">
                  このFAQはAIによって生成されたベータ版のコンテンツです。内容の正確性については随時改善を行っておりますが、一部不正確な情報が含まれる可能性があります。
                </p>
                <p className="text-sm text-blue-800 font-medium">
                  ご不明な点や詳細については、お問い合わせフォームからお気軽にご連絡ください。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ一覧 */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="font-bold text-lg text-gray-900">{category}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {faqData
                  .filter((item) => item.category === category)
                  .map((item, index) => {
                    const globalIndex = faqData.indexOf(item);
                    const isOpen = openIndex === globalIndex;
                    return (
                      <div key={globalIndex} className="transition-colors hover:bg-gray-50">
                        <button
                          onClick={() => toggleFAQ(globalIndex)}
                          className="w-full px-6 py-5 flex items-center justify-between text-left"
                        >
                          <span className="font-bold text-gray-900 pr-4">{item.question}</span>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-5 pt-0">
                            <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* お問い合わせセクション */}
        <div className="mt-12 bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-bold text-xl text-gray-900 mb-2">解決しない場合は</h3>
          <p className="text-gray-600 mb-6">
            上記で解決しない場合や、その他ご不明な点がございましたら、<br />
            お気軽にお問い合わせください。
          </p>
          <StudioButton
            onClick={() => window.location.href = "/studio/settings/help"}
            icon={<Mail className="w-4 h-4" />}
          >
            お問い合わせページへ
          </StudioButton>
        </div>
      </div>
    </div>
  );
}



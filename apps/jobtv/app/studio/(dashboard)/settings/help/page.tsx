"use client";

import React from "react";
import { HelpCircle, Mail, MessageSquare } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

export default function HelpSettingsPage() {
  const helpItems = [
    {
      title: "よくある質問 (FAQ)",
      description: "サービスの利用方法に関するよくある質問をご確認いただけます。",
      icon: MessageSquare,
      action: "FAQを見る",
      href: "/studio/faq",
      external: true,
    },
    {
      title: "お問い合わせ",
      description: "ご不明な点や不具合の報告はこちらからお問い合わせください。",
      icon: Mail,
      action: "問い合わせる",
      href: "mailto:support@jobtv.jp",
      external: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">ヘルプ・サポート</h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpItems.map((item) => (
              <div key={item.title} className="p-6 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4 text-gray-600">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 mb-6">{item.description}</p>
                </div>
                <StudioButton
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (item.external) {
                      window.open(item.href, "_blank", "noopener,noreferrer");
                    } else {
                      window.location.href = item.href;
                    }
                  }}
                >
                  {item.action}
                </StudioButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


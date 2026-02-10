"use client";

import { ExternalLink } from "lucide-react";
import { XIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "@jobtv-app/shared/icons";
import StudioFormField from "./StudioFormField";
import StudioLabel from "../atoms/StudioLabel";
import { generateSnsUrl } from "@/utils/sns-url-utils";

interface StudioSnsFieldsProps {
  accountNames: {
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  onChange: (platform: "x" | "instagram" | "tiktok" | "youtube", value: string) => void;
}

const SNS_PLATFORMS = [
  { key: "tiktok" as const, label: "TikTok", icon: TikTokIcon },
  { key: "instagram" as const, label: "Instagram", icon: InstagramIcon },
  { key: "x" as const, label: "X (Twitter)", icon: XIcon },
  { key: "youtube" as const, label: "YouTube", icon: YouTubeIcon }
] as const;

export default function StudioSnsFields({ accountNames, onChange }: StudioSnsFieldsProps) {
  return (
    <>
      <div className="space-y-4">
        {SNS_PLATFORMS.map(({ key, label, icon: Icon }) => {
          // 表示用：@マークを除去
          const displayValue = (accountNames[key] || "").replace(/^@/, "");
          // 処理用：@マークを付ける
          const accountName = accountNames[key] || "";
          const generatedUrl = accountName ? generateSnsUrl(accountName, key) : "";

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-600" />
                  <StudioLabel htmlFor={`snsAccountNames.${key}`}>{label}</StudioLabel>
                </div>
                {generatedUrl && (
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{generatedUrl}</span>
                  </a>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-sm text-gray-600 font-medium pointer-events-none">@</span>
                <input
                  id={`snsAccountNames.${key}`}
                  name={`snsAccountNames.${key}`}
                  type="text"
                  value={displayValue}
                  onChange={(e) => {
                    // 入力値から@マークを除去してから、@マークを付けて保存
                    const cleanValue = e.target.value.replace(/^@/, "");
                    onChange(key, cleanValue ? `@${cleanValue}` : "");
                  }}
                  placeholder="company_name"
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/10 text-sm transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        アカウントIDを入力してください。 設定されていないSNSアイコンは非表示になります
      </p>
    </>
  );
}

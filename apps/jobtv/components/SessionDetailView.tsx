"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Clock, Users, CheckCircle2, ChevronRight, Share2 } from "lucide-react";

export interface SessionDate {
  date: string;
  time: string;
  capacity: number | null;
}

export interface SessionData {
  id: string;
  title: string;
  type: string;
  dates: SessionDate[];
  location: string;
  status: "受付中" | "終了";
  description: string;
  capacity: number | null;
  companyName: string;
  companyLogo: string;
  companyId: string;
  coverImage?: string;
}

export default function SessionDetailView({ session }: { session: SessionData }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヒーローセクション */}
      <section className="relative py-12 md:py-20 border-b border-gray-800 overflow-hidden bg-gray-800/50">
        {session.coverImage && (
          <>
            <div className="absolute inset-0 z-0">
              <Image src={session.coverImage} alt={session.title} fill className="object-cover" priority />
            </div>
            <div className="absolute inset-0 z-0 bg-black/60" />
          </>
        )}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              {session.type && (
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-sm uppercase tracking-wider">
                  {session.type}
                </span>
              )}
              <span
                className={`px-3 py-1 text-xs font-black rounded-sm uppercase tracking-wider ${
                  session.status === "受付中" ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"
                }`}
              >
                {session.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black mb-8 leading-tight text-white bg-black/40 backdrop-blur-sm px-4 py-3 rounded-lg inline-block">
              {session.title}
            </h1>
            <div className="flex flex-wrap gap-y-4 gap-x-8 text-sm md:text-base">
              {session.dates.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-800 flex flex-col items-center justify-center border border-gray-700 text-red-500">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">開催日</p>
                    <p className="font-bold">{session.dates[0].date}</p>
                    {session.dates.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1">他 {session.dates.length - 1}日程</p>
                    )}
                  </div>
                </div>
              )}
              {session.dates.length > 0 && session.dates[0].time && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-800 flex flex-col items-center justify-center border border-gray-700 text-red-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">時間</p>
                    <p className="font-bold">{session.dates[0].time}</p>
                  </div>
                </div>
              )}
              {session.location && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-800 flex flex-col items-center justify-center border border-gray-700 text-red-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">会場</p>
                    <p className="font-bold">{session.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-12">
            {/* 説明会内容 */}
            <section className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                説明会の内容
              </h2>
              <div className="bg-gray-800/30 p-6 md:p-8 rounded-lg border border-gray-800 leading-relaxed text-gray-300 whitespace-pre-wrap">
                {session.description || "内容が登録されていません。"}
              </div>
            </section>

            {/* 日程一覧 */}
            {session.dates.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  開催日程
                </h2>
                <div className="space-y-4">
                  {session.dates.map((date, index) => (
                    <div key={index} className="bg-gray-800/30 p-6 rounded-lg border border-gray-800">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-800 flex flex-col items-center justify-center border border-gray-700 text-red-500">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{date.date}</p>
                            <p className="text-sm text-gray-400 mt-1">{date.time}</p>
                          </div>
                        </div>
                        {date.capacity && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>定員: {date.capacity}名</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 定員（全体） */}
            {session.capacity && (
              <section className="space-y-6">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  定員
                </h2>
                <div className="bg-gray-800/30 p-6 md:p-8 rounded-lg border border-gray-800 leading-relaxed text-gray-300 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  {session.capacity}名
                </div>
              </section>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-8">
            <div className="sticky top-6 space-y-6">
              {/* 予約カード */}
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-800 shadow-xl">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">予約申し込み</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={session.companyLogo}
                      alt={session.companyName}
                      fill
                      className="object-cover rounded-md border border-gray-700"
                    />
                  </div>
                  <div>
                    <p className="font-black text-lg leading-tight">{session.companyName}</p>
                    <p className="text-xs text-gray-500 font-bold mt-1">主催企業</p>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-700 space-y-4">
                  <button className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-black text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/20">
                    参加予約をする
                  </button>
                  <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-md font-bold text-sm transition-all flex items-center justify-center gap-2 border border-gray-700">
                    <Share2 className="w-4 h-4" />
                    このイベントをシェア
                  </button>
                </div>
              </div>

              {/* 企業リンク */}
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                <Link
                  href={`/company/${session.companyId}`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">
                    企業詳細ページへ
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-red-500 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

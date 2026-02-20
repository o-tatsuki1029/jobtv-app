"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Users, CheckCircle2, ChevronRight } from "lucide-react";

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
  graduationYear?: number;
}

export default function SessionDetailView({ session }: { session: SessionData }) {
  return (
    <div className="min-h-screen text-white">
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
              {session.graduationYear && (
                <span className="px-2 py-0.5 bg-red-600/10 text-red-500 text-[10px] md:text-xs font-bold rounded border border-red-600/20">
                  {session.graduationYear}年卒対象
                </span>
              )}
              {session.type && (
                <span className="px-2 py-0.5 bg-blue-600/10 text-blue-500 text-[10px] md:text-xs font-bold rounded border border-blue-600/20">
                  {session.type}
                </span>
              )}
              {session.status === "受付中" && (
                <span className="px-2 py-0.5 bg-green-600/10 text-green-500 text-[10px] md:text-xs font-bold rounded border border-green-600/20">
                  {session.status}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-black mb-8 leading-tight text-white bg-black/40 backdrop-blur-sm px-4 py-3 rounded-lg inline-block">
              {session.title}
            </h1>
            <div className="flex flex-wrap gap-6 text-sm md:text-base">
              {session.dates.length > 0 && (
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                    <Calendar className="w-5 h-5 text-red-500" />
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
              {session.location && (
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                    <MapPin className="w-5 h-5 text-red-500" />
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
              <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
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
                    <div key={index} className="bg-gray-800/50 p-6 rounded-lg">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                            <Calendar className="w-5 h-5 text-red-500" />
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
                <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  {session.capacity}名
                </div>
              </section>
            )}
          </div>

          {/* サイドバー */}
          <div className="sticky top-5 space-y-6">
            {/* 企業情報カード */}
            <div className="bg-gray-800/50 p-6 rounded-lg shadow-xl">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">主催企業</h3>
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
                  <Link
                    href={`/company/${session.companyId}`}
                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1 mt-1"
                  >
                    企業詳細を見る
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-700 space-y-4">
                <button className="w-full py-4 bg-gradient-to-br from-red-600 to-pink-800 hover:from-red-500 hover:to-pink-700 text-white rounded-md font-bold text-lg transition-all transform active:scale-[0.9] cursor-pointer">
                  参加予約をする
                </button>
                <p className="text-[10px] text-center text-gray-500 font-bold">予約にはログインが必要です</p>
              </div>
            </div>

            {/* 安全な取引のためのヒント */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-800 border-dashed">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-400">JOBTV安心への取り組み</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    掲載されている説明会情報は、JOBTVの審査を通過した信頼できる企業のものです。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

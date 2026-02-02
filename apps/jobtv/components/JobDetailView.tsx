"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Briefcase, Clock, CheckCircle2, ChevronRight, Building } from "lucide-react";

export interface JobData {
  id: string;
  title: string;
  graduationYear?: string;
  location: string;
  status: "published" | "private";
  description: string;
  workLocation?: string;
  workConditions?: string;
  requirements: string;
  benefits: string;
  selectionProcess: string;
  companyName: string;
  companyLogo: string;
  coverImage?: string;
}

export default function JobDetailView({ job }: { job: JobData }) {
  const [showStickyButton, setShowStickyButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const threshold = 100; // 最下部から100px以内を「最下部」と判定

      // 300px以上スクロールしていて、かつ最下部に到達していない場合のみ表示
      const isScrolled = scrollY > 300;
      const isAtBottom = scrollY + windowHeight >= documentHeight - threshold;

      setShowStickyButton(isScrolled && !isAtBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* ヒーローセクション */}
      <section className="relative py-12 md:py-20 border-b border-gray-800 overflow-hidden bg-gray-800/50">
        {job.coverImage && (
          <>
            <div className="absolute inset-0 z-0">
              <Image src={job.coverImage} alt={job.title} fill className="object-cover" priority />
            </div>
            <div className="absolute inset-0 z-0 bg-black/60" />
          </>
        )}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-0.5 bg-red-600/10 text-red-500 text-[10px] md:text-xs font-bold rounded border border-red-600/20">
                {job.graduationYear || "2028年卒"}
              </span>
              <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                2日前
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black mb-8 leading-tight">{job.title}</h1>
            <div className="flex flex-wrap gap-6 text-sm md:text-base">
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                  <MapPin className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">勤務地</p>
                  <p className="font-bold">{job.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-12">
            {/* エントリーボタン（SP版のみ） */}
            <section className="lg:hidden">
              <button className="w-full py-4 bg-gradient-to-br from-red-600 to-pink-800 hover:from-red-500 hover:to-pink-700 text-white rounded-md font-bold text-base transition-all transform active:scale-[0.9] cursor-pointer">
                この求人にエントリー
              </button>
            </section>

            {/* 職務内容 */}
            <section className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                職務内容
              </h2>
              <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                {job.description || "職務内容が登録されていません。"}
              </div>
            </section>

            {/* 勤務地 */}
            {job.workLocation && (
              <section className="space-y-6">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  勤務地
                </h2>
                <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                  {job.workLocation}
                </div>
              </section>
            )}

            {/* 応募資格 */}
            <section className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                応募資格
              </h2>
              <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                {job.requirements || "応募資格が登録されていません。"}
              </div>
            </section>

            {/* 選考フロー */}
            <section className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                選考フロー
              </h2>
              <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                {job.selectionProcess || "選考フローが登録されていません。"}
              </div>
            </section>

            {/* 福利厚生 */}
            <section className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                福利厚生・制度
              </h2>
              <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                {job.benefits || "福利厚生が登録されていません。"}
              </div>
            </section>

            {/* 勤務条件 */}
            {job.workConditions && (
              <section className="space-y-6">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  勤務条件
                </h2>
                <div className="bg-gray-800/50 p-6 md:p-8 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                  {job.workConditions}
                </div>
              </section>
            )}
          </div>

          {/* サイドバー */}
          <div className="sticky top-5 space-y-6">
            {/* 企業情報カード */}
            <div className="bg-gray-800/50 p-6 rounded-lg shadow-xl">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">募集企業</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={job.companyLogo}
                    alt={job.companyName}
                    fill
                    className="object-cover rounded-md border border-gray-700"
                  />
                </div>
                <div>
                  <p className="font-black text-lg leading-tight">{job.companyName}</p>
                  <Link
                    href="#"
                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1 mt-1"
                  >
                    企業詳細を見る
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-700 space-y-4">
                <button className="w-full py-4 bg-gradient-to-br from-red-600 to-pink-800 hover:from-red-500 hover:to-pink-700 text-white rounded-md font-bold text-lg transition-all transform active:scale-[0.9] cursor-pointer">
                  この求人にエントリー
                </button>
                <p className="text-[10px] text-center text-gray-500 font-bold">エントリーにはログインが必要です</p>
              </div>
            </div>

            {/* 安全な取引のためのヒントなど */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-800 border-dashed">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-400">JOBTV安心への取り組み</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    掲載されている求人情報は、JOBTVの審査を通過した信頼できる企業のものです。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 固定エントリーボタン（スクロール時・SP版のみ） */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out lg:hidden ${
          showStickyButton ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-gray-800/30 backdrop-blur-sm border-t border-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                  <Image src={job.companyLogo} alt={job.companyName} fill className="object-contain rounded" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm md:text-base font-bold text-white truncate">{job.title}</h3>
                  <p className="text-xs md:text-sm text-gray-400 truncate">{job.companyName}</p>
                </div>
              </div>
              <button className="flex-shrink-0 px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-br from-red-600 to-pink-800 hover:from-red-500 hover:to-pink-700 text-white rounded-md font-bold text-sm md:text-base transition-all transform active:scale-[0.9] cursor-pointer whitespace-nowrap">
                この求人にエントリー
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

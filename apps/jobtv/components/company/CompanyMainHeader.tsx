"use client";

import Image from "next/image";
import VideoPlayer from "@/components/VideoPlayer";
import type { CompanyData } from "./types";

interface CompanyMainHeaderProps {
  company: CompanyData;
}

export default function CompanyMainHeader({ company }: CompanyMainHeaderProps) {
  return (
    <section className="-mx-4 md:mx-0">
      {company.mainVideo && (
        <div className="overflow-hidden md:rounded-lg shadow-2xl border-y md:border border-gray-800 bg-black">
          <VideoPlayer
            src={company.mainVideo}
            poster={company.coverImage || undefined}
            className="w-full aspect-video"
          />
        </div>
      )}
      <div
        className={`${
          company.mainVideo ? "mt-4 md:mt-6" : ""
        } px-4 md:px-0 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6`}
      >
        <div className="flex items-center gap-4 md:gap-5">
          <div className="relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
            <Image
              src={company.logo}
              alt={company.name}
              fill
              className="object-cover rounded-md border border-gray-800"
            />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-white mb-0.5">{company.name}</h1>
            <p className="text-gray-400 text-[10px] md:text-sm font-medium">{company.industry}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button className="w-full md:w-auto px-6 py-3 bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-md font-bold text-base transition-all transform active:scale-[0.9] cursor-pointer">
            エントリーする
          </button>
        </div>
      </div>
    </section>
  );
}

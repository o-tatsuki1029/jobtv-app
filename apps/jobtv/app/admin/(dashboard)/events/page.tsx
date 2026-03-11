"use client";

import React, { useState } from "react";
import { Calendar } from "lucide-react";
import Tabs from "@/components/studio/molecules/Tabs";
import EventsListTab from "./_components/EventsListTab";
import MasterEventTypesTab from "./_components/MasterEventTypesTab";
import MasterAreasTab from "./_components/MasterAreasTab";
import MasterGraduationYearsTab from "./_components/MasterGraduationYearsTab";

const TOP_TABS = [
  { id: "events", label: "イベント一覧", color: "black" as const },
  { id: "masters", label: "マスタ管理", color: "black" as const },
];

const MASTER_TABS = [
  { id: "event-types", label: "イベントタイプ", color: "black" as const },
  { id: "areas", label: "エリア", color: "black" as const },
  { id: "graduation-years", label: "卒業年度", color: "black" as const },
];

export default function AdminEventsPage() {
  const [activeTab, setActiveTab] = useState("events");
  const [activeMasterTab, setActiveMasterTab] = useState("event-types");

  return (
    <div className="space-y-10">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Calendar className="w-8 h-8" />
          イベント管理
        </h1>
        <p className="text-gray-500 font-medium">イベントの作成・編集・削除、マスタデータの管理を行えます。</p>
      </div>

      {/* メインタブ */}
      <Tabs tabs={TOP_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* イベント一覧 */}
      {activeTab === "events" && <EventsListTab />}

      {/* マスタ管理 */}
      {activeTab === "masters" && (
        <div className="space-y-8">
          <Tabs tabs={MASTER_TABS} activeTab={activeMasterTab} onTabChange={setActiveMasterTab} />
          {activeMasterTab === "event-types" && <MasterEventTypesTab />}
          {activeMasterTab === "areas" && <MasterAreasTab />}
          {activeMasterTab === "graduation-years" && <MasterGraduationYearsTab />}
        </div>
      )}
    </div>
  );
}

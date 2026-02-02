"use client";

import React from "react";
import JobDetailView, { JobData } from "@/components/JobDetailView";

// モックデータ
const mockJob: JobData = {
  id: "1",
  title: "機械学習エンジニア (LLM)",
  graduationYear: "2028年卒",
  location: "東京都港区（リモート可）",
  status: "published",
  description:
    "サンプル株式会社では、次世代のLLM（大規模言語モデル）のフロントエンドおよびバックエンドの開発、並びにファインチューニングを担当していただく機械学習エンジニアを募集しています。\n\n具体的には、最新の論文に基づいたアルゴリズムの実装や、商用レベルでのスケーラビリティを考慮したインフラ構築まで、幅広く携わっていただきます。",
  workLocation:
    "東京都港区六本木 6-10-1 六本木ヒルズ森タワー 25F\n\n【アクセス】\n・東京メトロ日比谷線「六本木駅」徒歩5分\n・都営大江戸線「六本木駅」徒歩7分\n・リモートワーク可（週2〜3日出社推奨）",
  workConditions:
    "【勤務時間】\nフルフレックス制度（コアタイム 11:00〜15:00）\n\n【休日・休暇】\n・週休2日制（土日祝日）\n・年末年始休暇\n・有給休暇（入社時10日付与）\n・慶弔休暇\n・リフレッシュ休暇\n\n【雇用形態】\n正社員（試用期間3ヶ月）",
  requirements:
    "・Pythonによる開発経験3年以上\n・PyTorchまたはTensorFlowを用いた機械学習モデルの実装経験\n・自然言語処理（NLP）に関する専門知識\n・Gitを用いたチーム開発経験",
  benefits:
    "・フルリモート・フルフレックス制度\n・最新MacBook Pro支給\n・外部ディスプレイ貸与\n・技術書籍購入補助（上限なし）\n・カンファレンス参加費補助",
  selectionProcess:
    "1. カジュアル面談（オンライン）\n2. 書類選考\n3. 技術テスト・1次面接\n4. 最終面接（オフィスまたはオンライン）",
  companyName: "サンプル株式会社",
  companyLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
  coverImage: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=400&fit=crop"
};

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  // 実際の実装では params.id を使用してデータを取得
  return <JobDetailView job={mockJob} />;
}

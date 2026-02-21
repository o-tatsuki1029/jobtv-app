"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Modal from "@/components/ui/modals/Modal";
import CandidateModalForm from "@/components/ui/modals/CandidateModalForm";
import Table from "@/components/ui/table/Table";
import Pagination from "@/components/ui/table/Pagination";
import PageSizeSelect from "@/components/ui/table/PageSizeSelect";
import KeywordFilter from "@/components/ui/filters/KeywordFilter";
import CandidateCSVExport from "@/components/ui/csv/CandidateCSVExport";
import CandidateCSVImport from "@/components/ui/csv/CandidateCSVImport";
import CandidateTableActions from "@/components/ui/table/CandidateTableActions";
import Button from "@/components/ui/Button";
import { Candidate, CandidateWithEmail } from "@/types/candidate.types";
import { useModal } from "@/hooks/useModal";
import { usePagination } from "@/hooks/usePagination";
import { useSort } from "@/hooks/useSort";
import { useCandidates } from "@/hooks/useCandidates";

const headers: { label: string; key: keyof CandidateWithEmail }[] = [
  { label: "姓", key: "last_name" },
  { label: "名", key: "first_name" },
  { label: "姓カナ", key: "last_name_kana" },
  { label: "名カナ", key: "first_name_kana" },
  { label: "卒年度", key: "graduation_year" },
  { label: "メールアドレス", key: "email" },
  { label: "電話番号", key: "phone" },
  { label: "学校名", key: "school_name" },
];

export default function CandidatesPage() {
  const modal = useModal(); // モーダルの開閉状態を管理（学生作成・編集モーダル用）
  const pagination = usePagination(); // ページネーションの状態を管理（現在のページ、ページサイズ、総件数）

  // テーブルのソート状態を管理（ソートキーと昇順/降順）
  const sort = useSort<keyof CandidateWithEmail>({
    initialKey: "last_name" as keyof CandidateWithEmail, // 初期ソートは姓
    initialAsc: true, // 昇順
  });

  const [editingCandidate, setEditingCandidate] = useState<CandidateWithEmail | null>(
    null
  );
  const [keyword, setKeyword] = useState("");

  // 学生データ取得のカスタムフック
  // キーワード、ソート、ページネーション条件に基づいて学生一覧を取得
  const { candidates, isLoading, error, fetchCandidates, setError } =
    useCandidates({
      keyword,
      pagination,
      sort,
    });

  // キーワード変更時は1ページ目へ: キーワード変更時にページをリセットして最初から表示
  useEffect(() => {
    pagination.resetPage();
  }, [keyword]);

  // モーダルを閉じる処理: モーダルを閉じて編集状態をクリアし、データを再取得
  const handleCloseModal = useCallback(() => {
    modal.close();
    setEditingCandidate(null);
    fetchCandidates();
  }, [modal, fetchCandidates]);

  // 新規作成モーダルを開く処理: 編集状態をクリアしてからモーダルを開く
  const handleOpenCreateModal = useCallback(() => {
    setEditingCandidate(null);
    modal.open();
  }, [modal]);

  // 編集モーダルを開く処理: 選択した学生を編集状態に設定してモーダルを開く
  const handleEditClick = useCallback(
    (candidate: CandidateWithEmail) => {
      setEditingCandidate(candidate);
      modal.open();
    },
    [modal]
  );

  // ソート処理: テーブルの列をクリックしたときにソートを実行し、1ページ目に戻る
  const handleSort = useCallback(
    (key: keyof CandidateWithEmail) => {
      sort.handleSort(key as keyof CandidateWithEmail);
      pagination.resetPage(); // ソート変更時は1ページ目から表示
    },
    [sort, pagination]
  );

  // キーワード変更処理: キーワードを更新し、エラーをクリア
  const handleKeywordChange = useCallback(
    (value: string) => {
      setKeyword(value);
      setError(null);
    },
    [setError]
  );

  // 表示用データの準備
  const displayData = useMemo(
    () =>
      candidates.map((c) => ({
        ...c,
        graduation_year: c.graduation_year ? String(c.graduation_year) : "-",
        last_name: c.last_name || "",
        first_name: c.first_name || "",
        last_name_kana: c.last_name_kana || "",
        first_name_kana: c.first_name_kana || "",
        phone: c.phone || "-",
        school_name: c.school_name || "-",
      })),
    [candidates]
  );

  return (
    <div>
      {/* 学生作成・編集モーダル: editingCandidateがnullなら新規作成、値があれば編集 */}
      <Modal isOpen={modal.isOpen} onClose={handleCloseModal}>
        <CandidateModalForm
          onClose={handleCloseModal}
          initialData={editingCandidate || undefined}
        />
      </Modal>

      <h2 className="text-xl font-semibold mb-4">学生管理</h2>

      {/* エラー表示: データ取得時にエラーが発生した場合に表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* アクションボタンエリア: CSVエクスポート、CSVインポート、新規作成ボタン */}
      <div className="my-5 flex justify-end gap-2 font-semibold">
        <CandidateCSVExport
          keyword={keyword}
          sortKey={sort.sortKey as keyof CandidateWithEmail}
          sortAsc={sort.sortAsc}
        />
        <CandidateCSVImport />
        <Button variant="primary" size="lg" onClick={handleOpenCreateModal}>
          ＋学生追加
        </Button>
      </div>

      {/* 検索フィルター: メールアドレス・電話番号・フルネームで学生を絞り込み */}
      <div className="mb-3 flex items-end gap-3">
        <KeywordFilter
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="メールアドレス・電話番号・フルネーム"
          label="検索"
        />
        {keyword && (
          <Button
            type="button"
            onClick={() => handleKeywordChange("")}
            variant="light"
            size="sm"
          >
            クリア
          </Button>
        )}
      </div>

      {/* 学生一覧テーブル: フィルター・ソート・ページネーション適用済みのデータを表示 */}
      <Table
        headers={headers}
        data={displayData}
        isLoading={isLoading}
        sortKey={sort.sortKey as keyof CandidateWithEmail}
        sortAsc={sort.sortAsc}
        onSort={handleSort}
        renderActions={(row) => {
          const candidate = candidates.find(
            (c) => c.id === (row as { id: string }).id
          ) as CandidateWithEmail;
          return (
            <CandidateTableActions
              candidate={candidate}
              onEdit={handleEditClick}
            />
          );
        }}
      />

      {/* ページネーションコントロール: ページサイズ選択とページ送り */}
      <div className="mt-4 flex items-center justify-end gap-4">
        <PageSizeSelect
          pageSize={pagination.pageSize}
          onChange={pagination.setPageSize}
        />
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          onPrev={pagination.goToPrevPage}
          onNext={pagination.goToNextPage}
        />
      </div>
    </div>
  );
}


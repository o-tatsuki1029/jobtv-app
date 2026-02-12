import { useState, useEffect, useCallback, useRef } from "react";

export interface UseListPageOptions<T> {
  loadData: () => Promise<{ data: T[] | null; error: string | null }>;
  statusMapper?: (item: T) => "draft" | "pending" | "active" | "closed";
  sortOptions: Array<{ value: string; label: string }>;
  filterOptions: Array<{ value: string; label: string }>;
}

export interface UseListPageReturn<T> {
  items: T[];
  filteredItems: T[];
  loading: boolean;
  error: string | null;
  statusFilter: string;
  sortBy: string;
  setStatusFilter: (filter: string) => void;
  setSortBy: (sort: string) => void;
  setError: (error: string | null) => void;
  reload: () => Promise<void>;
}

/**
 * リストページ用のカスタムフック
 * フィルタリング、ソート、ローディング、エラー処理を共通化
 */
export function useListPage<T extends { id: string; created_at?: string | null; updated_at?: string | null }>({
  loadData,
  statusMapper,
  sortOptions,
  filterOptions
}: UseListPageOptions<T>): UseListPageReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [filteredItems, setFilteredItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at_desc");

  // statusMapperの最新の参照を保持
  const statusMapperRef = useRef(statusMapper);
  useEffect(() => {
    statusMapperRef.current = statusMapper;
  }, [statusMapper]);

  // フィルターとソートを適用する関数
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...items];

    // ステータスでフィルター
    if (statusFilter !== "all" && statusMapperRef.current) {
      filtered = filtered.filter((item) => {
        const status = statusMapperRef.current!(item);
        return status === statusFilter;
      });
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return ((a as any).title || "").localeCompare((b as any).title || "");
        case "title_desc":
          return ((b as any).title || "").localeCompare((a as any).title || "");
        case "created_at_asc":
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
        case "created_at_desc":
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
        case "updated_at_asc":
          return new Date(a.updated_at || "").getTime() - new Date(b.updated_at || "").getTime();
        case "updated_at_desc":
        default:
          return new Date(b.updated_at || "").getTime() - new Date(a.updated_at || "").getTime();
      }
    });

    setFilteredItems(filtered);
  }, [items, statusFilter, sortBy]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadData();
    if (result.error) {
      setError(result.error);
      setItems([]);
      setFilteredItems([]);
    } else if (result.data) {
      setItems(result.data);
      setFilteredItems(result.data);
    } else {
      setItems([]);
      setFilteredItems([]);
    }
    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    reload();
  }, [reload]);

  // フィルターとソートを適用
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  return {
    items,
    filteredItems,
    loading,
    error,
    statusFilter,
    sortBy,
    setStatusFilter,
    setSortBy,
    setError,
    reload
  };
}


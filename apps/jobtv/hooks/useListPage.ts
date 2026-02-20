import { useState, useEffect, useCallback, useRef, useMemo } from "react";

export interface UseListPageOptions<T> {
  loadData: () => Promise<{ data: T[] | null; error: string | null }>;
  statusMapper?: (item: T) => "draft" | "submitted" | "active" | "closed";
  graduationYearMapper?: (item: T) => number | null | undefined;
  sortOptions: Array<{ value: string; label: string }>;
  filterOptions: Array<{ value: string; label: string }>;
}

export interface UseListPageReturn<T> {
  items: T[];
  filteredItems: T[];
  loading: boolean;
  error: string | null;
  statusFilter: string;
  graduationYearFilter: string;
  sortBy: string;
  availableGraduationYears: number[];
  availableStatuses: Array<"draft" | "submitted" | "active" | "closed">;
  setStatusFilter: (filter: string) => void;
  setGraduationYearFilter: (filter: string) => void;
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
  graduationYearMapper,
  sortOptions,
  filterOptions
}: UseListPageOptions<T>): UseListPageReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [filteredItems, setFilteredItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [graduationYearFilter, setGraduationYearFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("display_order_asc");

  // statusMapperの最新の参照を保持
  const statusMapperRef = useRef(statusMapper);
  useEffect(() => {
    statusMapperRef.current = statusMapper;
  }, [statusMapper]);

  // graduationYearMapperの最新の参照を保持
  const graduationYearMapperRef = useRef(graduationYearMapper);
  useEffect(() => {
    graduationYearMapperRef.current = graduationYearMapper;
  }, [graduationYearMapper]);

  // データから利用可能な卒年度を抽出
  const availableGraduationYears = useMemo(() => {
    if (!graduationYearMapperRef.current) return [];
    const years = new Set<number>();
    items.forEach((item) => {
      const year = graduationYearMapperRef.current!(item);
      if (year !== null && year !== undefined) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // 降順（新しい年度が先）
  }, [items]);

  // データから利用可能なステータスを抽出
  const availableStatuses = useMemo(() => {
    if (!statusMapperRef.current) return [];
    const statuses = new Set<"draft" | "submitted" | "active" | "closed">();
    items.forEach((item) => {
      const status = statusMapperRef.current!(item);
      if (status) {
        statuses.add(status);
      }
    });
    // 定義された順序でソート
    const statusOrder: Array<"draft" | "submitted" | "active" | "closed"> = ["draft", "submitted", "active", "closed"];
    return statusOrder.filter((s) => statuses.has(s));
  }, [items]);

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

    // 卒年度でフィルター
    if (graduationYearFilter !== "all" && graduationYearMapperRef.current) {
      const targetYear = parseInt(graduationYearFilter, 10);
      filtered = filtered.filter((item) => {
        const year = graduationYearMapperRef.current!(item);
        return year === targetYear;
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
          return new Date(b.updated_at || "").getTime() - new Date(a.updated_at || "").getTime();
        case "display_order_asc":
          return ((a as any).display_order || 0) - ((b as any).display_order || 0);
        case "display_order_desc":
          return ((b as any).display_order || 0) - ((a as any).display_order || 0);
        case "graduation_year_asc":
          return ((a as any).graduation_year || 0) - ((b as any).graduation_year || 0);
        case "graduation_year_desc":
          return ((b as any).graduation_year || 0) - ((a as any).graduation_year || 0);
        default:
          return new Date(b.updated_at || "").getTime() - new Date(a.updated_at || "").getTime();
      }
    });

    setFilteredItems(filtered);
  }, [items, statusFilter, graduationYearFilter, sortBy]);

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
    graduationYearFilter,
    sortBy,
    availableGraduationYears,
    availableStatuses,
    setStatusFilter,
    setGraduationYearFilter,
    setSortBy,
    setError,
    reload
  };
}


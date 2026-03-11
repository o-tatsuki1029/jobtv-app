"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Search, Building } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import {
  getEventCompanies,
  addEventCompany,
  removeEventCompany,
  searchCompanies,
} from "@/lib/actions/event-admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type EventCompanyWithCompany = Tables<"event_companies"> & {
  companies: Tables<"companies"> | null;
};

interface EventCompaniesTabProps {
  eventId: string;
}

export default function EventCompaniesTab({ eventId }: EventCompaniesTabProps) {
  const [companies, setCompanies] = useState<EventCompanyWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 検索
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tables<"companies">[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 追加・削除中
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadCompanies = async () => {
    setLoading(true);
    const res = await getEventCompanies(eventId);
    if (res.error) {
      setError(res.error);
    } else {
      setCompanies(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // デバウンス検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchCompanies(searchQuery.trim());
      if (res.data) {
        // 既に追加済みの企業を除外
        const existingIds = new Set(companies.map((c) => c.company_id));
        setSearchResults(res.data.filter((c) => !existingIds.has(c.id)));
      }
      setIsSearching(false);
      setShowDropdown(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, companies]);

  const handleAddCompany = async (companyId: string) => {
    setIsAdding(true);
    setError(null);
    const { error: addError } = await addEventCompany(eventId, companyId);
    if (addError) {
      setError(addError);
    } else {
      setSuccessMessage("企業を追加しました");
      setSearchQuery("");
      setSearchResults([]);
      setShowDropdown(false);
      await loadCompanies();
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setIsAdding(false);
  };

  const handleRemoveCompany = async (eventCompanyId: string) => {
    setRemovingId(eventCompanyId);
    setError(null);
    const { error: removeError } = await removeEventCompany(eventCompanyId);
    if (removeError) {
      setError(removeError);
    } else {
      setSuccessMessage("企業を削除しました");
      await loadCompanies();
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setRemovingId(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* 企業検索・追加 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">企業を追加</h3>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="企業名で検索..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-gray-900"
              disabled={isAdding}
            />
          </div>
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-gray-500">検索中...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">該当する企業がありません</div>
              ) : (
                searchResults.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleAddCompany(company.id)}
                    disabled={isAdding}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-b-0 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-green-600 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">{company.name}</div>
                      <div className="text-xs text-gray-500">{company.industry || "-"}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 参加企業テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">企業名</th>
                <th className="px-6 py-4">業界</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>参加企業がありません</p>
                  </td>
                </tr>
              ) : (
                companies.map((ec) => (
                  <tr key={ec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{ec.companies?.name || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{ec.companies?.industry || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StudioButton
                        variant="outline"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleRemoveCompany(ec.id)}
                        disabled={removingId === ec.id}
                      >
                        {removingId === ec.id ? "削除中..." : "削除"}
                      </StudioButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

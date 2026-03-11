"use server";

import pino from "pino";
import { createClient } from "@jobtv-app/shared/supabase/server";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

const logger = pino({ name: "shared/supabase-actions" });

/**
 * Supabase CRUD操作の共通ユーティリティ
 * 基本的なCRUD操作を提供し、各アプリで再利用可能にする
 */

/**
 * 共通の返却型
 */
export type SupabaseResult<T> = {
  data: T | null;
  error: string | null;
};

/**
 * クエリオプション
 */
export type QueryOptions<TableName extends keyof Database["public"]["Tables"]> = {
  select?: string;
  eq?: Array<{ column: keyof Tables<TableName>; value: unknown }>;
  order?: { column: keyof Tables<TableName>; ascending?: boolean };
  limit?: number;
};

/**
 * テーブルからデータを取得
 */
export async function supabaseSelect<TableName extends keyof Database["public"]["Tables"]>(
  table: TableName,
  options: QueryOptions<TableName> = {}
): Promise<SupabaseResult<Tables<TableName>[]>> {
  try {
    const supabase = await createClient();
    let query = supabase.from(table).select(options.select || "*");

    if (options.eq) {
      options.eq.forEach(({ column, value }) => {
        query = query.eq(column as string, value);
      });
    }

    if (options.order) {
      query = query.order(options.order.column as string, {
        ascending: options.order.ascending ?? true,
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ action: "supabaseSelect", err: error, table }, "データの取得に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: data as Tables<TableName>[], error: null };
  } catch (error) {
    logger.error({ action: "supabaseSelect", err: error, table }, "予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました",
    };
  }
}

/**
 * レコードを挿入
 */
export async function supabaseInsert<TableName extends keyof Database["public"]["Tables"]>(
  table: TableName,
  values: Partial<TablesInsert<TableName>>
): Promise<SupabaseResult<Tables<TableName>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .insert(values)
      .select()
      .single();

    if (error) {
      logger.error({ action: "supabaseInsert", err: error, table }, "レコードの挿入に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: data as Tables<TableName>, error: null };
  } catch (error) {
    logger.error({ action: "supabaseInsert", err: error, table }, "予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました",
    };
  }
}

/**
 * レコードを更新
 */
export async function supabaseUpdate<TableName extends keyof Database["public"]["Tables"]>(
  table: TableName,
  values: Partial<TablesUpdate<TableName>>,
  match: Partial<Tables<TableName>>
): Promise<SupabaseResult<Tables<TableName>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .match(match)
      .select()
      .single();

    if (error) {
      logger.error({ action: "supabaseUpdate", err: error, table }, "レコードの更新に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: data as Tables<TableName>, error: null };
  } catch (error) {
    logger.error({ action: "supabaseUpdate", err: error, table }, "予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました",
    };
  }
}

/**
 * レコードを削除
 */
export async function supabaseDelete<TableName extends keyof Database["public"]["Tables"]>(
  table: TableName,
  match: Partial<Tables<TableName>>
): Promise<SupabaseResult<Tables<TableName>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .delete()
      .match(match)
      .select()
      .single();

    if (error) {
      logger.error({ action: "supabaseDelete", err: error, table }, "レコードの削除に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: data as Tables<TableName>, error: null };
  } catch (error) {
    logger.error({ action: "supabaseDelete", err: error, table }, "予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました",
    };
  }
}

/**
 * 単一レコードをIDで取得
 */
export async function supabaseGetById<TableName extends keyof Database["public"]["Tables"]>(
  table: TableName,
  id: string
): Promise<SupabaseResult<Tables<TableName>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error({ action: "supabaseGetById", err: error, table, id }, "レコードの取得に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: data as Tables<TableName>, error: null };
  } catch (error) {
    logger.error({ action: "supabaseGetById", err: error, table, id }, "予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました",
    };
  }
}






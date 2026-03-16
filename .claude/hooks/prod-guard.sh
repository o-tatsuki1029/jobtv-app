#!/bin/bash
# .claude/hooks/prod-guard.sh
# Claude Code PreToolUse hook — PROD DB 保護ガード
# PROD への危険な操作を物理的にブロックする（docs/database.md「本番データベース変更ルール」参照）

PROD_PROJECT_ID="voisychklptvavokrxox"

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

case "$TOOL_NAME" in

  # ── Bash コマンド ──
  Bash)
    CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

    # supabase db reset: PROD リンク時に実行すると全データ消失
    if echo "$CMD" | grep -qE 'supabase\s+db\s+reset'; then
      block "'supabase db reset' は禁止操作です。全データが消失します。"
    fi
    ;;

  # ── Supabase MCP: 直接 SQL 実行 ──
  mcp__supabase__execute_sql)
    PROJECT_ID=$(echo "$INPUT" | jq -r '.tool_input.project_id // empty')

    if [ "$PROJECT_ID" = "$PROD_PROJECT_ID" ]; then
      block "PROD への直接 SQL 実行は禁止です。マイグレーションファイル経由で適用してください。"
    fi
    ;;

  # ── Supabase MCP: マイグレーション適用 ──
  mcp__supabase__apply_migration)
    PROJECT_ID=$(echo "$INPUT" | jq -r '.tool_input.project_id // empty')

    if [ "$PROJECT_ID" = "$PROD_PROJECT_ID" ]; then
      block "PROD への MCP 経由マイグレーション適用は禁止です。'pnpm db:push:prod' を使用してください。"
    fi
    ;;

esac

exit 0

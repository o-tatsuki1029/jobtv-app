# MCP サーバー設定・用途ガイド

## 概要

MCP（Model Context Protocol）は、AI エージェント（Claude Code / Cursor）が外部サービスと連携するためのプロトコル。
このプロジェクトでは以下の MCP サーバーを利用して、DB 操作・GitHub 連携・ドキュメント参照・デプロイ管理を AI から直接行える。

---

## MCPサーバー一覧と用途

| サーバー名 | 種別 | 主な用途 |
|-----------|------|----------|
| `supabase` | HTTP | DB操作・マイグレーション適用・型生成・ログ確認 |
| `github` | HTTP | Issue/PR管理・コードプッシュ・ブランチ操作 |
| `vercel` | HTTP | デプロイ管理・ビルドログ確認・環境変数操作 |
| `context7` | stdio | Next.js/Supabase 等の最新ドキュメント取得 |
| `playwright` | stdio | ブラウザ操作・E2Eテスト自動化 |
| `serena` | stdio (ユーザー) | LSP ベースのセマンティックコード理解（シンボル検索・参照追跡・リネーム） |
| `sequential-thinking` | ビルトイン | 複雑な問題の段階的思考（設定不要） |
| `ide` | ビルトイン | IDE 診断情報・エラー取得（設定不要） |
| `claude-md-management` | プラグイン | CLAUDE.md の品質監査・セッション学習キャプチャ・同期 |

---

## 設定ファイル構成

### Claude Code

| ファイル | スコープ | 内容 |
|---------|---------|------|
| `~/.claude.json` | ユーザーグローバル | github / supabase / vercel（HTTP型）/ serena（stdio型） |
| `.mcp.json` | プロジェクトレベル | context7 / playwright（stdio型）— リポジトリに含まれる |
| `~/.claude/settings.json` | ユーザーグローバル | 権限設定（allow/deny） |

### Cursor

| ファイル | スコープ |
|---------|----------|
| `~/.cursor/mcp.json` | ユーザーグローバル |
| `.cursor/mcp.json` | プロジェクトレベル |

---

## Claude Code セットアップ手順

### 1. グローバル MCP 設定を追加

`claude mcp add` コマンドで登録する（`~/.claude.json` に保存される）：

```bash
# 環境変数を事前に設定しておく
export GITHUB_TOKEN=ghp_xxxx
export SUPABASE_ACCESS_TOKEN=sbp_xxxx
export VERCEL_TOKEN=vcp_xxxx

claude mcp add --transport http -H "Authorization: Bearer ${GITHUB_TOKEN}" --scope user github https://api.githubcopilot.com/mcp/
claude mcp add --transport http -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" --scope user supabase https://mcp.supabase.com
claude mcp add --transport http -H "Authorization: Bearer ${VERCEL_TOKEN}" --scope user vercel https://mcp.vercel.com
```

上記コマンドで `~/.claude.json` の `mcpServers` に以下が追記される：

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    }
  }
}
```

### 2. 必要なトークンの取得

| 変数名 | 取得先 |
|--------|--------|
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens（Personal Access Token） |
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens |
**注意**: `SUPABASE_ACCESS_TOKEN` はプロジェクトの `anon key` や `service_role key` ではなく、アカウントレベルの **Personal Access Token**。

### 3. 権限設定（推奨）

`~/.claude/settings.json` で危険な操作を deny する：

```json
{
  "permissions": {
    "allow": [],
    "deny": [
      "mcp__supabase__delete_*",
      "mcp__supabase__pause_project"
    ]
  }
}
```

### 3.1 PROD DB 保護 hooks（プロジェクト設定）

`.claude/settings.json` に PreToolUse hook が設定されており、PROD DB への危険な操作を物理的にブロックする。

**ブロック対象（PROD のみ）**:
- `supabase db reset`（Bash 経由 — PROD リンク時のデータ消失防止）
- PROD への `execute_sql`（MCP 経由の直接 SQL 実行）
- PROD への `apply_migration`（MCP 経由 → `pnpm db:push:prod` を使用すること）

**ガードスクリプト**: `.claude/hooks/prod-guard.sh`

詳細は `docs/database.md`「本番データベース変更ルール > 自動ガード」を参照。

### 4. プロジェクトレベル context7

`.mcp.json`（プロジェクトルート）はリポジトリに含まれており、設定済み。クローン後は自動的に利用可能。

Claude Code 起動時にプロジェクトスコープのサーバー承認プロンプトが表示されたら承認する。

```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

`sequential-thinking` と `ide` は Claude Code CLI ビルトインのため、設定不要。

### 5. Serena（LSP コード理解）

Serena は LSP（Language Server Protocol）を利用してセマンティックなコード理解を提供する MCP サーバー。シンボル検索・参照追跡・定義ジャンプ・セマンティックリネームなどが可能。

**前提条件**:
- Python 3.10+（`python3 --version` で確認）
- `uv`（`brew install uv` でインストール。フォールバック: `curl -LsSf https://astral.sh/uv/install.sh | sh`）
- `node_modules` がインストール済みであること（TypeScript LSP が依存）

**登録コマンド**:
```bash
claude mcp add serena --scope user -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project <プロジェクトの絶対パス>
```

> `--project` パスは各開発者の環境に合わせて変更すること。
> `--scope user` で `~/.claude.json` に保存される。プロジェクトパスが開発者ごとに異なるため `.mcp.json` には含めない。

**主な機能**:
- `find_symbol`: シンボル名でコード内を検索
- `find_references`: シンボルの参照箇所を一覧
- `go_to_definition`: シンボルの定義元にジャンプ
- `semantic_rename`: LSP ベースの安全なリネーム（全参照を一括更新）

**注意**:
- 初回起動時は LSP のインデックス構築に時間がかかる場合がある
- `node_modules` が未インストールだと TypeScript LSP が正しく動作しない

### 6. claude-md-management（CLAUDE.md 管理プラグイン）

Anthropic 公式の Claude Code プラグイン。CLAUDE.md の品質監査やセッション中の学習を CLAUDE.md に反映する機能を提供する。

**インストール**:
```bash
claude plugins install claude-md-management
```

**主な機能**:
- `/revise-claude-md`: セッション中に得た学習・フィードバックを CLAUDE.md に反映するスラッシュコマンド
- CLAUDE.md の品質監査・構造改善の提案

**注意**:
- プラグインのインストール後、Claude Code の再起動が必要な場合がある
- `claude plugins list` でインストール状況を確認可能

---

## Cursor セットアップ手順

`~/.cursor/mcp.json`（グローバル）または `.cursor/mcp.json`（プロジェクト）に同様の内容を記載する：

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer <GITHUB_TOKEN>"
      }
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com",
      "headers": {
        "Authorization": "Bearer <SUPABASE_ACCESS_TOKEN>"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

Cursor では環境変数展開（`${VAR}`）がサポートされない場合があるため、直接値を記載するかシェルラッパーを使う。

---

## 注意事項

- `SUPABASE_ACCESS_TOKEN` はアカウントの Personal Access Token。プロジェクトキーと混同しないこと。
- `supabase__delete_branch` / `supabase__pause_project` など取り消しが難しい操作は、AI が誤って実行しないよう deny リストへの追加を推奨。
- GitHub PAT は必要なスコープ（repo, workflow など）のみ付与する最小権限を推奨。
- MCP の設定変更後は Claude Code / Cursor の再起動が必要。

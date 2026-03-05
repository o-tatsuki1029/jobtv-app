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
| `context7` | stdio | Next.js/Supabase 等の最新ドキュメント取得 |
| `sequential-thinking` | ビルトイン | 複雑な問題の段階的思考（設定不要） |
| `ide` | ビルトイン | IDE 診断情報・エラー取得（設定不要） |

---

## 設定ファイル構成

### Claude Code

| ファイル | スコープ | 内容 |
|---------|---------|------|
| `~/.claude/.mcp.json` | ユーザーグローバル | github / supabase（HTTP型） |
| `.claude/.mcp.json` | プロジェクトレベル | context7（stdio型）— リポジトリに含まれる |
| `~/.claude/settings.json` | ユーザーグローバル | 権限設定（allow/deny） |

### Cursor

| ファイル | スコープ |
|---------|----------|
| `~/.cursor/mcp.json` | ユーザーグローバル |
| `.cursor/mcp.json` | プロジェクトレベル |

---

## Claude Code セットアップ手順

### 1. グローバル MCP 設定を追加

`~/.claude/.mcp.json` を作成（または編集）して以下を設定する：

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
      }
    },
  }
}
```

### 2. 必要なトークンの取得

| 変数名 | 取得先 |
|--------|--------|
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens（Personal Access Token） |
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

### 4. プロジェクトレベル context7

`.claude/.mcp.json` はリポジトリに含まれており、設定済み。クローン後は自動的に利用可能。

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

`sequential-thinking` と `ide` は Claude Code CLI ビルトインのため、設定不要。

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

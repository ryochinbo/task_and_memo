---
name: kanban-task
description: タスク管理ツール「Life」のタスクを管理します。タスクの追加、一覧表示、更新、削除、検索を行います。ユーザーが「タスク」「予定」「 ToDo」「スケジュール」「カレンダー」「やること」「思い出」などと言ったときや、タスク管理に関連する操作を要求したときにこのスキルを使用してください。サーバーは不要で、data/tasks.jsonを直接操作してGitに自動保存します。
---

# タスク管理スキル（Life）

このスキルは「Life」アプリのタスクを管理します。

## 動作仕様

1. `data/tasks.json` を直接読み書き
2. 変更後に `data/` ディレクトリで自動的に `git commit` & `git push`

## プロジェクト場所

- **ルート**: `C:\Users\***\***\task_and_memo\`
- **データ**: `data/tasks.json`
- **Git**: `data/` ディレクトリ（独立したGitリポジトリ）

## タスクデータ構造

```json
{
  "tasks": [
    {
      "id": "uuid（一意識別子）",
      "name": "タスク名",
      "status": "todo",
      "memo": "メモ内容",
      "priority": "high",
      "tags": ["タグ1", "タグ2"],
      "tag_custom": "自由記述タグ",
      "has_ball": true,
      "ball_holder": "担当者名",
      "due_date": "2025-12-31",
      "created_at": "2025-01-01T00:00:00",
      "start_date": "2025-01-01"
    }
  ]
}
```

## ステータス値

| 値 | 表示 |
|-----|------|
| `todo` | To Do |
| `in_progress` | In Progress |
| `done` | Done |

## 優先度値

| 値 | 表示 |
|-----|------|
| `high` | High（赤） |
| `medium` | Medium（黄） |
| `low` | Low（緑） |

## コマンド例

### タスク一覧表示
```
タスク一覧を見て
予定を教えて
今のタスクは？
```

### タスク追加
```
タスクを追加：〇〇をする
予定を追加：明日、会議
ToDoに追加：レポート提出
```

### タスク更新
```
タスク〇〇を進行中に変更
このタスクの優先度を高にして
メモを追加して
```

### タスク削除
```
タスク〇〇を削除
この予定を消して
```

### タスク検索
```
「会議」に関連するタスクを検索
今週の予定は？
```

## 実装手順

### 1. タスク一覧表示
```python
# data/tasks.json を読み込んで表示
with open('data/tasks.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    for task in data['tasks']:
        print(f"- {task['name']} ({task['status']})")
```

### 2. タスク追加
```python
import json
import uuid
from datetime import datetime

# JSON読み込み
with open('data/tasks.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 新規タスク作成
new_task = {
    "id": str(uuid.uuid4()),
    "name": "タスク名",
    "status": "todo",
    "priority": "medium",
    "memo": "",
    "tags": [],
    "tag_custom": "",
    "has_ball": False,
    "ball_holder": "",
    "due_date": "",
    "created_at": datetime.now().isoformat(),
    "start_date": ""
}

data['tasks'].append(new_task)

# 保存
with open('data/tasks.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Gitコミット＆プッシュ
# （後述のGit操作手順を実行）
```

### 3. タスク更新
```python
# JSON読み込み
with open('data/tasks.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# タスク検索＆更新
for task in data['tasks']:
    if task['name'] == '更新したいタスク名':
        task['status'] = 'in_progress'
        break

# 保存
with open('data/tasks.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

### 4. タスク削除
```python
# JSON読み込み
with open('data/tasks.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# タスク削除
data['tasks'] = [t for t in data['tasks'] if t['name'] != '削除したいタスク名']

# 保存
with open('data/tasks.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

### Gitコミット＆プッシュ（リッチなコミットメッセージ）
```python
import subprocess
from datetime import datetime

data_dir = 'data'

# コミットメッセージ：操作タイプ_タスク名
# 操作タイプ: 新規作成 / ステータス変更 / 更新 / 削除
commit_message = f"{action_type}_{task_name}"

subprocess.run(['git', 'add', 'tasks.json'], cwd=data_dir)
subprocess.run(['git', 'commit', '-m', commit_message], cwd=data_dir)
subprocess.run(['git', 'push'], cwd=data_dir)
```

### コミットメッセージ例

| 操作 | コミットメッセージ |
|------|------------------|
| タスク追加 | `新規作成_サイト実装` |
| ステータス変更 | `ステータス変更_サイト実装` |
| 内容更新 | `更新_サイト実装` |
| タスク削除 | `削除_サイト実装` |

## 注意事項

- サーバーは起動している必要がありません
- JSONファイルは常にUTF-8エンコーディングで扱います
- 変更後は必ずGitにコミット＆プッシュします
- UUIDの生成には `uuid.uuid4()` を使用します

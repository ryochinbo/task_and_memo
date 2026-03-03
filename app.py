from flask import Flask, render_template, request, jsonify
import json
import os
import subprocess
import threading
from datetime import datetime
import uuid

app = Flask(__name__)
DATA_DIR = 'data'
TASKS_FILE = os.path.join(DATA_DIR, 'tasks.json')

# 確認: dataディレクトリが存在するか
os.makedirs(DATA_DIR, exist_ok=True)

def load_tasks():
    """タスクを読み込む"""
    if not os.path.exists(TASKS_FILE):
        return {'tasks': []}
    with open(TASKS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tasks(tasks_data, action_type='更新', task_name=''):
    """タスクを保存してgitにコミット＆プッシュ（非同期）

    Args:
        tasks_data: タスクデータ
        action_type: 操作種類（新規作成/ステータス変更/更新/削除）
        task_name: タスク名
    """
    with open(TASKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks_data, f, ensure_ascii=False, indent=2)
    # Git操作はバックグラウンドで実行（レスポンスを速くする）
    threading.Thread(target=git_commit_and_push, args=(action_type, task_name), daemon=True).start()

def git_commit_and_push(action_type='更新', task_name=''):
    """dataディレクトリでgit commit & pushを実行（バックグラウンド）

    Args:
        action_type: 操作種類（新規作成/ステータス変更/更新/削除）
        task_name: タスク名
    """
    try:
        # dataディレクトリに移動してgit操作
        subprocess.run(
            ['git', 'add', 'tasks.json'],
            cwd=DATA_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        # コミットメッセージを作成: 操作タイプ_タスク名
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if task_name:
            message = f'{action_type}_{task_name}'
        else:
            message = f'{action_type}'

        subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=DATA_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        subprocess.run(
            ['git', 'push'],
            cwd=DATA_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
    except Exception as e:
        print(f"Git operation error: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """全タスク取得"""
    tasks_data = load_tasks()
    return jsonify(tasks_data)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """新規タスク作成"""
    tasks_data = load_tasks()
    task = request.json

    # 必須フィールドのバリデーション
    if not task.get('name'):
        return jsonify({'error': 'Task name is required'}), 400

    # 新しいタスクの作成
    new_task = {
        'id': str(uuid.uuid4()),
        'name': task['name'],
        'status': task.get('status', 'todo'),  # todo, in_progress, done
        'memo': task.get('memo', ''),
        'priority': task.get('priority', 'medium'),  # high, medium, low
        'tags': task.get('tags', []),
        'tag_custom': task.get('tag_custom', ''),
        'has_ball': task.get('has_ball', False),
        'ball_holder': task.get('ball_holder', ''),
        'due_date': task.get('due_date', ''),
        'created_at': datetime.now().isoformat(),
        'start_date': task.get('start_date', '')
    }

    tasks_data['tasks'].append(new_task)
    save_tasks(tasks_data, '新規作成', task['name'])
    return jsonify(new_task), 201

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    """タスク更新"""
    tasks_data = load_tasks()
    task_index = next((i for i, t in enumerate(tasks_data['tasks']) if t['id'] == task_id), None)

    if task_index is None:
        return jsonify({'error': 'Task not found'}), 404

    updated_data = request.json
    current_task = tasks_data['tasks'][task_index]

    # ステータス変更のみの場合は「ステータス変更」、それ以外は「更新」
    is_status_only = ('status' in updated_data and len(updated_data) == 1)
    action_type = 'ステータス変更' if is_status_only else '更新'
    task_name = current_task.get('name', '')

    tasks_data['tasks'][task_index].update(updated_data)
    # IDは変更しない
    tasks_data['tasks'][task_index]['id'] = task_id

    save_tasks(tasks_data, action_type, task_name)
    return jsonify(tasks_data['tasks'][task_index])

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """タスク削除"""
    tasks_data = load_tasks()
    task_index = next((i for i, t in enumerate(tasks_data['tasks']) if t['id'] == task_id), None)

    if task_index is None:
        return jsonify({'error': 'Task not found'}), 404

    deleted_task = tasks_data['tasks'].pop(task_index)
    task_name = deleted_task.get('name', '')
    save_tasks(tasks_data, '削除', task_name)
    return jsonify(deleted_task)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)

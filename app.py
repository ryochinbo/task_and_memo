from flask import Flask, render_template, request, jsonify
import json
import os
import subprocess
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

def save_tasks(tasks_data):
    """タスクを保存してgitにコミット＆プッシュ"""
    with open(TASKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks_data, f, ensure_ascii=False, indent=2)
    git_commit_and_push()

def git_commit_and_push():
    """dataディレクトリでgit commit & pushを実行"""
    try:
        # dataディレクトリに移動してgit操作
        result = subprocess.run(
            ['git', 'add', 'tasks.json'],
            cwd=DATA_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        result = subprocess.run(
            ['git', 'commit', '-m', f'Update tasks - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'],
            cwd=DATA_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        result = subprocess.run(
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
    save_tasks(tasks_data)
    return jsonify(new_task), 201

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    """タスク更新"""
    tasks_data = load_tasks()
    task_index = next((i for i, t in enumerate(tasks_data['tasks']) if t['id'] == task_id), None)

    if task_index is None:
        return jsonify({'error': 'Task not found'}), 404

    updated_data = request.json
    tasks_data['tasks'][task_index].update(updated_data)
    # IDは変更しない
    tasks_data['tasks'][task_index]['id'] = task_id

    save_tasks(tasks_data)
    return jsonify(tasks_data['tasks'][task_index])

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """タスク削除"""
    tasks_data = load_tasks()
    task_index = next((i for i, t in enumerate(tasks_data['tasks']) if t['id'] == task_id), None)

    if task_index is None:
        return jsonify({'error': 'Task not found'}), 404

    deleted_task = tasks_data['tasks'].pop(task_index)
    save_tasks(tasks_data)
    return jsonify(deleted_task)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)

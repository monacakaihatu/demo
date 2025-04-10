// ページロードにストレージを空にする
window.addEventListener("load", function () {
    localStorage.removeItem('sortedGroupId'); // グループIDを削除
});

// 未完了タスク件数カウント
function updateIncompleteCount() {
    const count = document.querySelectorAll('#incompleteTasksList li').length;
    document.getElementById("incompleteCountNumber").textContent = count;
}

// タスクグループ追加
document.getElementById("taskGroupSelect").addEventListener("change", function () {
    const newGroupInput = document.getElementById("newGroupInputContainer");
    if (this.value === "__new__") {
        newGroupInput.style.display = "block";
    } else {
        newGroupInput.style.display = "none";
    }
});

// タスク追加
function handleAddTodo(event) {
    event.preventDefault(); // フォームの通常送信を防ぐ
    clearErrors();

    const task = document.querySelector('input[name="task"]').value;
    const addFormGroupId = document.getElementById("taskGroupSelect").value;
    const newGroupName = document.getElementById("newGroupName").value;

    const payload = {
        task: task,
        groupId: addFormGroupId !== "__new__" ? addFormGroupId : null,
        newGroupName: addFormGroupId === "__new__" ? newGroupName : null
    };

    fetchWithAuth("/todos/add-ajax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorMap => {
                    showValidationErrors(errorMap);
                    throw new Error("バリデーションエラー");
                });
            }
            return response.json();
        })
        .then(todo => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
            modal.hide();

            // フォームリセット
            document.querySelector('input[name="task"]').value = "";
            document.getElementById("newGroupName").value = "";
            document.getElementById("taskGroupSelect").value = "";

            const sortedGroupId = localStorage.getItem('sortedGroupId') ?? '';
            const currentGroupId = addFormGroupId ?? '';

            if (!addFormGroupId && todo.groupId) {
                // 新グループが作成された場合
                localStorage.setItem('sortedGroupId', todo.groupId);
                document.getElementById("groupSortDropdown").textContent = todo.groupName;
                sortByGroup(todo.groupId); // 自動で切り替え表示
                return;
            }

            // 表示中のグループと一致しない場合はDOMに追加しない
            if (sortedGroupId !== '' && sortedGroupId !== currentGroupId) {
                return;
            }

            // 一致する場合は画面に即追加
            const li = createTaskElement(todo);
            document.getElementById('incompleteTasksList').appendChild(li);

            updateIncompleteCount(); // 件数カウントを更新
        })
        .catch(error => {
            console.error("エラー:", error);
        });
}

// タスク削除
let deleteTargetId = null;
let deleteTargetButton = null;

function showDeleteConfirmModal(button) {
    deleteTargetId = button.getAttribute('data-id');
    deleteTargetButton = button;

    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    modal.show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (!deleteTargetId) return;

    fetchWithAuth(`/todos/delete/${deleteTargetId}`, {
        method: 'DELETE'
    }).then(res => {
        if (res.ok) {
            const li = deleteTargetButton.closest('li');
            li.remove();

            // モーダル閉じる
            bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
            document.querySelector('input[name="task"]').focus();

            updateIncompleteCount(); // 件数カウントを更新
        }
    });
});


// タスク編集
function openEditModalFromButton(button) {
    const id = button.getAttribute('data-id');
    const task = button.getAttribute('data-task');
    openEditModal(id, task);
}

function openEditModal(id, currentTask) {
    const input = document.getElementById('editTaskInput');
    const saveBtn = document.getElementById('saveEditBtn');
    input.value = currentTask;
    saveBtn.setAttribute('data-id', id);
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

document.getElementById('saveEditBtn').addEventListener('click', () => {
    const id = event.target.getAttribute('data-id');
    const task = document.getElementById('editTaskInput').value;

    fetchWithAuth(`/todos/update-ajax/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
    })
        .then(res => res.json())
        .then(updated => {
            const li = document.querySelector(`[data-id="${id}"]`).closest('li');
            li.querySelector('.task-span').textContent = updated.task;
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        });
});

// タスクの完了状態を切り替える
function toggleCompleted(checkbox) {
    const todoId = checkbox.getAttribute('data-id');

    fetchWithAuth(`/todos/${todoId}/toggle`, {
        method: 'PATCH',
        headers: {
            // 'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]').getAttribute('content'),
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            const item = checkbox.closest('li');
            const completedList = document.getElementById('completedTasksList');
            const incompleteList = document.getElementById('incompleteTasksList');

            // 移動させる（完了⇔未完了）
            if (checkbox.checked) {
                completedList.appendChild(item);
            } else {
                incompleteList.appendChild(item);
            }
        }
    });
}

const toggleButton = document.getElementById("toggleCompletedTasksBtn");
const completedTasks = document.getElementById("completedTasks");

// 完了済みのタスクが表示されたとき
completedTasks.addEventListener("shown.bs.collapse", function () {
    toggleButton.textContent = "完了済みのタスクを非表示";
});

// 完了済みのタスクが非表示になったとき
completedTasks.addEventListener("hidden.bs.collapse", function () {
    toggleButton.textContent = "完了済みのタスクを表示";
});

// グループソート時
// グループでソートされたタスクを表示
function sortByGroup(groupId) {
    // groupIdを保持
    localStorage.setItem('sortedGroupId', groupId);

    //　未完了用
    fetchWithAuth(groupId ? `/todos/group/${groupId}?completed=false` : '/todos/all?completed=false')
        .then(res => res.json())
        .then(todos => {
            const list = document.getElementById('incompleteTasksList');
            list.innerHTML = ''; // 一旦クリア

            todos.forEach(todo => {
                const li = createTaskElement(todo);
                document.getElementById("incompleteTasksList").appendChild(li);
            });

            // 表示件数を更新
            const count = todos.length;
            const countSpan = document.getElementById("incompleteCountNumber");
            countSpan.textContent = count;
        });

    // 完了用
    fetchWithAuth(groupId ? `/todos/group/${groupId}?completed=true` : '/todos/all?completed=true')
        .then(res => res.json())
        .then(todos => {
            const list = document.getElementById('completedTasksList');
            list.innerHTML = ''; // 一旦クリア

            todos.forEach(todo => {
                const li = createTaskElement(todo);
                document.getElementById("completedTasksList").appendChild(li);
            });
        });
}

document.getElementById("groupSortDropdown").addEventListener("click", function () {
    const groupSortList = document.getElementById("groupSortList");
    groupSortList.innerHTML = ''; // 一旦クリア

    fetchWithAuth("/todos/groups/list")
        .then(response => response.json())
        .then(groups => {
            // 「全て」ボタン
            const allLi = document.createElement('li');
            allLi.className = 'dropdown-item';
            allLi.innerHTML = `<span class="me-auto">全て</span>`;
            allLi.addEventListener("click", function () {
                sortByGroup('');
                document.getElementById("groupSortDropdown").textContent = "全て";
            });
            groupSortList.appendChild(allLi);

            // 各グループを表示
            groups.forEach(group => {
                const li = document.createElement('li');
                li.className = 'dropdown-item d-flex justify-content-between align-items-center gap-2';

                const groupSpan = document.createElement('span');
                groupSpan.className = 'flex-grow-1';
                groupSpan.textContent = group.name;
                groupSpan.style.cursor = 'pointer';
                groupSpan.addEventListener("click", function () {
                    sortByGroup(group.id);
                    document.getElementById("groupSortDropdown").textContent = group.name;
                });

                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-outline-secondary';
                editBtn.innerHTML = `<i class="fas fa-pen"></i>`;
                editBtn.setAttribute('title', '編集');
                editBtn.addEventListener("click", function (e) {
                    e.stopPropagation(); // グループ切り替えを防ぐ
                    openEditGroupModal(group.id, group.name);
                });

                li.appendChild(groupSpan);
                li.appendChild(editBtn);
                groupSortList.appendChild(li);
            });
        });
});

document.getElementById('taskGroupSelect').addEventListener('focus', fetchAndUpdateGroupOptions);

// タスクのDOM要素を生成する関数
function createTaskElement(todo) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.id = `todo-${todo.id}`;

    // 左側：チェックボックス＋タスク名
    const leftDiv = document.createElement("div");
    leftDiv.className = "d-flex align-items-center gap-3";

    const label = document.createElement("label");
    label.className = "custom-checkbox m-0";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "real-checkbox";
    checkbox.setAttribute("data-id", todo.id);
    checkbox.checked = todo.completed;
    checkbox.onchange = () => toggleCompleted(checkbox);

    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";

    label.appendChild(checkbox);
    label.appendChild(checkmark);

    const taskSpan = document.createElement("span");
    taskSpan.className = "fs-5 task-span";
    taskSpan.textContent = todo.task;

    leftDiv.appendChild(label);
    leftDiv.appendChild(taskSpan);

    // 右側：編集・削除ボタン
    const rightDiv = document.createElement("div");
    rightDiv.className = "d-flex gap-2";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-outline-primary btn-sm";
    editBtn.setAttribute("data-id", todo.id);
    editBtn.setAttribute("data-task", todo.task);
    editBtn.onclick = () => openEditModalFromButton(editBtn);
    editBtn.textContent = "編集";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-outline-danger btn-sm";
    deleteBtn.setAttribute("data-id", todo.id);
    deleteBtn.onclick = () => showDeleteConfirmModal(deleteBtn);
    deleteBtn.textContent = "削除";

    rightDiv.appendChild(editBtn);
    rightDiv.appendChild(deleteBtn);

    li.appendChild(leftDiv);
    li.appendChild(rightDiv);

    return li;
}

// ログインセッションの確認
function fetchWithAuth(url, options = {}) {
    return fetch(url, options).then(response => {
        if (response.status === 401) {
            // 認証切れ → ログインページへ
            window.location.href = '/login';
            return Promise.reject(new Error("Unauthorized"));
        }
        return response;
    });
}

function fetchAndUpdateGroupOptions() {
    fetchWithAuth('/todos/groups/list')
        .then(response => response.json())
        .then(groups => {
            const select = document.getElementById('taskGroupSelect');

            // 最初の2つ（--グループを選択--, 新しいグループを作成）は残す
            const baseOptions = `
          <option value="">-- グループを選択 --</option>
          <option value="__new__">新しいグループを作成</option>
        `;
            select.innerHTML = baseOptions;

            // 取得したグループを追加
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('グループ取得エラー:', error);
        });
}

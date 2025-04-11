// ページロードにストレージを空にする
window.addEventListener("load", function () {
    localStorage.removeItem('sortedGroupId'); // グループIDを削除
});

// タスクグループ追加
document.getElementById('taskGroupSelect').addEventListener('change', function () {
    const newGroupInput = document.getElementById('newGroupInputContainer');
    newGroupInput.style.display = this.value === '__new__' ? 'block' : 'none';
});

document.getElementById('taskGroupSelectForEdit').addEventListener('change', function () {
    const newGroupInput = document.getElementById('newGroupInputContainerForEdit');
    newGroupInput.style.display = this.value === '__new__' ? 'block' : 'none';
});

// タスク追加
function handleAddTodo(event) {
    event.preventDefault(); // フォームの通常送信を防ぐ
    clearErrors();

    const task = document.querySelector('input[name="task"]').value;
    const addFormGroupId = document.getElementById("taskGroupSelect").value;
    const newGroupName = document.getElementById("newGroupName").value;
    const dueDate = document.getElementById("dueDate").value;

    const payload = {
        task: task,
        dueDate: dueDate,
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
            bootstrap.Modal.getInstance(document.getElementById('addTaskModal')).hide();

            // フォームリセット
            document.querySelector('input[name="task"]').value = "";
            document.getElementById("newGroupName").value = "";
            document.getElementById("taskGroupSelect").value = "";
            document.getElementById("dueDate").value = "";

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
            todo.isToday === true ? document.getElementById('todayTasksList').appendChild(li) : document.getElementById('otherTasksList').appendChild(li);

            todaysTaskNoneToggle();
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
        }
    });
});

// タスク編集
function openEditModalFromButton(button) {
    const id = button.getAttribute('data-id');

    // タスク情報をAPIから取得
    fetchWithAuth(`/todos/api/${id}`)
        .then(res => res.json())
        .then(todo => {
            const task = todo.task;
            const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
            const groupId = todo.taskGroup?.id ?? "";
            const groupName = todo.taskGroup?.name ?? "";

            let dueFormatted = "";
            if (dueDate) {
                dueFormatted = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
            }

            openEditModal(id, task, dueFormatted, groupId, groupName);
        })
        .catch(err => {
            console.error("タスク情報の取得に失敗しました", err);
            alert("タスク情報の取得に失敗しました");
        });
}

function openEditModal(id, currentTask, due = "", groupId = "", groupName = "") {
    const input = document.getElementById('editTaskInput');
    const dueInput = document.getElementById('editDueInput');
    const groupInput = document.getElementById('taskGroupSelectForEdit');
    const saveBtn = document.getElementById('saveEditBtn');
    input.value = currentTask;
    dueInput.value = due;
    if (groupInput) {
        // optionがなければ追加
        if (![...groupInput.options].some(opt => opt.value === String(groupId))) {
            const option = document.createElement("option");
            option.value = groupId;
            option.textContent = groupName;
            groupInput.appendChild(option);
        }

        groupInput.value = groupId;
    }
    saveBtn.setAttribute('data-id', id);

    new bootstrap.Modal(document.getElementById('editModal')).show();
}

document.getElementById('saveEditBtn').addEventListener('click', () => {
    clearEditErrors();

    const id = event.target.getAttribute('data-id');
    const task = document.getElementById('editTaskInput').value;
    const dueDate = document.getElementById('editDueInput').value;
    const addFormGroupId = document.getElementById("taskGroupSelectForEdit").value;
    const newGroupName = document.getElementById("newGroupNameForEdit").value;

    const payload = {
        task: task,
        dueDate: dueDate,
        groupId: addFormGroupId !== "__new__" ? addFormGroupId : null,
        newGroupName: addFormGroupId === "__new__" ? newGroupName : null
    };

    fetchWithAuth(`/todos/update-ajax/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorMap => {
                    showEditValidationErrors(errorMap);
                    throw new Error("バリデーションエラー");
                });
            }
            return response.json();
        })
        .then(updated => {
            const li = document.querySelector(`[data-id="${id}"]`).closest('li');
            li.querySelector('.task-span').textContent = updated.task;

            // 期日更新
            let formatted = '';
            if (dueDate) {
                const dateObj = new Date(dueDate);
                formatted = dateObj.getFullYear() + '/' +
                    String(dateObj.getMonth() + 1).padStart(2, '0') + '/' +
                    String(dateObj.getDate()).padStart(2, '0');
                li.querySelector('.task-due').textContent = "期限: " + formatted;
            } else {
                li.querySelector('.task-due').textContent = "";
            }

            // リスト移動処理
            const isCompleted = li.querySelector('input[type="checkbox"]').checked;
            const dueDateObj = dueDate ? new Date(dueDate) : null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let targetList;
            if (isCompleted) {
                targetList = document.getElementById('completedTasksList');
            } else if (!dueDateObj || dueDateObj.setHours(0, 0, 0, 0) > today.getTime()) {
                targetList = document.getElementById('otherTasksList');
            } else {
                targetList = document.getElementById('todayTasksList');
            }

            // 現在のリストと異なれば移動
            if (!targetList.contains(li)) {
                li.remove();
                targetList.appendChild(li);
            }

            const sortedGroupId = localStorage.getItem('sortedGroupId') ?? '';
            const currentGroupId = addFormGroupId ?? '';

            if (!addFormGroupId && todo.groupId) {
                // 新グループが作成された場合
                localStorage.setItem('sortedGroupId', todo.groupId);
                document.getElementById("groupSortDropdown").textContent = todo.groupName;
                sortByGroup(todo.groupId); // 自動で切り替え表示
                return;
            }

            // 表示中のグループと一致しない場合は表示しない
            if (sortedGroupId !== '' && sortedGroupId !== currentGroupId) {
                li.remove();
            }

            todaysTaskNoneToggle();

            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        });
});

// タスクの完了状態を切り替える
function toggleCompleted(checkbox) {
    const todoId = checkbox.getAttribute('data-id');

    fetchWithAuth(`/todos/${todoId}/toggle`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            const item = checkbox.closest('li');
            const isCompleted = checkbox.checked;

            const today = new Date();
            today.setHours(0, 0, 0, 0); // 時刻を0に固定

            let targetList;

            if (isCompleted) {
                // 完了 → 完了リストへ
                targetList = document.getElementById('completedTasksList');
            } else {
                // 未完了 → 期日によってリスト振り分け
                const dueText = item.querySelector('.task-due')?.textContent?.trim(); // "期限: yyyy/MM/dd"
                const match = dueText?.match(/期限:\s*(\d{4})\/(\d{2})\/(\d{2})/);
                console.dir(match);
                console.log(today.getTime());
                if (match) {
                    const dueDate = new Date(`${match[1]}-${match[2]}-${match[3]}`);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueDate.getTime() <= today.getTime()) {
                        targetList = document.getElementById('todayTasksList');
                    } else {
                        targetList = document.getElementById('otherTasksList');
                    }
                } else {
                    // 期日なし → その他へ
                    targetList = document.getElementById('otherTasksList');
                }
            }

            // 現在のリストと異なれば移動
            if (!targetList.contains(item)) {
                item.remove();
                targetList.appendChild(item);
            }

            todaysTaskNoneToggle();

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

    // 全リストを一旦クリア
    document.getElementById('todayTasksList').innerHTML = '';
    document.getElementById('otherTasksList').innerHTML = '';
    document.getElementById('completedTasksList').innerHTML = '';

    // 未完了タスク取得（completed=false）
    fetchWithAuth(groupId ? `/todos/group/${groupId}?completed=false` : '/todos/all?completed=false')
        .then(res => res.json())
        .then(todos => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            todos.forEach(todo => {
                const li = createTaskElement(todo);
                const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
                if (dueDate) dueDate.setHours(0, 0, 0, 0);

                if (!dueDate || dueDate.getTime() > today.getTime()) {
                    document.getElementById('otherTasksList').appendChild(li);
                } else {
                    document.getElementById('todayTasksList').appendChild(li);
                }
            });

            todaysTaskNoneToggle();
        });

    // 完了タスク取得（completed=true）
    fetchWithAuth(groupId ? `/todos/group/${groupId}?completed=true` : '/todos/all?completed=true')
        .then(res => res.json())
        .then(todos => {
            todos.forEach(todo => {
                const li = createTaskElement(todo);
                document.getElementById('completedTasksList').appendChild(li);
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

function todaysTaskNoneElement() {
    const li = document.createElement("li");
    li.className = "none-task list-group-item d-flex justify-content-between align-items-center bg-light text-dark";

    const div = document.createElement("div");
    div.className = "d-flex align-items-center gap-3";

    const noneTaskSpan = document.createElement("span");
    noneTaskSpan.className = "fs-5 task-span";
    noneTaskSpan.textContent = "なし";

    div.appendChild(noneTaskSpan);
    li.appendChild(div);

    return li;
}

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

    if (todo.dueDate) {
        const dueDateText = document.createElement("small");
        dueDateText.className = "text-muted task-due";
        const due = new Date(todo.dueDate);
        dueDateText.textContent = `期限: ${due.getFullYear()}/${(due.getMonth() + 1).toString().padStart(2, '0')}/${due.getDate().toString().padStart(2, '0')}`;
        leftDiv.appendChild(dueDateText);
    } else {
        const dueDateText = document.createElement("small");
        dueDateText.className = "text-muted task-due";
        leftDiv.appendChild(dueDateText);
    }

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

function todaysTaskNoneToggle() {
    // 今日の課題がなしか判定
    if (document.getElementById('todayTasksList').children.length === 0) {
        document.getElementById('todayTasksList').appendChild(todaysTaskNoneElement());
    } else {
        const noneTaskElement = document.querySelector('.none-task');
        if (noneTaskElement) {
            noneTaskElement.remove();
        }
    }
}

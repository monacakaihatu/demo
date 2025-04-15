// ページロードにストレージを空にする
window.addEventListener("load", function () {
    localStorage.removeItem('sortedGroupId'); // グループIDを削除
});

window.addEventListener("DOMContentLoaded", () => {
    const currentTab = document.querySelector("#taskTabs .nav-link.active");
    const tabKey = currentTab?.getAttribute("data-tab") || "today";
    const groupId = localStorage.getItem("sortedGroupId") || '';

    updateTasksForTab(tabKey, groupId);
});

// タスクグループ追加
document.getElementById('taskGroupSelect').addEventListener('change', function () {
    const newGroupInput = document.getElementById('newGroupInputContainer');
    newGroupInput.style.display = this.value === '__new__' ? 'block' : 'none';
});

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
            todo.isToday === true ? document.getElementById('todayTasksList').appendChild(li) : document.getElementById('otherTasksList').appendChild(li);
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
            const ul = li?.parentElement;

            li.remove();

            if (ul) {
                TaskNoneElement(ul);
            }

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

            if (!addFormGroupId && updated.groupId) {
                // 新グループが作成された場合
                localStorage.setItem('sortedGroupId', updated.groupId);
                document.getElementById("groupSortDropdown").textContent = updated.groupName;
                sortByGroup(updated.groupId); // 自動で切り替え表示
                return;
            }

            // 表示中のグループと一致しない場合は表示しない
            if (sortedGroupId !== '' && sortedGroupId !== currentGroupId) {
                li.remove();
            }

            // 現在のタブに対応する ul 要素を取得
            const currentTab = document.querySelector("#taskTabs .nav-link.active");
            const tabKey = currentTab?.getAttribute("data-tab") || "today";

            // タブキーに対応する ul 要素の ID を取得
            const tabKeyToListId = {
                today: 'todayTasksList',
                other: 'otherTasksList',
                completed: 'completedTasksList'
            };

            const listId = tabKeyToListId[tabKey];
            const ulElement = document.getElementById(listId);

            if (ulElement) {
                TaskNoneElement(ulElement);
            }

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
                // 未完了 → 期日によってリスト振り分け
                const dueText = item.querySelector('.task-due')?.textContent?.trim(); // "期限: yyyy/MM/dd"
                const match = dueText?.match(/期限:\s*(\d{4})\/(\d{2})\/(\d{2})/);

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

            const ul = item?.parentElement;
            if (ul) {
                TaskNoneElement(ul);
            }
        }
    });
}

// グループソート時
// グループでソートされたタスクを表示
function sortByGroup(groupId, activeTabId = '#todayTasks') {
    localStorage.setItem('sortedGroupId', groupId);

    // 全部のリストを一旦クリア
    document.getElementById('todayTasksList').innerHTML = '';
    document.getElementById('otherTasksList').innerHTML = '';
    document.getElementById('completedTasksList').innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 未完了タスク取得
    fetchWithAuth(groupId ? `/todos/group/${groupId}?completed=false` : '/todos/all?completed=false')
        .then(res => res.json())
        .then(todos => {
            todos.forEach(todo => {
                const li = createTaskElement(todo);
                document.getElementById("incompleteTasksList").appendChild(li);
            });
        });

    // 完了タスク取得
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

function TaskNoneElement(list) {
    if (list.children.length > 0) {
        return;
    }
    const li = document.createElement('li');
    li.className = 'list-group-item text-muted';
    li.textContent = 'なし';
    list.appendChild(li);

    return li;
}

// タスクのDOM要素を生成する関数
function createTaskElement(todo) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center flex-wrap";
    li.id = `todo-${todo.id}`;

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

    const dueDateText = document.createElement("small");
    dueDateText.className = "text-muted task-due";
    if (todo.dueDate) {
        const due = new Date(todo.dueDate);
        dueDateText.textContent = `期限: ${due.getFullYear()}/${(due.getMonth() + 1).toString().padStart(2, '0')}/${due.getDate().toString().padStart(2, '0')}`;
    }
    leftDiv.appendChild(dueDateText);

    const rightDivPC = document.createElement("div");
    rightDivPC.className = "d-none d-sm-flex gap-2";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-outline-primary btn-sm";
    editBtn.setAttribute("data-id", todo.id);
    editBtn.setAttribute("data-task", todo.task);
    editBtn.setAttribute("data-due", todo.dueDate || "");
    editBtn.textContent = "編集";
    editBtn.onclick = () => openEditModalFromButton(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-outline-danger btn-sm";
    deleteBtn.setAttribute("data-id", todo.id);
    deleteBtn.textContent = "削除";
    deleteBtn.onclick = () => showDeleteConfirmModal(deleteBtn);

    rightDivPC.appendChild(editBtn);
    rightDivPC.appendChild(deleteBtn);

    const rightDivSP = document.createElement("div");
    rightDivSP.className = "dropdown d-block d-sm-none";

    const dropdownToggle = document.createElement("button");
    dropdownToggle.className = "btn btn-sm p-0 border-0 text-body";
    dropdownToggle.type = "button";
    dropdownToggle.setAttribute("data-bs-toggle", "dropdown");
    dropdownToggle.setAttribute("aria-expanded", "false");
    dropdownToggle.innerHTML = '<span style="font-size: 1.2rem;"><i class="fa-solid fa-ellipsis-vertical"></i></span>';

    const dropdownMenu = document.createElement("ul");
    dropdownMenu.className = "dropdown-menu";

    const editItem = document.createElement("li");
    const editLink = document.createElement("a");
    editLink.className = "dropdown-item";
    editLink.href = "#";
    editLink.setAttribute("data-id", todo.id);
    editLink.setAttribute("data-task", todo.task);
    editLink.setAttribute("data-due", todo.dueDate || "");
    editLink.textContent = "編集";
    editLink.onclick = (e) => {
        e.preventDefault();
        openEditModalFromButton(editLink);
    };
    editItem.appendChild(editLink);

    const deleteItem = document.createElement("li");
    const deleteLink = document.createElement("a");
    deleteLink.className = "dropdown-item text-danger";
    deleteLink.href = "#";
    deleteLink.setAttribute("data-id", todo.id);
    deleteLink.textContent = "削除";
    deleteLink.onclick = (e) => {
        e.preventDefault();
        showDeleteConfirmModal(deleteLink);
    };
    deleteItem.appendChild(deleteLink);

    dropdownMenu.appendChild(editItem);
    dropdownMenu.appendChild(deleteItem);

    rightDivSP.appendChild(dropdownToggle);
    rightDivSP.appendChild(dropdownMenu);

    li.appendChild(leftDiv);
    li.appendChild(rightDivPC);
    li.appendChild(rightDivSP);

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

function createNoneElement() {
    const li = document.createElement('li');
    li.className = 'none-task list-group-item text-muted text-center';
    li.textContent = 'なし';
    return li;
}

// タブキーとリストIDのマッピング
const tabKeyToListId = {
    today: 'todayTasksList',
    other: 'otherTasksList',
    completed: 'completedTasksList'
};

function updateTasksForTab(tabKey, groupId) {
    const listId = tabKeyToListId[tabKey];
    const listElement = document.getElementById(listId);
    if (!listElement) return console.warn(`リストIDが見つかりません: ${listId}`);

    listElement.innerHTML = '';

    const url = new URL('/todos/tab', location.origin);
    url.searchParams.append('tab', tabKey);
    if (tabKey === 'completed') {
        url.searchParams.append('completed', true);
    } else {
        url.searchParams.append('completed', false);
    }
    if (groupId) {
        url.searchParams.append('groupId', groupId);
    }

    fetchWithAuth(url)
        .then(res => res.json())
        .then(data => {
            const listId = {
                today: 'todayTasksList',
                other: 'otherTasksList',
                completed: 'completedTasksList'
            }[tabKey];

            const list = document.getElementById(listId);
            list.innerHTML = '';

            if (data.todos.length === 0) {
                const li = document.createElement('li');
                li.className = 'list-group-item text-muted';
                li.textContent = 'なし';
                list.appendChild(li);
                return;
            }

            data.todos.forEach(todo => {
                const li = createTaskElement(todo);
                list.appendChild(li);
            });
        });
}

document.querySelectorAll('#taskTabs .nav-link').forEach(tab => {
    tab.addEventListener('shown.bs.tab', e => {
        const tabKey = tab.getAttribute('data-tab');
        const groupId = localStorage.getItem('sortedGroupId') || '';
        updateTasksForTab(tabKey, groupId);
    });
});

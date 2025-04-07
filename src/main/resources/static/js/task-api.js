// タスク追加
document.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();

    const input = this.querySelector('input[name="task"]');
    const task = input.value;

    fetch('/todos/add-ajax', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task })
    })
        .then(res => res.json())
        .then(todo => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
            <label class="custom-checkbox">
                <input type="checkbox" class="real-checkbox" th:attr="data-id=${todo.id}" onchange="toggleCompleted(this)" />
                <span class="checkmark"></span>
            </label>
            <span class="fs-5">${todo.task}</span>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-primary btn-sm"
                    data-id="${todo.id}" data-task="${todo.task}"
                    onclick="openEditModalFromButton(this)">
                    編集
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm"
                    data-id="${todo.id}"
                    onclick="showDeleteConfirmModal(this)">
                    削除
                </button>
            </div>
        `;
            document.getElementById('incompleteTasksList').appendChild(li);
            input.value = '';
        });
});

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

    fetch(`/todos/delete/${deleteTargetId}`, {
        method: 'DELETE'
    }).then(res => {
        if (res.ok) {
            const li = deleteTargetButton.closest('li');
            li.remove();

            // モーダル閉じる
            bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
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

    fetch(`/todos/update-ajax/${id}`, {
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

    fetch(`/todos/${todoId}/toggle`, {
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


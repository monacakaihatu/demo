document.getElementById('addTaskModal').addEventListener('hidden.bs.modal', () => {
    clearErrors();

    document.querySelector('input[name="task"]').value = '';
    document.getElementById('dueDate').value = '';
    document.getElementById('taskGroupSelect').value = '';
    document.getElementById('newGroupName').value = '';
    document.getElementById('newGroupInputContainer').style.display = 'none';
});

document.getElementById('editModal').addEventListener('hidden.bs.modal', () => {
    clearEditErrors && clearEditErrors(); // 存在チェック込み

    document.getElementById('editTaskInput').value = '';
    document.getElementById('editDueInput').value = '';
    document.getElementById('taskGroupSelectForEdit').value = '';
    document.getElementById('newGroupNameForEdit').value = '';
    document.getElementById('newGroupInputContainerForEdit').style.display = 'none';
});


function showValidationErrors(errors) {
    if (errors.task) {
        showError("task", errors.task);
    }
    if (errors.newGroupName) {
        showError("newGroupName", errors.newGroupName);
    }
}

function showError(fieldName, message) {
    const input = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
    if (!input) return;

    let errorSpan = input.nextElementSibling;
    if (!errorSpan || !errorSpan.classList.contains("error-message")) {
        errorSpan = document.createElement("span");
        errorSpan.classList.add("error-message", "text-danger", "small");
        input.parentNode.appendChild(errorSpan);
    }
    errorSpan.textContent = message;
}

function clearErrors() {
    document.querySelectorAll(".error-message").forEach(e => e.remove());
}

function showEditValidationErrors(errors) {
    if (errors.task) {
        showErrorForEdit("editTaskInput", errors.task);
    }
    if (errors.newGroupName) {
        showErrorForEdit("newGroupNameForEdit", errors.newGroupName);
    }
}

function showErrorForEdit(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    let errorSpan = input.nextElementSibling;
    if (!errorSpan || !errorSpan.classList.contains("error-message")) {
        errorSpan = document.createElement("span");
        errorSpan.classList.add("error-message", "text-danger", "small");
        input.parentNode.appendChild(errorSpan);
    }
    errorSpan.textContent = message;
}

function clearEditErrors() {
    const editModal = document.getElementById("editModal");
    editModal.querySelectorAll(".error-message").forEach(e => e.remove());
}

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

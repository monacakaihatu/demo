let editingGroupId = null;

// 編集モーダルを開く関数
function openEditGroupModal(groupId, groupName) {
    editingGroupId = groupId;
    document.getElementById("editGroupNameInput").value = groupName;
    new bootstrap.Modal(document.getElementById("editGroupModal")).show();
}

// グループ名変更を保存
document.getElementById("saveGroupChangesBtn").addEventListener("click", () => {
    const newName = document.getElementById("editGroupNameInput").value;

    fetchWithAuth(`/todos/groups/${editingGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
    })
    .then(res => {
        if (res.ok) {
            // モーダルを閉じて、グループ再読み込み（UIの更新）
            bootstrap.Modal.getInstance(document.getElementById("editGroupModal")).hide();
            sortByGroup(localStorage.getItem("sortedGroupId") || "");
        }
    });
});

// 削除ボタン→確認モーダル表示
document.getElementById("deleteGroupBtn").addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("confirmGroupDeleteModal")).show();
});

// 最終確認 → 削除実行
document.getElementById("confirmDeleteGroupBtn").addEventListener("click", () => {
    fetchWithAuth(`/todos/groups/${editingGroupId}`, {
        method: "DELETE"
    })
    .then(res => {
        if (res.ok) {
            // 両モーダルを閉じて、一覧更新
            bootstrap.Modal.getInstance(document.getElementById("editGroupModal")).hide();
            bootstrap.Modal.getInstance(document.getElementById("confirmGroupDeleteModal")).hide();
            sortByGroup(""); // 全表示に戻す
            localStorage.removeItem("sortedGroupId");

            // 未完了タスク件数を更新
            const count = document.querySelectorAll('#incompleteTasksList li').length;
            document.getElementById("incompleteCountNumber").textContent = count;
        }
    });
});

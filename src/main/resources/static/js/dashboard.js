let chart = null; // グローバルで保持

function createChart(data) {
  const ctx = document.getElementById('taskChart').getContext('2d');

  // すでに存在してたら破棄してから再生成
  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['完了', '未完了'],
      datasets: [{
        label: 'タスク統計',
        data: [data.completed, data.uncompleted],
        backgroundColor: ['#4caf50', '#f44336'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart' // お好みで
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });

  // カウント表示更新
  document.getElementById('completedCount').textContent = data.completed;
  document.getElementById('uncompletedCount').textContent = data.uncompleted;
  document.getElementById('totalCount').textContent = data.completed + data.uncompleted;
}

function fetchAndUpdateChart(groupId = '') {
  let url = '/api/stats/summary';
  if (groupId) {
    url = '/api/stats/group/' + groupId;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => createChart(data));
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndUpdateChart(); // 初期ロード

  document.getElementById('taskGroupSelectOnDashboard').addEventListener('change', function () {
    const groupId = this.value;
    fetchAndUpdateChart(groupId);
  });
});

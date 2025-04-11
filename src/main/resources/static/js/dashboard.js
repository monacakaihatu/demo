let chart = null;
let dueChartInstance = null;

function createChart(data) {
  const ctx = document.getElementById('taskChart').getContext('2d');

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
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  document.getElementById('completedCount').textContent = data.completed;
  document.getElementById('uncompletedCount').textContent = data.uncompleted;
  document.getElementById('totalCount').textContent = data.completed + data.uncompleted;
}

function updateDueStatsChart(groupId = "") {
  const url = groupId ? `/api/stats/due?groupId=${groupId}` : '/api/stats/due-categories';

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const canvas = document.getElementById("dueStatsChart");
      const ctx = canvas.getContext("2d");

      if (dueChartInstance) {
        dueChartInstance.destroy();
      }

      dueChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(data),
          datasets: [{
            label: "タスク数",
            data: Object.values(data),
            backgroundColor: ['#ff6666', '#ff9999', '#ffcc66', '#66b3ff', '#999999'],
          }]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            x: {
              ticks: {
                callback: function(value) {
                  return Number.isInteger(value) ? value : '';
                },
                stepSize: 1
              },
              beginAtZero: true,
              suggestedMax: 5
            }
          }
        }
      });
    });
}


function fetchAndUpdateChart(groupId = '') {
  const url = groupId ? `/api/stats/group/${groupId}` : '/api/stats/summary';

  fetch(url)
    .then(response => response.json())
    .then(data => createChart(data));
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndUpdateChart();
  updateDueStatsChart();

  const select = document.getElementById('taskGroupSelectOnDashboard');
  select.addEventListener('change', function () {
    const groupId = this.value;
    fetchAndUpdateChart(groupId);
    updateDueStatsChart(groupId);
  });
});

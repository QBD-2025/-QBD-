// public/js/historial.controller.js
// ==================== SISTEMA DE PESTAÑAS ====================
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
let charts = {};
let estadisticasCargadas = false;

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Actualizar botones
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Actualizar contenido
    contents.forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${targetTab}`).classList.add('active');
    
    // Cargar estadísticas solo cuando se abre la pestaña (lazy loading)
    if (targetTab === 'estadisticas' && !estadisticasCargadas) {
      cargarEstadisticas();
      estadisticasCargadas = true;
    }
  });
});

// ==================== CARGAR ESTADÍSTICAS ====================
async function cargarEstadisticas() {
  try {
    document.getElementById('loading').style.display = 'flex';

    const [resumen, porDificultad, historial, porTipo, comparacion] = await Promise.all([
      fetch('/api/estadisticas/resumen').then(r => r.json()),
      fetch('/api/estadisticas/por-dificultad').then(r => r.json()),
      fetch('/api/estadisticas/historial-rendimiento').then(r => r.json()),
      fetch('/api/estadisticas/por-tipo').then(r => r.json()),
      fetch('/api/estadisticas/comparacion').then(r => r.json())
    ]);

    actualizarResumen(resumen);
    crearGraficaResultados(resumen);
    crearGraficaDificultad(porDificultad);
    crearGraficaEvolucion(historial);
    crearGraficaTipo(porTipo);
    crearGraficaTop5(comparacion);
    generarRecomendaciones(resumen, porDificultad, historial);

    document.getElementById('loading').style.display = 'none';
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    document.getElementById('loading').style.display = 'none';
  }
}

function actualizarResumen(data) {
  document.getElementById('victorias').textContent = data.victorias || 0;
  document.getElementById('derrotas').textContent = data.derrotas || 0;
  document.getElementById('empates').textContent = data.empates || 0;
  document.getElementById('promedio').textContent = (data.promedio_porcentaje || 0).toFixed(1) + '%';
  document.getElementById('puntos').textContent = data.puntos_actuales || 0;
  document.getElementById('racha').textContent = data.racha_actual || 0;
}

// ==================== GRÁFICAS ====================
function crearGraficaResultados(data) {
  const ctx = document.getElementById('chartResultados');
  if (charts.resultados) charts.resultados.destroy();

  charts.resultados = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Victorias', 'Derrotas', 'Empates'],
      datasets: [{
        data: [data.victorias || 0, data.derrotas || 0, data.empates || 0],
        backgroundColor: ['#4caf50', '#f44336', '#ff9800'],
        borderWidth: 2,
        borderColor: '#1a1a2e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#fff', font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function crearGraficaDificultad(data) {
  const ctx = document.getElementById('chartDificultad');
  if (charts.dificultad) charts.dificultad.destroy();

  const dificultades = { 1: 'Fácil', 2: 'Medio', 3: 'Difícil' };
  const labels = data.map(d => dificultades[d.dificultad] || 'Desconocida');
  const promedios = data.map(d => parseFloat(d.promedio_porcentaje || 0));
  const victorias = data.map(d => d.victorias || 0);

  charts.dificultad = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Promedio (%)',
          data: promedios,
          backgroundColor: '#2196f3',
          borderColor: '#1976d2',
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Victorias',
          data: victorias,
          backgroundColor: '#4caf50',
          borderColor: '#388e3c',
          borderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Porcentaje (%)', color: '#fff' },
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Victorias', color: '#fff' },
          ticks: { color: '#fff' },
          grid: { display: false }
        },
        x: {
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      },
      plugins: {
        legend: { labels: { color: '#fff', font: { size: 12 } } }
      }
    }
  });
}

function crearGraficaEvolucion(data) {
  const ctx = document.getElementById('chartEvolucion');
  if (charts.evolucion) charts.evolucion.destroy();

  const datosInvertidos = [...data].reverse();
  const labels = datosInvertidos.map((d, i) => `Duelo ${i + 1}`);
  const porcentajes = datosInvertidos.map(d => parseFloat(d.porcentaje || 0));
  const colores = datosInvertidos.map(d => {
    if (d.resultado === 'Victoria') return '#4caf50';
    if (d.resultado === 'Derrota') return '#f44336';
    return '#ff9800';
  });

  charts.evolucion = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Porcentaje de Aciertos',
        data: porcentajes,
        borderColor: '#00bcd4',
        backgroundColor: 'rgba(0, 188, 212, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: colores,
        pointBorderColor: '#fff',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: 'Porcentaje (%)', color: '#fff' },
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: {
          ticks: { color: '#fff', maxRotation: 45 },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      },
      plugins: {
        legend: { labels: { color: '#fff', font: { size: 12 } } },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              return datosInvertidos[context.dataIndex].resultado;
            }
          }
        }
      }
    }
  });
}

function crearGraficaTipo(data) {
  const ctx = document.getElementById('chartTipo');
  if (charts.tipo) charts.tipo.destroy();

  const labels = data.map(d => d.tipo_duelo === 'carrera' ? 'Carrera' : 'General');
  const victorias = data.map(d => d.victorias || 0);
  const totales = data.map(d => d.total || 0);

  charts.tipo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Victorias',
          data: victorias,
          backgroundColor: '#4caf50',
          borderColor: '#388e3c',
          borderWidth: 2
        },
        {
          label: 'Total Duelos',
          data: totales,
          backgroundColor: '#2196f3',
          borderColor: '#1976d2',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: {
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      },
      plugins: {
        legend: { labels: { color: '#fff', font: { size: 12 } } }
      }
    }
  });
}

function crearGraficaTop5(data) {
  const ctx = document.getElementById('chartTop5');
  if (charts.top5) charts.top5.destroy();

  const jugadores = data.top_jugadores;
  const labels = jugadores.map(j => j.username);
  const puntos = jugadores.map(j => j.puntos || 0);
  const colores = jugadores.map((j, i) => {
    const hue = (i * 60) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  });

  charts.top5 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Puntos',
        data: puntos,
        backgroundColor: colores,
        borderColor: colores.map(c => c.replace('60%', '40%')),
        borderWidth: 2
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: '#fff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Tu posición: #${data.mi_posicion}`,
          color: '#ffd700',
          font: { size: 14, weight: 'bold' }
        }
      }
    }
  });
}

function generarRecomendaciones(resumen, dificultad, historial) {
  const container = document.getElementById('recommendationsContent');
  const recomendaciones = [];

  const total = resumen.total_duelos || 1;
  const tasaVictoria = ((resumen.victorias / total) * 100).toFixed(1);

  if (tasaVictoria < 40) {
    recomendaciones.push({
      icon: '⚠️',
      text: 'Tu tasa de victoria es baja. Considera practicar más en modo entrenamiento.',
      type: 'warning'
    });
  } else if (tasaVictoria > 70) {
    recomendaciones.push({
      icon: '🌟',
      text: '¡Excelente tasa de victoria! Intenta duelos de mayor dificultad.',
      type: 'success'
    });
  }

  if (resumen.promedio_porcentaje < 60) {
    recomendaciones.push({
      icon: '📚',
      text: 'Revisa los temas donde fallas más y estudia con las tarjetas educativas.',
      type: 'info'
    });
  }

  if (resumen.racha_actual >= 5) {
    recomendaciones.push({
      icon: '🔥',
      text: `¡Racha de ${resumen.racha_actual} victorias! Sigue así.`,
      type: 'success'
    });
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push({
      icon: '💪',
      text: 'Continúa practicando para mejorar tus habilidades.',
      type: 'info'
    });
  }

  container.innerHTML = recomendaciones.map(r => `
    <div class="recommendation-card ${r.type}">
      <span class="rec-icon">${r.icon}</span>
      <p>${r.text}</p>
    </div>
  `).join('');
}

// ==================== HELPERS DE HANDLEBARS (simulados) ====================
// Estas funciones se usan en la vista, pero las simularemos si es necesario
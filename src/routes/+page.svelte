<script>
  import { onMount } from 'svelte';
  import { Bar, Doughnut } from 'svelte-chartjs';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
  } from 'chart.js';
  
  import { 
    loading, 
    error, 
    resumen, 
    cargarDatos, 
    obtenerMediosUnicos,
    personasDisponibles,
    filtrosActivos 
  } from '$lib/stores';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
  );

  // 📅 Estado para los filtros de fecha
  let fechaInicio = '';
  let fechaFin = '';
  
  // 👤📰 Estado para filtros de persona y medio
  let personaSeleccionada = '';
  let medioSeleccionado = '';
  
  // 📰 Lista de medios disponibles (se carga dinámicamente)
  let mediosDisponibles = [];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 5,
        right: 5
      }
    },
    plugins: {
      legend: { 
        position: 'top',
        labels: { 
          font: { size: 11 },
          padding: 8
        }
      },
      title: { 
        display: false
      }
    }
  };

  const colors = {
    blue: 'rgba(54, 162, 235, 0.8)',
    green: 'rgba(75, 192, 192, 0.8)',
    red: 'rgba(255, 99, 132, 0.8)',
    yellow: 'rgba(255, 206, 86, 0.8)',
    purple: 'rgba(153, 102, 255, 0.8)',
    orange: 'rgba(255, 159, 64, 0.8)',
    gray: 'rgba(201, 203, 207, 0.8)'
  };

  onMount(async () => {
    // Cargar lista de medios disponibles
    mediosDisponibles = await obtenerMediosUnicos();
    // Cargar datos iniciales
    cargarDatos();
  });

  function recargar() {
    cargarDatos({
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      persona: personaSeleccionada || null,
      medio: medioSeleccionado || null
    });
  }

  // 📅 Funciones de filtro rápido
  function filtrarHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    fechaInicio = hoy;
    fechaFin = hoy;
    aplicarFiltro();
  }

  function filtrarUltimos7Dias() {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    fechaInicio = inicio.toISOString().split('T')[0];
    fechaFin = fin.toISOString().split('T')[0];
    aplicarFiltro();
  }

  function filtrarUltimos30Dias() {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    fechaInicio = inicio.toISOString().split('T')[0];
    fechaFin = fin.toISOString().split('T')[0];
    aplicarFiltro();
  }

  function filtrarTodo() {
    fechaInicio = '';
    fechaFin = '';
    personaSeleccionada = '';
    medioSeleccionado = '';
    cargarDatos();
  }

  // 🔍 Aplicar todos los filtros
  function aplicarFiltro() {
    cargarDatos({
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      persona: personaSeleccionada || null,
      medio: medioSeleccionado || null
    });
  }

  // 🧹 Limpiar todos los filtros
  function limpiarFiltros() {
    fechaInicio = '';
    fechaFin = '';
    personaSeleccionada = '';
    medioSeleccionado = '';
    cargarDatos();
  }

  // 👤 Limpiar solo filtro de persona
  function limpiarPersona() {
    personaSeleccionada = '';
    aplicarFiltro();
  }

  // 📰 Limpiar solo filtro de medio
  function limpiarMedio() {
    medioSeleccionado = '';
    aplicarFiltro();
  }

  // ✅ Verificar si hay filtros activos
  $: hayFiltrosActivos = fechaInicio || fechaFin || personaSeleccionada || medioSeleccionado;
</script>

<div class="dashboard">
  <header>
    <div class="header-left">
      <h1>📊 Dashboard de Análisis de Noticias</h1>
    </div>
    <div class="header-right">
      <button on:click={recargar} disabled={$loading}>
        {$loading ? 'Cargando...' : '🔄 Actualizar'}
      </button>
    </div>
  </header>

  {#if $error}
    <div class="error">
      <p>⚠️ Error: {$error}</p>
    </div>
  {/if}

  {#if $loading}
    <div class="loading">
      <p>⏳ Cargando datos...</p>
    </div>
  {:else}
    <!-- 🔍 Filtros -->
    <section class="filters-section">
      <div class="filters-header">
        <h3 class="filters-title">🔍 Filtros de Búsqueda</h3>
        <div class="filters-actions">
          <button on:click={aplicarFiltro} class="btn-apply">
            🔍 Aplicar
          </button>
          <button on:click={limpiarFiltros} class="btn-clear" disabled={!hayFiltrosActivos}>
            🧹 Limpiar
          </button>
        </div>
      </div>
      
      <div class="filters-grid">
        <!-- Fecha Inicio -->
        <div class="filters-group">
          <label for="fecha-inicio">📅 Fecha Inicio</label>
          <input 
            id="fecha-inicio"
            type="date" 
            bind:value={fechaInicio} 
            class="date-input"
          />
        </div>
        
        <!-- Fecha Fin -->
        <div class="filters-group">
          <label for="fecha-fin">📅 Fecha Fin</label>
          <input 
            id="fecha-fin"
            type="date" 
            bind:value={fechaFin} 
            class="date-input"
          />
        </div>

        <!-- Filtro por Persona -->
        <div class="filters-group">
          <label for="persona-select">👤 Persona</label>
          <div class="select-wrapper">
            <select 
              id="persona-select"
              bind:value={personaSeleccionada} 
              class="select-input"
            >
              <option value="">Todas las personas</option>
              {#each personasDisponibles as persona}
                <option value={persona}>{persona}</option>
              {/each}
            </select>
            {#if personaSeleccionada}
              <button on:click={limpiarPersona} class="btn-clear-small" title="Limpiar filtro" type="button">
                ✕
              </button>
            {/if}
          </div>
        </div>

        <!-- Filtro por Medio -->
        <div class="filters-group">
          <label for="medio-select">📰 Medio</label>
          <div class="select-wrapper">
            <select 
              id="medio-select"
              bind:value={medioSeleccionado} 
              class="select-input"
            >
              <option value="">Todos los medios</option>
              {#each mediosDisponibles as medio}
                <option value={medio}>{medio}</option>
              {/each}
            </select>
            {#if medioSeleccionado}
              <button on:click={limpiarMedio} class="btn-clear-small" title="Limpiar filtro" type="button">
                ✕
              </button>
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- ⚡ Filtros Rápidos -->
    <section class="quick-filters">
      <span class="quick-filters-label">Filtros rápidos:</span>
      <button on:click={filtrarHoy} class="btn-quick">Hoy</button>
      <button on:click={filtrarUltimos7Dias} class="btn-quick">Últimos 7 días</button>
      <button on:click={filtrarUltimos30Dias} class="btn-quick">Últimos 30 días</button>
      <button on:click={filtrarTodo} class="btn-quick">Todo el historial</button>
    </section>

    <!-- Tarjetas de Resumen (SOLO 2) -->
    <section class="cards">
      <div class="card">
        <h3>Total Noticias</h3>
        <p class="number">{$resumen.totalNoticias}</p>
      </div>
      <div class="card">
        <h3>Medios Diferentes</h3>
        <p class="number">{$resumen.porMedio.length}</p>
      </div>
    </section>

    <!-- Gráficos -->
    <section class="charts-grid">
      <!-- Noticias por Medio (FILA COMPLETA) -->
      {#if $resumen.porMedio.length > 0}
        <div class="chart-container full-width">
          <h3>📰 Noticias por Medio</h3>
          <div class="chart-wrapper">
            <Bar
              data={{
                labels: $resumen.porMedio.map(m => m.medio),
                datasets: [{
                  label: 'Noticias',
                  data: $resumen.porMedio.map(m => m.cantidad),
                  backgroundColor: colors.blue,
                  borderColor: colors.blue,
                  borderWidth: 1
                }]
              }}
              options={chartOptions}
            />
          </div>
        </div>
      {:else}
        <div class="chart-container full-width">
          <p>⚠️ No hay datos de medios</p>
        </div>
      {/if}

      <!-- Sentimiento -->
      {#if $resumen.porSentimiento.length > 0}
        <div class="chart-container">
          <h3>😊 Análisis de Sentimiento</h3>
          <div class="chart-wrapper">
            <Doughnut
              data={{
                labels: $resumen.porSentimiento.map(s => s.sentimiento),
                datasets: [{
                  data: $resumen.porSentimiento.map(s => s.cantidad),
                  backgroundColor: [colors.green, colors.red, colors.yellow, colors.gray, colors.blue],
                  borderWidth: 1
                }]
              }}
              options={chartOptions}
            />
          </div>
        </div>
      {:else}
        <div class="chart-container">
          <p>⚠️ No hay datos de sentimiento</p>
        </div>
      {/if}

      <!-- Clasificación -->
      {#if $resumen.porClasificacion.length > 0}
        <div class="chart-container">
          <h3>🏷️ Clasificación de Noticias</h3>
          <div class="chart-wrapper">
            <Bar
              data={{
                labels: $resumen.porClasificacion.map(c => c.clasificacion),
                datasets: [{
                  label: 'Cantidad',
                  data: $resumen.porClasificacion.map(c => c.cantidad),
                  backgroundColor: colors.purple,
                  borderColor: colors.purple,
                  borderWidth: 1
                }]
              }}
              options={chartOptions}
            />
          </div>
        </div>
      {:else}
        <div class="chart-container">
          <p>⚠️ No hay datos de clasificación</p>
        </div>
      {/if}

      <!-- Menciones por Persona -->
      {#if $resumen.mencionesPersonas.length > 0}
        <div class="chart-container">
          <h3>👥 Menciones por Persona</h3>
          <div class="chart-wrapper">
            <Bar
              data={{
                labels: $resumen.mencionesPersonas.map(p => p.nombre),
                datasets: [{
                  label: 'Menciones',
                  data: $resumen.mencionesPersonas.map(p => p.menciones),
                  backgroundColor: colors.orange,
                  borderColor: colors.orange,
                  borderWidth: 1
                }]
              }}
              options={chartOptions}
            />
          </div>
        </div>
      {:else}
        <div class="chart-container">
          <p>⚠️ No hay datos de menciones</p>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
   .dashboard {
     max-width: 1600px;
     margin: 0 auto;
     padding: 30px;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
   }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e1e4e8;
    background: white;
    padding: 20px 30px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .header-left h1 {
    color: #24292e;
    margin: 0;
    font-size: 24px;
  }

  .header-right {
    display: flex;
    gap: 10px;
  }

  button {
    background: #0366d6;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #0255b3;
  }

  button:disabled {
    background: #94c4f7;
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* 🔍 Sección de Filtros */
  .filters-section {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 20px 25px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e1e4e8;
    flex-wrap: wrap;
    gap: 15px;
  }

  .filters-title {
    margin: 0;
    font-size: 16px;
    color: #24292e;
    font-weight: 600;
  }

  .filters-actions {
    display: flex;
    gap: 10px;
  }

  .filters-actions .btn-apply {
    background: #28a745;
    padding: 8px 16px;
    font-size: 13px;
  }

  .filters-actions .btn-apply:hover {
    background: #218838;
  }

  .filters-actions .btn-clear {
    background: #6c757d;
    padding: 8px 16px;
    font-size: 13px;
  }

  .filters-actions .btn-clear:hover {
    background: #5a6268;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .filters-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .filters-group label {
    font-size: 13px;
    font-weight: 600;
    color: #586069;
    white-space: nowrap;
  }

  .date-input,
  .select-input {
    padding: 10px 12px;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    background: white;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .date-input:hover,
  .select-input:hover {
    border-color: #0366d6;
  }

  .date-input:focus,
  .select-input:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.15);
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .select-wrapper select {
    padding-right: 35px;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  .btn-clear-small {
    position: absolute;
    right: 8px;
    background: #e1e4e8;
    color: #586069;
    border: none;
    width: 22px;
    height: 22px;
    padding: 0;
    font-size: 11px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s, color 0.2s;
  }

  .btn-clear-small:hover {
    background: #c5221f;
    color: white;
  }

  /* ⚡ Filtros Rápidos */
  .quick-filters {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 15px 25px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .quick-filters-label {
    font-size: 14px;
    font-weight: 600;
    color: #586069;
    margin-right: 10px;
  }

  .btn-quick {
    background: #f6f8fa;
    color: #24292e;
    border: 1px solid #e1e4e8;
    padding: 8px 16px;
    font-size: 13px;
    border-radius: 6px;
  }

  .btn-quick:hover {
    background: #e1e4e8;
    border-color: #d1d5da;
  }

  .error {
    background: #ffeef0;
    border: 1px solid #fdaeb7;
    color: #c5221f;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .loading {
    text-align: center;
    padding: 50px;
    color: #586069;
    background: white;
    border-radius: 8px;
  }

  /* Tarjetas de Resumen */
  .cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 30px;
  }

  .card {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 25px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .card h3 {
    margin: 0 0 10px 0;
    color: #586069;
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card .number {
    margin: 0;
    font-size: 36px;
    font-weight: 700;
    color: #24292e;
  }

  /* Grid de Gráficos */
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
    margin-bottom: 30px;
  }

  .chart-container {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    height: 350px;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chart-container.full-width {
    grid-column: 1 / -1;
  }

  .chart-container h3 {
    margin: 0 0 15px 0;
    color: #24292e;
    font-size: 16px;
    font-weight: 600;
    border-bottom: 1px solid #e1e4e8;
    padding-bottom: 12px;
    flex-shrink: 0;
  }

  .chart-wrapper {
    flex: 1;
    position: relative;
    min-height: 0;
    overflow: hidden;
  }

  .chart-container p {
    text-align: center;
    color: #586069;
    margin-top: 100px;
    font-size: 14px;
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .filters-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
    
    .cards {
      grid-template-columns: 1fr;
    }
    
    .chart-container,
    .chart-container.full-width {
      grid-column: 1 / -1;
    }
    
    .chart-container {
      height: 320px;
    }

    .filters-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .filters-actions {
      width: 100%;
    }

    .filters-actions button {
      flex: 1;
    }
  }

  @media (max-width: 640px) {
    .dashboard {
      padding: 15px;
    }
    
    header {
      flex-direction: column;
      gap: 15px;
      text-align: center;
    }
    
    .cards {
      grid-template-columns: 1fr;
    }
    
    .chart-container,
    .chart-container.full-width {
      height: 300px;
    }

    .quick-filters {
      flex-direction: column;
      align-items: stretch;
    }

    .quick-filters-label {
      margin-right: 0;
      margin-bottom: 10px;
    }

    .btn-quick {
      width: 100%;
    }

    .filters-grid {
      grid-template-columns: 1fr;
    }

    .filters-actions {
      flex-direction: column;
    }

    .filters-actions button {
      width: 100%;
    }
  }
</style>
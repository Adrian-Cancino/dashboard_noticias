<script>
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { supabaseMapa } from '$lib/supabase';

  let mapContainer;
  let map;
  let loading = true;
  let error = null;
  let distritosL = [];
  let distritoSeleccionado = '';
  let municipios = [];
  let municipioSeleccionado = '';
  let geoLayers = [];
    let allData = [];
     let resultadosData = [];
     let maxVotosCache = 0;

  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('es-MX');
  }

  async function cargarDatos() {
    try {
      const { data: geoData, error: geoError } = await supabaseMapa
        .from('secciones_geo_slp')
        .select('feature, seccion, distrito_f, distrito_l');

      if (geoError) throw geoError;

      const { data: resultados, error: resultadosError } = await supabaseMapa
        .from('resultados_dip_locales_slp')
        .select('seccion, "Municipio", "PAN", "PRI", "PRD", "PVEM", "PT", "MORENA", votos_emitidos, abstencion');

      if (resultadosError) throw resultadosError;

       function normalizarSeccion(sec) {
         if (sec === null || sec === undefined) return null;
         const num = Number(sec);
         if (isNaN(num)) return String(sec).trim();
         return String(num);
       }

        function getValue(row, columnName) {
          if (row[columnName] !== undefined) return row[columnName];
          const lowerColumn = columnName.toLowerCase();
          for (const key in row) {
            if (key.toLowerCase() === lowerColumn) return row[key];
          }
          return undefined;
        }

       const resultadosPorSeccion = {};
        resultados.forEach(row => {
          const seccion = normalizarSeccion(getValue(row, 'seccion'));
          if (!seccion) return;

          if (!resultadosPorSeccion[seccion]) {
            resultadosPorSeccion[seccion] = {
              seccion: seccion,
              municipio: getValue(row, 'Municipio'),
              PAN: 0,
              PRI: 0,
              PRD: 0,
              PVEM: 0,
              PT: 0,
              MORENA: 0,
              votos_emitidos: 0,
              abstencion: 0
            };
          }

          const target = resultadosPorSeccion[seccion];
          target.PAN += getValue(row, 'PAN') || 0;
          target.PRI += getValue(row, 'PRI') || 0;
          target.PRD += getValue(row, 'PRD') || 0;
          target.PVEM += getValue(row, 'PVEM') || 0;
          target.PT += getValue(row, 'PT') || 0;
          target.MORENA += getValue(row, 'MORENA') || 0;
          target.votos_emitidos += getValue(row, 'votos_emitidos') || 0;
          target.abstencion += getValue(row, 'abstencion') || 0;
        });
        
        const geoSecciones = new Set(geoData.map(g => normalizarSeccion(g.seccion)).filter(Boolean));
        const resultadosSecciones = new Set(Object.keys(resultadosPorSeccion));
        const coinciden = [...geoSecciones].filter(sec => resultadosSecciones.has(sec));

       allData = geoData.map(geoRow => {
         const seccion = normalizarSeccion(geoRow.seccion);
         const resultadosSeccion = resultadosPorSeccion[seccion] || null;
         return {
           ...geoRow,
           resultados: resultadosSeccion
         };
       });

      const distritos = [...new Set(geoData.map(row => row.distrito_l).filter(Boolean))].sort();
      distritosL = distritos;

      const municipiosUnicos = [...new Set(Object.values(resultadosPorSeccion)
        .map(r => r.municipio)
        .filter(Boolean))].sort();
      municipios = municipiosUnicos;

        resultadosData = Object.values(resultadosPorSeccion);
        
        calcularMaxVotos();
        
        loading = false;
    } catch (e) {
      console.error('Error cargando datos:', e);
      error = e.message;
      loading = false;
    }
  }

  function calcularMaxVotos() {
    let max = 0;
    for (let i = 0; i < allData.length; i++) {
      const v = allData[i].resultados?.votos_emitidos || 0;
      if (v > max) max = v;
    }
    maxVotosCache = max;
  }

  function getColorByVotes(votos) {
    if (!votos || votos === 0) return '#f0f0f0';
    
    if (maxVotosCache === 0) return '#f0f0f0';
    
    const normalized = Math.min(votos / maxVotosCache, 1);
    const lightness = 90 - (normalized * 60);
    
    return `hsl(0, 70%, ${lightness}%)`;
  }

  function obtenerDatosFiltrados() {
    return allData.filter(row => {
      const cumpleDistrito = !distritoSeleccionado || row.distrito_l === distritoSeleccionado;
      const cumpleMunicipio = !municipioSeleccionado || 
        (row.resultados && row.resultados.municipio === municipioSeleccionado);
      return cumpleDistrito && cumpleMunicipio;
    });
  }

   let votosPorPartido = {
     MORENA: 0,
     PAN: 0,
     PRI: 0,
     PVEM: 0,
     PT: 0,
     PRD: 0,
     total: 0,
     abstencion: 0
   };

   function calcularVotos() {
     if (!allData || allData.length === 0) return;
     
     const datosFiltrados = obtenerDatosFiltrados();
     
     const nuevosTotales = {
       MORENA: 0,
       PAN: 0,
       PRI: 0,
       PVEM: 0,
       PT: 0,
       PRD: 0,
       total: 0,
       abstencion: 0
     };
     
     let filasConResultados = 0;
     datosFiltrados.forEach(row => {
       if (row.resultados) {
         filasConResultados++;
         nuevosTotales.MORENA += row.resultados.MORENA || 0;
         nuevosTotales.PAN += row.resultados.PAN || 0;
         nuevosTotales.PRI += row.resultados.PRI || 0;
         nuevosTotales.PVEM += row.resultados.PVEM || 0;
         nuevosTotales.PT += row.resultados.PT || 0;
         nuevosTotales.PRD += row.resultados.PRD || 0;
         nuevosTotales.total += row.resultados.votos_emitidos || 0;
         nuevosTotales.abstencion += row.resultados.abstencion || 0;
       }
     });
     
     
     votosPorPartido = nuevosTotales;
   }

   $: allData, distritoSeleccionado, municipioSeleccionado, calcularVotos();

  function dibujarPoligonos() {
    geoLayers.forEach(layer => map.removeLayer(layer));
    geoLayers = [];

    const L = window.L;

    const datosFiltrados = obtenerDatosFiltrados();

    datosFiltrados.forEach(row => {
      if (row.feature) {
        const geojson = typeof row.feature === 'string'
          ? JSON.parse(row.feature)
          : row.feature;

        if (geojson.geometry) {
          const seccion = row.seccion ?? geojson.properties?.SECCION ?? 'N/A';
          const distritoF = row.distrito_f ?? geojson.properties?.DISTRITO_F ?? 'N/A';
          const distritoL = row.distrito_l ?? geojson.properties?.DISTRITO_L ?? 'N/A';
          const resultados = row.resultados;
          
          let votosTotales = 0;
          if (resultados) {
            votosTotales = resultados.votos_emitidos || 
              (resultados.PAN + resultados.PRI + resultados.PRD + 
               resultados.PVEM + resultados.PT + resultados.MORENA);
          }
          
          const fillColor = getColorByVotes(votosTotales);

          const layer = L.geoJSON(geojson, {
            style: {
              color: '#6B1D2A',
              weight: 1,
              opacity: 0.6,
              fillColor: fillColor,
              fillOpacity: 0.7
            }
          });

          layer.on('mouseover', function () {
            this.setStyle({ fillOpacity: 0.9, weight: 2, color: '#C9A84C' });
          });

          layer.on('mouseout', function () {
            this.setStyle({ fillOpacity: 0.7, weight: 1, color: '#6B1D2A' });
          });

          let popupContent = `<b>Seccion:</b> ${seccion}<br>`;
          popupContent += `<b>Distrito Federal:</b> ${distritoF}<br>`;
          popupContent += `<b>Distrito Local:</b> ${distritoL}<br>`;
          
          if (resultados) {
            popupContent += `<b>Municipio:</b> ${resultados.municipio || 'N/A'}<br>`;
            popupContent += `<hr style="margin: 8px 0; border-color: #e5e7eb;">`;
            popupContent += `<b>Votos Totales:</b> ${formatNumber(votosTotales)}<br>`;
            popupContent += `<b>Abstenciones:</b> ${formatNumber(resultados.abstencion)}<br>`;
            popupContent += `<hr style="margin: 8px 0; border-color: #e5e7eb;">`;
            popupContent += `<b>Votos por Partido:</b><br>`;
            popupContent += `<span style="color:#8B4513;">&bull;</span> MORENA: ${formatNumber(resultados.MORENA)}<br>`;
            popupContent += `<span style="color:#0420a4;">&bull;</span> PAN: ${formatNumber(resultados.PAN)}<br>`;
            popupContent += `<span style="color:#00843D;">&bull;</span> PRI: ${formatNumber(resultados.PRI)}<br>`;
            popupContent += `<span style="color:#00A650;">&bull;</span> PVEM: ${formatNumber(resultados.PVEM)}<br>`;
            popupContent += `<span style="color:#C41E24;">&bull;</span> PT: ${formatNumber(resultados.PT)}<br>`;
            popupContent += `<span style="color:#FFD100;">&bull;</span> PRD: ${formatNumber(resultados.PRD)}<br>`;
          } else {
            popupContent += `<br><i>No hay datos de votacion para esta seccion</i>`;
          }

          layer.bindPopup(popupContent);
          layer.addTo(map);
          geoLayers.push(layer);
        }
      }
    });

    if (geoLayers.length > 0) {
      const group = L.featureGroup(geoLayers);
      map.fitBounds(group.getBounds());
    }
  }

  function aplicarFiltro() {
    dibujarPoligonos();
  }

  function limpiarFiltroDistrito() {
    distritoSeleccionado = '';
    dibujarPoligonos();
  }

  function limpiarFiltroMunicipio() {
    municipioSeleccionado = '';
    dibujarPoligonos();
  }

  function limpiarTodosFiltros() {
    distritoSeleccionado = '';
    municipioSeleccionado = '';
    dibujarPoligonos();
  }

  onMount(async () => {
    const L = await import('leaflet');

    delete L.default.Icon.Default.prototype._getIconUrl;
    L.default.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    window.L = L.default;

    map = L.default.map(mapContainer).setView([22.1565, -100.9855], 8);

    L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    await cargarDatos();
    dibujarPoligonos();

    return () => {
      map.remove();
    };
  });
</script>

<div class="map-page">
  <header class="map-header">
    <div class="header-content">
      <h1>Mapa de Secciones Electorales</h1>
      <p class="header-subtitle">Diputacion Local - San Luis Potosi</p>
    </div>
  </header>

  <section class="card filter-bar">
    <div class="filter-controls">
      <div class="filter-group">
        <label for="distrito-l">Distrito Local</label>
        <div class="select-wrapper">
          <select id="distrito-l" bind:value={distritoSeleccionado} on:change={aplicarFiltro} class="input">
            <option value="">Todos</option>
            {#each distritosL as distrito}
              <option value={distrito}>{distrito}</option>
            {/each}
          </select>
          {#if distritoSeleccionado}
            <button on:click={limpiarFiltroDistrito} class="btn-clear-small" title="Limpiar filtro" type="button">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 3l8 8M11 3l-8 8"/>
              </svg>
            </button>
          {/if}
        </div>
      </div>
      
      <div class="filter-group">
        <label for="municipio">Municipio</label>
        <div class="select-wrapper">
          <select id="municipio" bind:value={municipioSeleccionado} on:change={aplicarFiltro} class="input">
            <option value="">Todos</option>
            {#each municipios as municipio}
              <option value={municipio}>{municipio}</option>
            {/each}
          </select>
          {#if municipioSeleccionado}
            <button on:click={limpiarFiltroMunicipio} class="btn-clear-small" title="Limpiar filtro" type="button">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 3l8 8M11 3l-8 8"/>
              </svg>
            </button>
          {/if}
        </div>
      </div>
      
      <div class="filter-actions">
        <button on:click={aplicarFiltro} class="btn btn-primary">Filtrar</button>
        <button on:click={limpiarTodosFiltros} class="btn btn-secondary">Limpiar</button>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="loading">Cargando secciones electorales...</div>
  {:else if error}
    <div class="error">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="error-icon">
        <circle cx="10" cy="10" r="9"/><path d="M10 6v4"/><path d="M10 14h0"/>
      </svg>
      <span>Error: {error}</span>
    </div>
  {/if}

  <section class="results-section">
    <h2 class="section-title">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="section-icon">
        <path d="M2 10l4-4 4 4 4-4 4 4"/><path d="M2 14l4-4 4 4 4-4 4 4"/>
      </svg>
      Resultados Electorales
    </h2>
    <div class="results-cards">
      <div class="result-card result-card--total">
        <span class="result-card-label">Votos Totales</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.total)}</span>
      </div>
      <div class="result-card result-card--abstencion">
        <span class="result-card-label">Abstenciones</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.abstencion)}</span>
      </div>
      <div class="result-card result-card--morena">
        <span class="result-card-label">MORENA</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.MORENA)}</span>
      </div>
      <div class="result-card result-card--pan">
        <span class="result-card-label">PAN</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.PAN)}</span>
      </div>
      <div class="result-card result-card--pri">
        <span class="result-card-label">PRI</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.PRI)}</span>
      </div>
      <div class="result-card result-card--pvem">
        <span class="result-card-label">PVEM</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.PVEM)}</span>
      </div>
      <div class="result-card result-card--pt">
        <span class="result-card-label">PT</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.PT)}</span>
      </div>
      <div class="result-card result-card--prd">
        <span class="result-card-label">PRD</span>
        <span class="result-card-value">{formatNumber(votosPorPartido.PRD)}</span>
      </div>
    </div>
  </section>

  <div class="map-wrapper">
    <div class="map-container" bind:this={mapContainer}></div>
    <div class="map-legend">
      <h4>Votos Totales</h4>
      <div class="legend-gradient">
        <div class="legend-labels">
          <span>Bajo</span>
          <span>Alto</span>
        </div>
        <div class="gradient-bar"></div>
      </div>
    </div>
  </div>

  <section class="results-section">
    <h2 class="section-title">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="section-icon">
        <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/>
      </svg>
      Afiliados por Partido
    </h2>
    <div class="affiliation-cards">
      <div class="aff-card aff-card--morena">
        <div class="aff-card-bar"></div>
        <span class="aff-card-label">MORENA</span>
        <span class="aff-card-value">224,282</span>
      </div>
      <div class="aff-card aff-card--pvem">
        <div class="aff-card-bar"></div>
        <span class="aff-card-label">PVEM</span>
        <span class="aff-card-value">200,224</span>
      </div>
      <div class="aff-card aff-card--mc">
        <div class="aff-card-bar"></div>
        <span class="aff-card-label">MC</span>
        <span class="aff-card-value">8,621</span>
      </div>
      <div class="aff-card aff-card--pt">
        <div class="aff-card-bar"></div>
        <span class="aff-card-label">PT</span>
        <span class="aff-card-value">7,573</span>
      </div>
      <div class="aff-card aff-card--pan">
        <div class="aff-card-bar"></div>
        <span class="aff-card-label">PAN</span>
        <span class="aff-card-value">7,174</span>
      </div>
      <div class="aff-card aff-card--pri">
        <div class="aff-card-bar"></div>
        <span class="aff-card-label">PRI</span>
        <span class="aff-card-value">1,920</span>
      </div>
    </div>
  </section>
</div>

<style>
  :global {
    .leaflet-container {
      width: 100%;
      height: 100%;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .leaflet-popup-content {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      line-height: 1.6;
      margin: 12px 16px;
    }
  }

  .map-page {
    max-width: 1600px;
    margin: 0 auto;
    padding: 30px;
  }

  .card {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 24px 30px;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    border-left: 4px solid var(--color-accent);
  }

  .header-content h1 {
    margin: 0;
    font-size: 24px;
    color: var(--color-primary);
    letter-spacing: -0.3px;
  }

  .header-subtitle {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
  }

  .filter-bar {
    padding: 16px 20px;
    margin-bottom: 20px;
  }

  .filter-controls {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input {
    padding: 10px 12px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-family: var(--font-body);
    background: var(--color-surface);
    cursor: pointer;
    min-width: 200px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
    color: var(--color-text);
  }

  .input:hover {
    border-color: var(--color-primary-light);
  }

  .input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
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
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }

  .btn-clear-small {
    position: absolute;
    right: 8px;
    background: var(--color-border);
    color: var(--color-text-secondary);
    border: none;
    width: 22px;
    height: 22px;
    padding: 0;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .btn-clear-small:hover {
    background: var(--color-error);
    color: white;
  }

  .btn-clear-small svg {
    width: 12px;
    height: 12px;
  }

  .filter-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 8px 18px;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: var(--font-body);
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-accent);
    color: var(--color-primary-dark);
  }

  .btn-primary:hover {
    background: var(--color-accent-light);
  }

  .btn-secondary {
    background: var(--color-border);
    color: var(--color-text-secondary);
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }

  .map-wrapper {
    position: relative;
    height: calc(100vh - 420px);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
  }

  .map-container {
    height: 100%;
    width: 100%;
  }

  .map-legend {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: var(--color-surface);
    padding: 14px 18px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    font-size: 12px;
    z-index: 1000;
    min-width: 160px;
  }

  .map-legend h4 {
    margin: 0 0 8px;
    color: var(--color-primary);
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-heading);
  }

  .legend-gradient {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--color-text-secondary);
  }

  .gradient-bar {
    height: 10px;
    width: 100%;
    border-radius: 3px;
    background: linear-gradient(to right, hsl(0, 70%, 90%), hsl(0, 70%, 30%));
  }

  .loading {
    text-align: center;
    padding: 20px;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    margin-bottom: 20px;
    color: var(--color-text-secondary);
    box-shadow: var(--shadow-sm);
  }

  .error {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--color-error-bg);
    border: 1px solid var(--color-error-border);
    color: var(--color-error);
    padding: 14px 18px;
    border-radius: var(--radius-md);
    margin-bottom: 20px;
    font-size: 14px;
  }

  .error-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 20px;
    font-size: 18px;
    color: var(--color-primary);
    font-weight: 700;
  }

  .section-icon {
    width: 18px;
    height: 18px;
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .results-section {
    margin: 24px 0;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-md);
  }

  .results-cards {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 12px;
  }

  .result-card {
    background: var(--color-bg);
    border-radius: var(--radius-md);
    padding: 16px 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 3px solid var(--color-border);
    transition: transform 0.2s;
  }

  .result-card:hover {
    transform: translateY(-2px);
  }

  .result-card--total { border-top-color: var(--color-primary); }
  .result-card--abstencion { border-top-color: var(--color-text-muted); }
  .result-card--morena { border-top-color: #6B1D2A; }
  .result-card--pan { border-top-color: #0420a4; }
  .result-card--pri { border-top-color: #00843D; }
  .result-card--pvem { border-top-color: #00A650; }
  .result-card--pt { border-top-color: #C41E24; }
  .result-card--prd { border-top-color: #FFD100; }

  .result-card--prd .result-card-value {
    color: #8B6F00;
  }

  .result-card-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-card-value {
    font-family: var(--font-heading);
    font-size: 22px;
    font-weight: 800;
    color: var(--color-primary);
    line-height: 1.1;
  }

  .affiliation-cards {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
  }

  .aff-card {
    background: var(--color-bg);
    border-radius: var(--radius-md);
    padding: 20px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s;
  }

  .aff-card:hover {
    transform: translateY(-2px);
  }

  .aff-card-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }

  .aff-card--morena .aff-card-bar { background: #6B1D2A; }
  .aff-card--pvem .aff-card-bar { background: #00A650; }
  .aff-card--mc .aff-card-bar { background: #FF6B00; }
  .aff-card--pt .aff-card-bar { background: #C41E24; }
  .aff-card--pan .aff-card-bar { background: #0420a4; }
  .aff-card--pri .aff-card-bar { background: #00843D; }

  .aff-card-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .aff-card-value {
    font-family: var(--font-heading);
    font-size: 26px;
    font-weight: 800;
    color: var(--color-primary);
  }

  @media (max-width: 1200px) {
    .results-cards {
      grid-template-columns: repeat(4, 1fr);
    }
    .affiliation-cards {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .map-wrapper {
      height: calc(100vh - 480px);
    }
    .filter-controls {
      flex-direction: column;
      align-items: stretch;
    }
    .filter-group .input {
      min-width: 0;
    }
    .filter-actions {
      display: flex;
      gap: 8px;
    }
    .filter-actions button {
      flex: 1;
    }
  }

  @media (max-width: 640px) {
    .map-page {
      padding: 16px;
    }
    .map-header {
      padding: 20px;
    }
    .header-content h1 {
      font-size: 20px;
    }
    .results-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .affiliation-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .map-wrapper {
      height: calc(100vh - 580px);
    }
    .map-legend {
      bottom: 10px;
      right: 10px;
      padding: 10px;
      min-width: 140px;
    }
    .result-card-value {
      font-size: 18px;
    }
    .aff-card-value {
      font-size: 22px;
    }
  }
</style>

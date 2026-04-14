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

  async function cargarDatos() {
    try {
      // Cargar datos geográficos
      const { data: geoData, error: geoError } = await supabaseMapa
        .from('secciones_geo_slp')
        .select('feature, seccion, distrito_f, distrito_l');

      if (geoError) throw geoError;

      // Cargar resultados electorales - usar nombres exactos de columnas según esquema
      const { data: resultados, error: resultadosError } = await supabaseMapa
        .from('resultados_dip_locales_slp')
        .select('seccion, "Municipio", "PAN", "PRI", "PRD", "PVEM", "PT", "MORENA", votos_emitidos, abstencion');

      if (resultadosError) throw resultadosError;


      // Función para normalizar número de sección
       function normalizarSeccion(sec) {
         if (sec === null || sec === undefined) return null;
         // Convertir a número y luego a string para eliminar ceros a la izquierda
         const num = Number(sec);
         if (isNaN(num)) return String(sec).trim();
         return String(num);
       }

        // Función para obtener valor de columna ignorando mayúsculas/minúsculas
        function getValue(row, columnName) {
          if (row[columnName] !== undefined) return row[columnName];
          // Buscar coincidencia insensible a mayúsculas
          const lowerColumn = columnName.toLowerCase();
          for (const key in row) {
            if (key.toLowerCase() === lowerColumn) return row[key];
          }
          return undefined;
        }

       // Agrupar resultados por sección (sumar votos)
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
        
        
        
        // Debug: verificar coincidencias de sección
        const geoSecciones = new Set(geoData.map(g => normalizarSeccion(g.seccion)).filter(Boolean));
        const resultadosSecciones = new Set(Object.keys(resultadosPorSeccion));
        const coinciden = [...geoSecciones].filter(sec => resultadosSecciones.has(sec));



       // Combinar datos geográficos con resultados
       allData = geoData.map(geoRow => {
         const seccion = normalizarSeccion(geoRow.seccion);
         const resultadosSeccion = resultadosPorSeccion[seccion] || null;
         return {
           ...geoRow,
           resultados: resultadosSeccion
         };
       });
       

      // Extraer distritos para filtro
      const distritos = [...new Set(geoData.map(row => row.distrito_l).filter(Boolean))].sort();
      distritosL = distritos;

      // Extraer municipios para filtro
      const municipiosUnicos = [...new Set(Object.values(resultadosPorSeccion)
        .map(r => r.municipio)
        .filter(Boolean))].sort();
      municipios = municipiosUnicos;

        resultadosData = Object.values(resultadosPorSeccion);
        
        
        loading = false;
    } catch (e) {
      console.error('Error cargando datos:', e);
      error = e.message;
      loading = false;
    }
  }

  function getColorByVotes(votos) {
    if (!votos || votos === 0) return '#f0f0f0'; // gris claro para sin datos
    
    // Encontrar rango de votos para normalizar
    const votosValues = allData
      .map(d => d.resultados?.votos_emitidos || 0)
      .filter(v => v > 0);
    
    if (votosValues.length === 0) return '#f0f0f0';
    
    const maxVotos = Math.max(...votosValues);
    if (maxVotos === 0) return '#f0f0f0';
    
    // Normalizar entre 0.3 y 0.9 (invertido: más votos = más oscuro)
    const normalized = Math.min(votos / maxVotos, 1);
    const lightness = 90 - (normalized * 60); // de 90% a 30%
    
    return `hsl(0, 70%, ${lightness}%)`;
  }

  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('es-MX');
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

    // Aplicar filtros combinados
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
          
          // Calcular votos totales (usar votos_emitidos si disponible, sino sumar partidos)
          let votosTotales = 0;
          if (resultados) {
            votosTotales = resultados.votos_emitidos || 
              (resultados.PAN + resultados.PRI + resultados.PRD + 
               resultados.PVEM + resultados.PT + resultados.MORENA);
          }
          
          // Obtener color basado en votos totales
          const fillColor = getColorByVotes(votosTotales);

          const layer = L.geoJSON(geojson, {
            style: {
              color: '#0366d6',
              weight: 1,
              opacity: 0.8,
              fillColor: fillColor,
              fillOpacity: 0.6
            }
          });

          layer.on('mouseover', function () {
            this.setStyle({ fillOpacity: 0.8, weight: 2 });
          });

          layer.on('mouseout', function () {
            this.setStyle({ fillOpacity: 0.6, weight: 1 });
          });

          // Construir contenido del popup con datos de votación
          let popupContent = `<b>Sección:</b> ${seccion}<br>`;
          popupContent += `<b>Distrito Federal:</b> ${distritoF}<br>`;
          popupContent += `<b>Distrito Local:</b> ${distritoL}<br>`;
          
          if (resultados) {
            popupContent += `<b>Municipio:</b> ${resultados.municipio || 'N/A'}<br>`;
            popupContent += `<hr style="margin: 8px 0; border-color: #e1e4e8;">`;
            popupContent += `<b>Votos Totales:</b> ${formatNumber(votosTotales)}<br>`;
            popupContent += `<b>Abstenciones:</b> ${formatNumber(resultados.abstencion)}<br>`;
            popupContent += `<hr style="margin: 8px 0; border-color: #e1e4e8;">`;
            popupContent += `<b>Votos por Partido:</b><br>`;
            popupContent += `• MORENA: ${formatNumber(resultados.MORENA)}<br>`;
            popupContent += `• PAN: ${formatNumber(resultados.PAN)}<br>`;
            popupContent += `• PRI: ${formatNumber(resultados.PRI)}<br>`;
            popupContent += `• PVEM: ${formatNumber(resultados.PVEM)}<br>`;
            popupContent += `• PT: ${formatNumber(resultados.PT)}<br>`;
            popupContent += `• PRD: ${formatNumber(resultados.PRD)}<br>`;
          } else {
            popupContent += `<br><i>No hay datos de votación para esta sección</i>`;
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
    <h1>Mapa de Secciones Electorales - Diputación SLP</h1>
    <div class="filter-controls">
      <div class="filter-group">
        <label for="distrito-l">Distrito Local</label>
        <div class="select-wrapper">
          <select id="distrito-l" bind:value={distritoSeleccionado} on:change={aplicarFiltro} class="select-input">
            <option value="">Todos</option>
            {#each distritosL as distrito}
              <option value={distrito}>{distrito}</option>
            {/each}
          </select>
          {#if distritoSeleccionado}
            <button on:click={limpiarFiltroDistrito} class="btn-clear-small" title="Limpiar filtro" type="button">
              ✕
            </button>
          {/if}
        </div>
      </div>
      
      <div class="filter-group">
        <label for="municipio">Municipio</label>
        <div class="select-wrapper">
          <select id="municipio" bind:value={municipioSeleccionado} on:change={aplicarFiltro} class="select-input">
            <option value="">Todos</option>
            {#each municipios as municipio}
              <option value={municipio}>{municipio}</option>
            {/each}
          </select>
          {#if municipioSeleccionado}
            <button on:click={limpiarFiltroMunicipio} class="btn-clear-small" title="Limpiar filtro" type="button">
              ✕
            </button>
          {/if}
        </div>
      </div>
      
      <div class="filter-buttons">
        <button on:click={aplicarFiltro} class="btn-apply">Filtrar</button>
        <button on:click={limpiarTodosFiltros} class="btn-clear">Limpiar Todo</button>
      </div>
    </div>
  </header>

  {#if loading}
    <div class="loading">Cargando secciones electorales...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {/if}



  <!-- Totales y votos por partido -->
  <section class="party-cards-section">
    <h2>Resultados Electorales</h2>
    <div class="cards">
      <div class="card">
        <h3>Votos Totales</h3>
        <p class="number">{formatNumber(votosPorPartido.total)}</p>
      </div>
      <div class="card">
        <h3>Abstenciones</h3>
        <p class="number">{formatNumber(votosPorPartido.abstencion)}</p>
      </div>
      <div class="card">
        <h3>MORENA</h3>
        <p class="number">{formatNumber(votosPorPartido.MORENA)}</p>
      </div>
      <div class="card">
        <h3>PAN</h3>
        <p class="number">{formatNumber(votosPorPartido.PAN)}</p>
      </div>
      <div class="card">
        <h3>PRI</h3>
        <p class="number">{formatNumber(votosPorPartido.PRI)}</p>
      </div>
      <div class="card">
        <h3>PVEM</h3>
        <p class="number">{formatNumber(votosPorPartido.PVEM)}</p>
      </div>
      <div class="card">
        <h3>PT</h3>
        <p class="number">{formatNumber(votosPorPartido.PT)}</p>
      </div>
      <div class="card">
        <h3>PRD</h3>
        <p class="number">{formatNumber(votosPorPartido.PRD)}</p>
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

  <!-- Tarjetas de afiliados por partido -->
  <section class="party-cards-section">
    <h2>Afiliados por partido</h2>
    <div class="cards">
      <div class="card">
        <h3>MORENA</h3>
        <p class="number">224,282</p>
      </div>
      <div class="card">
        <h3>PVEM</h3>
        <p class="number">200,224</p>
      </div>
      <div class="card">
        <h3>MC</h3>
        <p class="number">8,621</p>
      </div>
      <div class="card">
        <h3>PT</h3>
        <p class="number">7,573</p>
      </div>
      <div class="card">
        <h3>PAN</h3>
        <p class="number">7,174</p>
      </div>
      <div class="card">
        <h3>PRI</h3>
        <p class="number">1,920</p>
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
  }

   .map-page {
     max-width: 1600px;
     margin: 0 auto;
     padding: 30px;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
   }

  .map-header {
    background: white;
    padding: 20px 30px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 20px;
  }

  .map-header h1 {
    margin: 0 0 15px 0;
    color: #24292e;
    font-size: 24px;
  }

  .filter-controls {
    display: flex;
    align-items: flex-end;
    gap: 15px;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-group label {
    font-size: 13px;
    font-weight: 600;
    color: #586069;
  }

  .filter-group select {
    padding: 8px 12px;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    background: white;
    cursor: pointer;
    min-width: 180px;
  }

  .filter-group select:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.15);
  }

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

  .select-input:hover {
    border-color: #0366d6;
  }

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

  .filter-buttons {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-apply {
    background: #28a745;
    color: white;
  }

  .btn-apply:hover {
    background: #218838;
  }

  .btn-clear {
    background: #6c757d;
    color: white;
  }

  .btn-clear:hover {
    background: #5a6268;
  }

  .map-wrapper {
    position: relative;
    height: calc(100vh - 420px);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .map-container {
    height: 100%;
    width: 100%;
  }

  .map-legend {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-size: 12px;
    z-index: 1000;
    min-width: 160px;
  }

  .map-legend h4 {
    margin: 0 0 8px 0;
    color: #24292e;
    font-size: 13px;
    font-weight: 600;
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
    color: #586069;
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
    background: white;
    border-radius: 8px;
    margin-bottom: 20px;
    color: #586069;
  }

  .error {
    background: #ffeef0;
    border: 1px solid #fdaeb7;
    color: #c5221f;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  /* Sección de tarjetas de afiliados por partido */
  .party-cards-section {
    margin-top: 30px;
    background: white;
    border-radius: 8px;
    padding: 25px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .party-cards-section h2 {
    margin: 0 0 20px 0;
    color: #24292e;
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

   .cards {
     display: grid;
     grid-template-columns: repeat(8, 1fr);
     gap: 15px;
   }

   .party-cards-section:last-of-type .cards {
     grid-template-columns: repeat(6, 1fr);
   }

  .card {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 20px 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    text-align: center;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .card h3 {
    margin: 0 0 8px 0;
    color: #586069;
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card .number {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #24292e;
  }



   /* Responsive */
   @media (max-width: 1024px) {
     .cards {
       grid-template-columns: repeat(4, 1fr);
     }
     .party-cards-section:last-of-type .cards {
       grid-template-columns: repeat(3, 1fr);
     }
     .map-wrapper {
       height: calc(100vh - 450px);
     }
   }

   @media (max-width: 640px) {
     .cards {
       grid-template-columns: repeat(2, 1fr);
     }
     .party-cards-section:last-of-type .cards {
       grid-template-columns: repeat(2, 1fr);
     }
     .map-wrapper {
       height: calc(100vh - 550px);
     }
     .map-legend {
       bottom: 10px;
       right: 10px;
       padding: 10px;
       min-width: 140px;
     }
   }
</style>

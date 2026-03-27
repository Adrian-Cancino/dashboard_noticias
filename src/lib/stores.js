import { writable } from 'svelte/store';
import { supabase } from './supabase';

export const loading = writable(false);
export const error = writable(null);
export const noticias = writable([]);
export const resumen = writable({
  totalNoticias: 0,
  porMedio: [],
  porSentimiento: [],
  porClasificacion: [],
  mencionesPersonas: []
});

function esVerdadero(valor) {
  if (!valor) return false;
  const v = valor.toString().toLowerCase().trim();
  return v === 'true' || v === 'si' || v === '1' || v === 'yes';
}

// ✅ Función modificada para aceptar filtros de fecha
export async function cargarDatos(fechaInicio = null, fechaFin = null) {
  loading.set(true);
  error.set(null);

  try {
    console.log('🔄 [1/5] Iniciando carga...', { fechaInicio, fechaFin });

    // Construir consulta base
    let query = supabase
      .from('noticias')
      .select(`
        id,
        medio,
        url,
        fecha_nota,
        analisis_noticias (
          clasificacion,
          sentimiento,
          mencion_arreola,
          mencion_ruth,
          mencion_gerardo,
          mencion_rosa,
          mencion_cuaihtli,
          mencion_valladares,
          mencion_rita
        )
      `);

    // 📅 Aplicar filtro de fecha inicio (inclusive desde 00:00:00)
    if (fechaInicio) {
      query = query.gte('fecha_nota', `${fechaInicio}T00:00:00`);
      console.log('📅 Filtro inicio aplicado:', fechaInicio);
    }

    // 📅 Aplicar filtro de fecha fin (inclusive hasta 23:59:59)
    if (fechaFin) {
      query = query.lte('fecha_nota', `${fechaFin}T23:59:59`);
      console.log('📅 Filtro fin aplicado:', fechaFin);
    }

    // Ejecutar consulta con ordenamiento
    const { data: noticiasData, error: errorNoticias } = await query
      .order('fecha_nota', { ascending: false });

    console.log('🔄 [2/5] Respuesta:', { 
      tieneData: noticiasData !== undefined, 
      length: noticiasData?.length, 
      error: errorNoticias 
    });

    if (errorNoticias) {
      console.error('❌ [3/5] Error de Supabase:', errorNoticias);
      throw errorNoticias;
    }

    if (!noticiasData || noticiasData.length === 0) {
      console.warn('⚠️ [3/5] No hay datos para el rango seleccionado');
      resumen.set({
        totalNoticias: 0,
        porMedio: [],
        porSentimiento: [],
        porClasificacion: [],
        mencionesPersonas: []
      });
      loading.set(false);
      return;
    }

    console.log('🔄 [4/5] Procesando', noticiasData.length, 'noticias...');

    // Procesar datos: aplanar la estructura del JOIN
    const datosProcesados = noticiasData.map(nota => {
      const analisis = Array.isArray(nota.analisis_noticias) 
        ? nota.analisis_noticias[0] 
        : nota.analisis_noticias;
      
      return {
        ...nota,
        analisis: analisis || {}
      };
    });

    const procesados = procesarDatos(datosProcesados);
    
    console.log('🔄 [5/5] Resumen:', procesados);

    // Actualizar stores
    noticias.set(datosProcesados);
    resumen.set(procesados);
    
  } catch (err) {
    console.error('💥 Error crítico:', err);
    error.set(err.message || 'Error al cargar los datos');
  } finally {
    loading.set(false);
  }
}

function procesarDatos(datos) {
  const totalNoticias = datos.length;
  
  // --- Contar por Medio ---
  const porMedioMap = {};
  datos.forEach(nota => {
    const medio = nota.medio || 'Sin Medio';
    porMedioMap[medio] = (porMedioMap[medio] || 0) + 1;
  });
  const porMedio = Object.entries(porMedioMap).map(([medio, cantidad]) => ({ medio, cantidad }));

  // --- Contar por Sentimiento ---
  const porSentimientoMap = {};
  datos.forEach(nota => {
    const sentimiento = nota.analisis?.sentimiento || 'Sin Clasificar';
    porSentimientoMap[sentimiento] = (porSentimientoMap[sentimiento] || 0) + 1;
  });
  const porSentimiento = Object.entries(porSentimientoMap).map(([sentimiento, cantidad]) => ({ sentimiento, cantidad }));

  // --- Contar por Clasificación ---
  const porClasificacionMap = {};
  datos.forEach(nota => {
    const clasificacion = nota.analisis?.clasificacion || 'Sin Clasificar';
    porClasificacionMap[clasificacion] = (porClasificacionMap[clasificacion] || 0) + 1;
  });
  const porClasificacion = Object.entries(porClasificacionMap).map(([clasificacion, cantidad]) => ({ clasificacion, cantidad }));

  // --- Contar Menciones por Persona ---
  const personas = [
    { campo: 'mencion_arreola', nombre: 'Arreola' },
    { campo: 'mencion_ruth', nombre: 'Ruth' },
    { campo: 'mencion_gerardo', nombre: 'Gerardo' },
    { campo: 'mencion_rosa', nombre: 'Rosa' },
    { campo: 'mencion_cuaihtli', nombre: 'Cuaihtli' },
    { campo: 'mencion_valladares', nombre: 'Valladares' },
    { campo: 'mencion_rita', nombre: 'Rita' }
  ];

  const mencionesPersonas = personas.map(p => ({
    nombre: p.nombre,
    menciones: datos.filter(nota => esVerdadero(nota.analisis?.[p.campo])).length
  }));

  return {
    totalNoticias,
    porMedio,
    porSentimiento,
    porClasificacion,
    mencionesPersonas
  };
}
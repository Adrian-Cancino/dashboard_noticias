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

export const filtrosActivos = writable({
  fechaInicio: null,
  fechaFin: null,
  persona: null,
  medio: null
});

function esVerdadero(valor) {
  if (!valor) return false;
  const v = valor.toString().toLowerCase().trim();
  return v === 'true' || v === 'si' || v === '1' || v === 'yes';
}

// ✅ Función corregida - el filtro por persona se aplica después de obtener los datos
export async function cargarDatos({
  fechaInicio = null,
  fechaFin = null,
  persona = null,
  medio = null
} = {}) {
  loading.set(true);
  error.set(null);

  filtrosActivos.set({
    fechaInicio,
    fechaFin,
    persona,
    medio
  });

  try {
    console.log('🔄 [1/5] Iniciando carga...', { fechaInicio, fechaFin, persona, medio });

    // Construir consulta base (SOLO filtros que Supabase soporta en server)
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

    // 📅 Filtro de fecha inicio
    if (fechaInicio) {
      query = query.gte('fecha_nota', `${fechaInicio}T00:00:00`);
      console.log('📅 Filtro inicio aplicado:', fechaInicio);
    }

    // 📅 Filtro de fecha fin
    if (fechaFin) {
      query = query.lte('fecha_nota', `${fechaFin}T23:59:59`);
      console.log('📅 Filtro fin aplicado:', fechaFin);
    }

    // 📰 Filtro por medio (este SÍ funciona en server)
    if (medio) {
      query = query.eq('medio', medio);
      console.log('📰 Filtro medio aplicado:', medio);
    }

    // Ejecutar consulta
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
      console.warn('⚠️ [3/5] No hay datos para los filtros seleccionados');
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

    // Procesar datos: aplanar la estructura del JOIN
    let datosProcesados = noticiasData.map(nota => {
      const analisis = Array.isArray(nota.analisis_noticias) 
        ? nota.analisis_noticias[0] 
        : nota.analisis_noticias;
      
      return {
        ...nota,
        analisis: analisis || {}
      };
    });

    // 👤 FILTRO POR PERSONA (CLIENTE-SIDE) - Supabase no permite filtrar en tablas relacionadas
    if (persona) {
      const campoPersona = getCampoPersona(persona);
      if (campoPersona) {
        console.log('👤 Filtrado por persona (cliente):', persona, '->', campoPersona);
        datosProcesados = datosProcesados.filter(nota => 
          esVerdadero(nota.analisis?.[campoPersona])
        );
        console.log('👤 Después del filtro:', datosProcesados.length, 'noticias');
      }
    }

    if (datosProcesados.length === 0) {
      console.warn('⚠️ [4/5] No hay datos después de aplicar filtros');
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

    console.log('🔄 [4/5] Procesando', datosProcesados.length, 'noticias...');

    const procesados = procesarDatos(datosProcesados);
    
    console.log('🔄 [5/5] Resumen:', procesados);

    noticias.set(datosProcesados);
    resumen.set(procesados);
    
  } catch (err) {
    console.error('💥 Error crítico:', err);
    error.set(err.message || 'Error al cargar los datos');
  } finally {
    loading.set(false);
  }
}

function getCampoPersona(nombre) {
  const mapeo = {
    'Arreola': 'mencion_arreola',
    'Ruth': 'mencion_ruth',
    'Gerardo': 'mencion_gerardo',
    'Rosa': 'mencion_rosa',
    'Cuaihtli': 'mencion_cuaihtli',
    'Valladares': 'mencion_valladares',
    'Rita': 'mencion_rita'
  };
  return mapeo[nombre] || null;
}

export async function obtenerMediosUnicos() {
  try {
    const { data, error } = await supabase
      .from('noticias')
      .select('medio')
      .not('medio', 'is', null);
    
    if (error) throw error;
    
    const mediosUnicos = [...new Set(data.map(d => d.medio))].sort();
    return mediosUnicos;
  } catch (err) {
    console.error('Error al obtener medios:', err);
    return [];
  }
}

export const personasDisponibles = [
  'Arreola',
  'Ruth',
  'Gerardo',
  'Rosa',
  'Cuaihtli',
  'Valladares',
  'Rita'
];

function procesarDatos(datos) {
  const totalNoticias = datos.length;
  
  const porMedioMap = {};
  datos.forEach(nota => {
    const medio = nota.medio || 'Sin Medio';
    porMedioMap[medio] = (porMedioMap[medio] || 0) + 1;
  });
  const porMedio = Object.entries(porMedioMap).map(([medio, cantidad]) => ({ medio, cantidad }));

  const porSentimientoMap = {};
  datos.forEach(nota => {
    const sentimiento = nota.analisis?.sentimiento || 'Sin Clasificar';
    porSentimientoMap[sentimiento] = (porSentimientoMap[sentimiento] || 0) + 1;
  });
  const porSentimiento = Object.entries(porSentimientoMap).map(([sentimiento, cantidad]) => ({ sentimiento, cantidad }));

  const porClasificacionMap = {};
  datos.forEach(nota => {
    const clasificacion = nota.analisis?.clasificacion || 'Sin Clasificar';
    porClasificacionMap[clasificacion] = (porClasificacionMap[clasificacion] || 0) + 1;
  });
  const porClasificacion = Object.entries(porClasificacionMap).map(([clasificacion, cantidad]) => ({ clasificacion, cantidad }));

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
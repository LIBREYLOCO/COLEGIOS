/* =============================================================
   L&L · Lógica & Liquidez · app.js v3
   Mercado: México — Ciclo escolar Sept–Ago
   Matrícula: cascada grado a grado (Maternal → 3ro Bachillerato)
   ============================================================= */

'use strict';

const App = (() => {

  // ============================================================
  // 1. GRADE CATALOG  — 16 grados individuales
  // ============================================================
  const GRADES = [
    // key | label | level label | levelKey (tuition bucket)
    { key: 'mat', label: 'Maternal', level: 'Maternal', levelKey: 'maternalK1' },
    { key: 'k1', label: 'Kínder 1', level: 'Kínder', levelKey: 'maternalK1' },
    { key: 'k2', label: 'Kínder 2', level: 'Kínder', levelKey: 'kinder23' },
    { key: 'k3', label: 'Kínder 3', level: 'Kínder', levelKey: 'kinder23' },
    { key: 'p1', label: '1ro de Primaria', level: 'Primaria', levelKey: 'primaria' },
    { key: 'p2', label: '2do de Primaria', level: 'Primaria', levelKey: 'primaria' },
    { key: 'p3', label: '3ro de Primaria', level: 'Primaria', levelKey: 'primaria' },
    { key: 'p4', label: '4to de Primaria', level: 'Primaria', levelKey: 'primaria' },
    { key: 'p5', label: '5to de Primaria', level: 'Primaria', levelKey: 'primaria' },
    { key: 'p6', label: '6to de Primaria', level: 'Primaria', levelKey: 'primaria' },
    { key: 's1', label: '1ro de Secundaria', level: 'Secundaria', levelKey: 'secundaria' },
    { key: 's2', label: '2do de Secundaria', level: 'Secundaria', levelKey: 'secundaria' },
    { key: 's3', label: '3ro de Secundaria', level: 'Secundaria', levelKey: 'secundaria' },
    { key: 'b1', label: '1ro de Bachillerato', level: 'Bachillerato', levelKey: 'bachillerato' },
    { key: 'b2', label: '2do de Bachillerato', level: 'Bachillerato', levelKey: 'bachillerato' },
    { key: 'b3', label: '3ro de Bachillerato', level: 'Bachillerato', levelKey: 'bachillerato' }
  ];

  // Groups of consecutive grade-keys per level (for cascade entry-point logic)
  const LEVELS = [
    { key: 'Maternal', grades: ['mat'], tuitionKey: 'maternalK1' },
    { key: 'Kínder', grades: ['k1', 'k2', 'k3'], tuitionKey: 'maternalK1' },  // K1 same tuition as Maternal
    { key: 'Primaria', grades: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], tuitionKey: 'primaria' },
    { key: 'Secundaria', grades: ['s1', 's2', 's3'], tuitionKey: 'secundaria' },
    { key: 'Bachillerato', grades: ['b1', 'b2', 'b3'], tuitionKey: 'bachillerato' }
  ];

  // Entry grades per level (get students exclusively from entradaPorNivel, no cascade feed)
  // Exception: k1 is NOT an entry grade — it cascades from mat + Kínder entrada
  const ENTRY_GRADES = new Set(['mat', 'p1', 's1', 'b1']);

  // Revenue aggregation buckets  (5 tuition tiers)
  const TUITION_KEYS = ['maternalK1', 'kinder23', 'primaria', 'secundaria', 'bachillerato'];
  const TUITION_LABELS = ['Maternal / Kínder 1', 'Kínder 2–3', 'Primaria', 'Secundaria', 'Bachillerato'];

  // Grade key → tuition bucket
  const G2T = {};
  GRADES.forEach(g => { G2T[g.key] = g.levelKey; });
  // Override K1 tuition to maternalK1 (same level price)
  G2T['k1'] = 'maternalK1';

  // Dynamic projection horizon (read from state; defaults to 7)
  function getYears() { return (state && state.horizonte) ? Math.max(1, Math.min(10, state.horizonte)) : 7; }
  // ── Parámetros Legales Nómina México 2024/2025 ──────────────────────
  const NOM_UMA = 117.31;   // UMA diaria 2025 aprox
  const NOM_SMG = 248.93;   // Salario Mínimo General
  const NOM_DIAS_MES = 30;
  const NOM_AGUINALDO_DIAS = 15;
  const NOM_VACACIONES_DIAS = 6;
  const NOM_PRIMA_VAC = 0.25;
  const NOM_FI = 1 + (NOM_AGUINALDO_DIAS + (NOM_VACACIONES_DIAS * NOM_PRIMA_VAC)) / 365;

  // Tabla ISR mensual 2025 (simplificada L&L)
  const ISR_TABLA = [
    { li: 0.01, ls: 746.04, cuota: 0, tasa: 0.0192 },
    { li: 746.05, ls: 6332.05, cuota: 14.32, tasa: 0.064 },
    { li: 6332.06, ls: 11128.01, cuota: 371.83, tasa: 0.1088 },
    { li: 11128.02, ls: 12935.82, cuota: 893.63, tasa: 0.16 },
    { li: 12935.83, ls: 15487.71, cuota: 1182.88, tasa: 0.1792 },
    { li: 15487.72, ls: 31236.49, cuota: 1640.18, tasa: 0.2136 },
    { li: 31236.50, ls: 49233.00, cuota: 5004.12, tasa: 0.2352 },
    { li: 49233.01, ls: 93993.90, cuota: 9236.89, tasa: 0.30 },
    { li: 93993.91, ls: 125325.20, cuota: 22665.17, tasa: 0.32 },
    { li: 125325.21, ls: 375975.61, cuota: 32691.18, tasa: 0.34 },
    { li: 375975.62, ls: Infinity, cuota: 117912.32, tasa: 0.35 }
  ];

  // Tabla Subsidio al Empleo mensual 2025 (simplificada L&L)
  const SUB_TABLA = [
    { li: 0.01, ls: 1768.96, sub: 407.02 },
    { li: 1768.97, ls: 2653.38, sub: 406.83 },
    { li: 2653.39, ls: 3472.84, sub: 406.62 },
    { li: 3472.85, ls: 3537.87, sub: 392.77 },
    { li: 3537.88, ls: 4446.15, sub: 382.46 },
    { li: 4446.16, ls: 4717.18, sub: 354.23 },
    { li: 4717.19, ls: 5335.42, sub: 324.87 },
    { li: 5335.43, ls: 6224.67, sub: 294.63 },
    { li: 6224.68, ls: 7113.90, sub: 253.54 },
    { li: 7113.91, ls: 7382.33, sub: 217.61 },
    { li: 7382.34, ls: Infinity, sub: 0 }
  ];

  // ============================================================
  // 2. DEFAULT STATE
  // ============================================================
  const DEFAULTS = {
    variables: {
      anoInicio: 2026,
      terreno: 40000,
      capitalRequerido: 100000000,
      inflacion: 0.05,
      aumentoColegiatura: 0.06,
      porcentajeModelo: 0.30,
      porcentajeOperadora: 0.12,
      rentaInmuebleBase: 0,
      numAcciones: 100,
      numTickets: 100,
      // ── New enrollment variables ──
      tasaDesercion: 0.03,    // % alumnos que no continúan al siguiente grado
      tasaCaptacion: 0.05     // crecimiento anual de nuevos ingresos externos
    },
    horizonte: 7,
    ingresosAdicionales: [],   // [{nombre, montoAnual, esRecurrente, cicloInicio}]

    // ── Matrícula inicial por grado (Año 0 = 2026) ──
    // Distribución: 15 Maternal + 31 K1 + 36 K2 + 36 K3 + 54×6 Primaria + 62×2+61 Sec + 45+44×2 Bach
    // Total = 759 alumnos
    matriculaInicial: {
      mat: 15,                                            // Maternal: fijo 15 (tradicional)
      k1: 13, k2: 11, k3: 10,                          // Kinder: cascade desde Maternal
      p1: 30, p2: 26, p3: 22, p4: 19, p5: 16, p6: 14, // 1°Prim fijo 30 → cascade
      s1: 25, s2: 21, s3: 18,
      b1: 20, b2: 17, b3: 14
    },

    // ── Nuevos ingresos EXTERNOS por grado (alumnos que entran desde fuera, por año) ──
    nuevosIngresos: {
      mat: 15,         // Maternal: todos son nuevos cada año
      k1: 5, k2: 1, k3: 1,    // K1: algunos de otra escuela; K2-K3: transferencias
      p1: 10, p2: 2, p3: 2, p4: 2, p5: 2, p6: 2,
      s1: 8, s2: 2, s3: 1,
      b1: 8, b2: 2, b3: 1
    },

    // ── Deserción diferenciada por nivel (flat, legacy) ──
    desercionPorNivel: {
      Maternal: 0.05,
      'Kínder': 0.04,
      Primaria: 0.03,
      Secundaria: 0.04,
      Bachillerato: 0.05
    },

    // ── Proyección dinámica: deserción y entrada por nivel y por año (getYears()-1 valores) ──
    // entradaPorNivel[nivel][t] = alumnos que entran al grado inicial del nivel en el Año t+1
    // Para Kínder, este valor se SUMA al cascade mat→k1 (k1 no es grado de entrada independiente)
    entradaPorNivel: {
      'Maternal': [18, 20, 22, 23, 24, 25],
      'Kínder': [25, 27, 29, 31, 33, 35],
      'Primaria': [62, 64, 66, 68, 70, 72],
      'Secundaria': [65, 67, 69, 70, 72, 73],
      'Bachillerato': [48, 50, 52, 54, 56, 58]
    },
    // desercionAnual[nivel][t] = % de alumnos que no continúan al año t+1
    desercionAnual: {
      'Maternal': [0.05, 0.05, 0.04, 0.04, 0.03, 0.03],
      'Kínder': [0.04, 0.04, 0.04, 0.03, 0.03, 0.03],
      'Primaria': [0.03, 0.03, 0.03, 0.03, 0.02, 0.02],
      'Secundaria': [0.04, 0.04, 0.03, 0.03, 0.03, 0.02],
      'Bachillerato': [0.05, 0.05, 0.04, 0.04, 0.04, 0.03]
    },

    // ── Capacidad máxima por grado ──
    capacidadMaxima: {
      mat: 30,
      k1: 50, k2: 50, k3: 50,
      p1: 50, p2: 50, p3: 50, p4: 50, p5: 50, p6: 50,
      s1: 50, s2: 50, s3: 50,
      b1: 25, b2: 25, b3: 25
    },

    topeTotalAlumnos: 1155,

    // ── Modelo simplificado de matrícula ──
    tasaReinscripcion: 0.85,  // % de alumnos que se reinscriben
    tasaCrecimientoNuevoIngreso: 0.05,  // % crecimiento anual sobre reinscritos

    // ── Grados activos (false = excluir de proyección) ──
    gradosActivos: {
      mat: true,
      k1: true, k2: true, k3: true,
      p1: true, p2: true, p3: true, p4: true, p5: true, p6: true,
      s1: true, s2: true, s3: true,
      b1: true, b2: true, b3: true
    },

    // ── Aranceles (ciclo 2025–26) ──
    colegiaturas: {
      maternalK1: 5900,
      kinder23: 8200,
      primaria: 11200,
      secundaria: 12400,
      bachillerato: 13100
    },

    // ── Colegiaturas de referencia Newland (base para el selector de tipos) ──
    colegiaturasNewland: {
      maternalK1: 5900,
      kinder23: 8200,
      primaria: 11200,
      secundaria: 12400,
      bachillerato: 13100
    },
    selectorColegiatura: {
      tipo: 'newland',       // 'newland' | 'media' | 'baja'
      descuentoMedias: 0.15, // 15% descuento sobre Newland
      descuentoBajas: 0.30   // 30% descuento sobre Newland
    },
    inscripciones: {
      maternalK1: { cuotaInsc: 0, admision: 1804, orfandad: 3238, seguro: 1208, otro: 0 },
      kinder23: { cuotaInsc: 1395, admision: 6470, orfandad: 3238, seguro: 1425, otro: 0 },
      primaria: { cuotaInsc: 1373, admision: 10033, orfandad: 3049, seguro: 1495, otro: 0 },
      secundaria: { cuotaInsc: 1395, admision: 11410, orfandad: 2402, seguro: 1537, otro: 0 },
      bachillerato: { cuotaInsc: 1395, admision: 11410, orfandad: 1201, seguro: 769, otro: 0 }
    },
    cuotas: {
      maternalK1: { cuota: 2179, lider: 2697, utiles: 1434, teds: 2921, otro: 0 },
      kinder23: { cuota: 3034, lider: 2697, utiles: 1434, teds: 0, otro: 0 },
      primaria: { cuota: 3695, lider: 2697, utiles: 1238, teds: 0, otro: 0 },
      secundaria: { cuota: 4197, lider: 2697, utiles: 1108, teds: 0, otro: 0 },
      bachillerato: { cuota: 5934, lider: 0, utiles: 0, teds: 0, otro: 0 }
    },
    descuentos: {
      inscripcionPct: 0.1557,
      apoyosEconomicosPct: 0.0786,
      becasSepPct: 0.0500,
      prontoPagoPct: 0.10
    },

    // ── Nóminas ──
    nominas: {
      // Catálogo de nómina base — importado de CSV "NOMINA MODELO BASE COLEGIO TIPO"
      // 70 personas individuales, count:1 cada una — el motor calcula IMSS/ISN/Infonavit por persona
      puestos: [
        // ── Dirección ──
        { nombre: 'DIRECCIÓN', sector: 'Dirección', sueldo: 53000, count: 1, esHonorarios: false },
        { nombre: 'Recepción', sector: 'Administración', sueldo: 10000, count: 1, esHonorarios: false },
        // ── Administración ──
        { nombre: 'Coordinador Administrativo', sector: 'Administración', sueldo: 25000, count: 1, esHonorarios: false },
        { nombre: 'Coordinación Preescolar', sector: 'Administración', sueldo: 25000, count: 1, esHonorarios: false },
        { nombre: 'Coordinación Primaria Baja', sector: 'Administración', sueldo: 18500, count: 1, esHonorarios: false },
        { nombre: 'Coordinación Primaria Alta', sector: 'Administración', sueldo: 25000, count: 1, esHonorarios: false },
        { nombre: 'Coordinador Secundaria', sector: 'Administración', sueldo: 25000, count: 1, esHonorarios: false },
        { nombre: 'Coordinador Prepa', sector: 'Administración', sueldo: 25000, count: 1, esHonorarios: false },
        { nombre: 'Servicios Escolares', sector: 'Administración', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Auxiliar Administrativo', sector: 'Administración', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Líder TI', sector: 'Administración', sueldo: 20000, count: 1, esHonorarios: false },
        { nombre: 'TECNOLOGIA', sector: 'Administración', sueldo: 14000, count: 1, esHonorarios: false },
        { nombre: 'CAP 1', sector: 'Administración', sueldo: 14000, count: 1, esHonorarios: false },
        { nombre: 'CAP 2', sector: 'Administración', sueldo: 14000, count: 1, esHonorarios: false },
        { nombre: 'Lider CAI', sector: 'Administración', sueldo: 18000, count: 1, esHonorarios: false },
        { nombre: 'CAI A', sector: 'Administración', sueldo: 12000, count: 1, esHonorarios: false },
        { nombre: 'CAI B', sector: 'Administración', sueldo: 12000, count: 1, esHonorarios: false },
        { nombre: 'CAI C', sector: 'Administración', sueldo: 14000, count: 1, esHonorarios: false },
        { nombre: 'Intendencia 1', sector: 'Administración', sueldo: 10000, count: 1, esHonorarios: false },
        { nombre: 'Intendencia 2', sector: 'Administración', sueldo: 10000, count: 1, esHonorarios: false },
        { nombre: 'Intendencia 3', sector: 'Administración', sueldo: 10000, count: 1, esHonorarios: false },
        { nombre: 'Intendencia 4', sector: 'Administración', sueldo: 10000, count: 1, esHonorarios: false },
        { nombre: 'Intendencia 5', sector: 'Administración', sueldo: 10000, count: 1, esHonorarios: false },
        { nombre: 'Enfermera', sector: 'Administración', sueldo: 18000, count: 1, esHonorarios: false },
        { nombre: 'Mantenimiento 1', sector: 'Administración', sueldo: 12000, count: 1, esHonorarios: false },
        { nombre: 'Mantenimiento 2', sector: 'Administración', sueldo: 12000, count: 1, esHonorarios: false },
        // ── Preescolar / Maternal ──
        { nombre: 'Formador Preescolar', sector: 'MATERNAL', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'MATERNAL', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'KINDER 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'KINDER 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'KINDER 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'KINDER 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'KINDER 3', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Preescolar', sector: 'KINDER 3', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Asistente educativo', sector: 'ASIST. MATERNAL', sueldo: 11000, count: 1, esHonorarios: false },
        { nombre: 'Asistente educativo', sector: 'ASIST. MATERNAL', sueldo: 11000, count: 1, esHonorarios: false },
        { nombre: 'Asistente educativo', sector: 'ASIST. KINDER', sueldo: 11000, count: 1, esHonorarios: false },
        { nombre: 'Asistente educativo', sector: 'ASIST. KINDER', sueldo: 11000, count: 1, esHonorarios: false },
        { nombre: 'Asistente educativo', sector: 'ASIST. KINDER', sueldo: 11000, count: 1, esHonorarios: false },
        // ── Primaria ──
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 3', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 3', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 4', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 4', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 5', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 5', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 6', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Primaria', sector: 'PRIMARIA 6', sueldo: 15000, count: 1, esHonorarios: false },
        // ── Secundaria ──
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA 3', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA 3', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA GRAL', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador Secundaria', sector: 'SECUNDARIA GRAL', sueldo: 15000, count: 1, esHonorarios: false },
        // ── Preparatoria ──
        { nombre: 'Formador preparatoria', sector: 'MENTOR PREPA 1', sueldo: 26000, count: 1, esHonorarios: false },
        { nombre: 'Formador preparatoria', sector: 'PREPA 1', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador preparatoria', sector: 'MENTOR PREPA 2', sueldo: 26000, count: 1, esHonorarios: false },
        { nombre: 'Formador preparatoria', sector: 'PREPA 2', sueldo: 15000, count: 1, esHonorarios: false },
        { nombre: 'Formador preparatoria', sector: 'MENTOR PREPA 3', sueldo: 26000, count: 1, esHonorarios: false },
        { nombre: 'Formador preparatoria', sector: 'PREPA 3', sueldo: 15000, count: 1, esHonorarios: false },
        // ── Liderazgo ──
        { nombre: 'Life Project Lider', sector: 'Administración', sueldo: 25000, count: 1, esHonorarios: false }
      ],
      // Legacy (se usa si puestos.length === 0)
      nominaCampusBase: 1509500,
      honorarios: 0,
      asimilados: 0,
      fondoFiniquitos: 0,
      capacidadNominaRef: 400,      // legacy — ya no se usa; la nómina usa capacidadGastoRef de gastosOperacion
      nominaTransicion: [0, 0, 0, 0, 0, 0, 0],
      imssRate: 0.1890,
      infonavitRate: 0.0500,
      isrNominaRate: 0.1056,
      impEstatalRate: 0.0300,
      aguinaldoRate: 0.0417,
      primaVacacionalRate: 0.0041,
      primaAntiguedadRate: 0.0303
    },

    // ── Gastos de Operación ──
    gastosOperacion: {
      capacidadGastoRef: 400,
      capacidadGastoSuperRef: 650,
      controlados: [
        { label: 'Capacitación', monto: 30000 },
        { label: 'Cortesías y Eventos Captación', monto: 38866 },
        { label: 'Eventos Especiales', monto: 650833 },
        { label: 'Impresos Internos', monto: 120000 },
        { label: 'Operación', monto: 3107394 },
        { label: 'Otros Gastos Generales', monto: 204132 },
        { label: 'Uniformes', monto: 254560 },
        { label: 'Preparatoria', monto: 737416 }
      ],
      fijos: [
        { label: 'Capacitación Rectoría', monto: 30000 },
        { label: 'FEDEP Apoyo Legal Escuelas', monto: 65000 },
        { label: 'NOM 035', monto: 30000 },
        { label: 'Arrendamiento Cancha de Basket', monto: 120000 },
        { label: 'Publicidad', monto: 525531 },
        { label: 'Seguridad', monto: 811781 },
        { label: 'Servicios Contables', monto: 362461 }
      ],
      financieros: [
        { label: 'Comisiones Bancarias', monto: 191661 },
        { label: 'Arrendamiento Bus', monto: 922302 },
        { label: 'Impuestos', monto: 1324774 }
      ]
    },

    // ── Nómina Dirección Ejecutiva (Honorarios corporativos compartidos entre campus) ──
    dirEjecutiva: {
      tasaHonorarios: 0.065,   // 6.5% costo fiscal sobre honorarios
      totalCampus: 5,       // número de campus que comparten este costo
      puestos: [
        { nombre: 'DIRECCION EJECUTIVA', puesto: 'DGC', salario: 165641.11 },
        { nombre: 'DIRECCIÓN DE FINANZAS Y PERFORMANCE', puesto: 'DFP', salario: 45000 },
        { nombre: 'DIRECCIÓN DE MARCA Y CRECIMIENTO', puesto: 'DMC', salario: 25000 },
        { nombre: 'GERENCIA DE PERSONAS Y CULTURA', puesto: 'DO', salario: 35000 },
        { nombre: 'DIRECCIÓN DE OPERACIONES ACADÉMICAS', puesto: 'SOO', salario: 20000 },
        { nombre: 'CALIDAD EDUCATIVA, ESTANDARIZACIÓN', puesto: 'ASISTENTE', salario: 20766.10 },
        { nombre: 'DEAN OF ENGLISH (ZIBATA)', puesto: 'INTERNACIONALIZACIÓN', salario: 100000 },
        { nombre: 'GERENCIA SISTEMAS', puesto: 'SISTEMAS', salario: 24000 },
        { nombre: 'GERENCIA ADMINISTRATIVA APOYO', puesto: 'ADMINISTRACIÓN', salario: 15000 },
        { nombre: 'DISEÑO MARCA', puesto: 'DISEÑADOR', salario: 25000 }
      ]
    }
  };

  // ============================================================
  // 3. STATE MANAGEMENT
  // ============================================================
  let state;
  let currentView = 'dashboard';
  let chartInstances = {};
  let sidebarOpen = true;

  function loadState() {
    try {
      const s = localStorage.getItem('lyl_state_v7');
      if (s) return JSON.parse(s);
    } catch (e) { }
    return deepCopy(DEFAULTS);
  }

  function saveState() {
    try { localStorage.setItem('lyl_state_v7', JSON.stringify(state)); } catch (e) { }
    const b = document.getElementById('save-badge');
    if (b) b.textContent = '● Guardado ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function resetState() {
    if (!confirm('¿Restablecer todos los datos al modelo base de L&L?')) return;
    state = deepCopy(DEFAULTS);
    saveState();
    navigate(currentView);
    toast('Modelo restablecido', 'success');
  }

  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

  function patchState(s) {
    function merge(t, src) {
      for (const k in src) {
        if (!(k in t))
          t[k] = deepCopy(src[k]);
        else if (typeof src[k] === 'object' && !Array.isArray(src[k]) && src[k] !== null)
          merge(typeof t[k] === 'object' ? t[k] : (t[k] = {}), src[k]);
      }
    }
    merge(s, DEFAULTS);
    return s;
  }

  // ============================================================
  // 4. ENROLLMENT CASCADE ENGINE
  // ============================================================

  /**
   * Computes enrollment for all 16 grades across all getYears().
   * Returns array[yearIdx] → { gradeKey: count }
   *
   * Cascade rules (year t ≥ 1, idx = t-1):
   *   • mat, p1, s1, b1 (ENTRY_GRADES): base_año0 × (1 + tasaCrecimientoNuevoIngreso)^t
   *   • All other grades: prevGrade[t-1] × tasaReinscripcion
   *   • Per-grade cap: if > 105% of capacidadMaxima → truncate at 105% (overpopulation)
   *   • School-wide cap: proportional reduction if total > calcTopeTotal()
   */
  /** Suma de capacidadMaxima sólo de grados activos */
  function calcTopeTotal() {
    const activos = state.gradosActivos || {};
    return GRADES.reduce((s, g) => activos[g.key] !== false ? s + (state.capacidadMaxima[g.key] || 0) : s, 0) || 1;
  }

  /** Encabezado de columna "Ciclo N · YY-YY" para una entrada de corrida */
  function thCiclo(yr) {
    const y = yr.ano;
    return `<th>Ciclo ${yr.i + 1}<br><span style="font-size:10px;opacity:.6;font-weight:300">${y}-${String(y + 1).slice(-2)}</span></th>`;
  }

  /** Suma de los conceptos de cuota para un nivel */
  function cuotaTotal(lk) {
    const c = state.cuotas[lk];
    if (!c || typeof c !== 'object') return c || 0;
    return (c.cuota || 0) + (c.lider || 0) + (c.utiles || 0) + (c.teds || 0) + (c.otro || 0);
  }

  /** Suma de los conceptos de inscripción para un nivel */
  function inscripcionTotal(lk) {
    const c = state.inscripciones[lk];
    if (!c || typeof c !== 'object') return c || 0;
    return (c.cuotaInsc || 0) + (c.admision || 0) + (c.orfandad || 0) + (c.seguro || 0) + (c.otro || 0);
  }

  /**
   * Modelo matrícula — cascada por nivel usando entradaPorNivel + desercionAnual
   *
   * GRADOS DE ENTRADA (mat, p1, s1, b1):
   *   grade[t] = entradaPorNivel[level][t-1]
   *
   * k1 (especial — recibe cascada de mat + nuevos de Kínder):
   *   k1[t] = mat[t-1] × (1 - desercionAnual['Kínder'][t-1]) + entradaPorNivel['Kínder'][t-1]
   *
   * GRADOS CASCADE (todos los demás):
   *   grade[t] = prevGrade[t-1] × (1 - desercionAnual[level][t-1])
   *
   * Si arrIdx supera el largo del array → usa el último valor disponible (horizonte extendido).
   * Grados inactivos (gradosActivos[key] === false) → 0 en todos los años.
   */
  function calcMatricula() {
    const activos = state.gradosActivos || {};
    const result = [];

    // Helper: lee valor de array con fallback al último elemento
    function arrVal(arr, idx) {
      if (!arr || arr.length === 0) return 0;
      return arr[Math.min(idx, arr.length - 1)] ?? 0;
    }

    // Año 0 — base editada por el usuario
    const year0 = {};
    GRADES.forEach(g => {
      year0[g.key] = activos[g.key] === false
        ? 0 : Math.max(0, Math.round(state.matriculaInicial[g.key] || 0));
    });
    result.push({ ...year0 });

    for (let t = 1; t < getYears(); t++) {
      const prev = result[t - 1];
      const cur = {};
      const arrIdx = t - 1; // entradaPorNivel y desercionAnual usan índice 0-based

      GRADES.forEach((g, i) => {
        if (activos[g.key] === false) { cur[g.key] = 0; return; }

        const levelKey = g.level; // 'Maternal', 'Kínder', 'Primaria', 'Secundaria', 'Bachillerato'
        const desArr  = state.desercionAnual?.[levelKey] || [];
        const des = arrVal(desArr, arrIdx);

        let val;
        if (ENTRY_GRADES.has(g.key)) {
          // Grados de entrada: reciben nuevos alumnos externos según la matriz
          const entArr = state.entradaPorNivel?.[levelKey] || [];
          val = arrVal(entArr, arrIdx);
        } else if (g.key === 'k1') {
          // k1 especial: cascada de mat + nuevos externos de Kínder
          const entKinder = arrVal(state.entradaPorNivel?.['Kínder'] || [], arrIdx);
          val = prev['mat'] * (1 - des) + entKinder;
        } else {
          // Cascade puro: avanza del grado anterior con deserción
          val = prev[GRADES[i - 1].key] * (1 - des);
        }
        val = Math.max(0, Math.round(val));
        cur[g.key] = val;
      });

      // ── Cap exacto al 100% + distribución de excedente ──
      // Si un grupo supera su capacidad máxima, lo topa en el máximo
      // y el excedente se redistribuye proporcionalmente en los demás grupos
      // activos del mismo nivel que aún tengan cupo disponible.
      LEVELS.forEach(lv => {
        const lvGrades = GRADES.filter(g => g.level === lv.key && activos[g.key] !== false);
        let overflow = 0;
        // Primera pasada: cap y acumular excedente
        lvGrades.forEach(g => {
          const cap = state.capacidadMaxima ? (state.capacidadMaxima[g.key] || Infinity) : Infinity;
          if (cap < Infinity && cur[g.key] > cap) {
            overflow += cur[g.key] - cap;
            cur[g.key] = cap;
          }
        });
        // Segunda pasada: distribuir excedente en grados con cupo libre
        if (overflow > 0) {
          const withRoom = lvGrades.filter(g => {
            const cap = state.capacidadMaxima ? (state.capacidadMaxima[g.key] || Infinity) : Infinity;
            return cap === Infinity || cur[g.key] < cap;
          });
          if (withRoom.length > 0) {
            const share = Math.round(overflow / withRoom.length);
            withRoom.forEach(g => {
              const cap = state.capacidadMaxima ? (state.capacidadMaxima[g.key] || Infinity) : Infinity;
              cur[g.key] = Math.min(cap, cur[g.key] + share);
            });
          }
          // Si no hay cupo libre en ningún grupo, el excedente se pierde (matrícula real no puede crecer)
        }
      });

      // Tope escolar global
      const total = Object.values(cur).reduce((s, v) => s + v, 0);
      const topeEsc = calcTopeTotal();
      if (topeEsc > 0 && total > topeEsc) {
        const f = topeEsc / total;
        GRADES.forEach(g => { if (activos[g.key] !== false) cur[g.key] = Math.round(cur[g.key] * f); });
      }

      result.push({ ...cur });
    }

    return result;
  }

  /** Aggregate grade-level enrollment into 5 tuition buckets */
  function aggregateToTuitionBuckets(gradeEnrollment) {
    const out = {};
    TUITION_KEYS.forEach(k => { out[k] = 0; });
    GRADES.forEach(g => { out[G2T[g.key]] = (out[G2T[g.key]] || 0) + gradeEnrollment[g.key]; });
    return out;
  }

  // ============================================================
  // 5. FINANCIAL CALCULATIONS
  // ============================================================
  // Motor de nómina por puesto — LSS / LISR México 2025
  // ============================================================

  /** Retención ISR mensual del empleado (Art. 96 LISR) y Subsidio */
  function calcISR(baseMensual) {
    if (baseMensual <= 0) return { isr: 0, subsidio: 0 };
    const rowISR = ISR_TABLA.find(r => baseMensual >= r.li && baseMensual <= r.ls) || ISR_TABLA[ISR_TABLA.length - 1];
    const isr = rowISR.cuota + (baseMensual - rowISR.li) * rowISR.tasa;
    const rowSub = SUB_TABLA.find(r => baseMensual >= r.li && baseMensual <= r.ls) || SUB_TABLA[SUB_TABLA.length - 1];
    const subsidio = rowSub.sub || 0;
    return { isr, subsidio };
  }

  /** Multiplica todos los costos calculados por el número de personas */
  function multiplyByCnt(c, n) {
    if (n <= 1) return { ...c, count: 1 };
    return {
      ...c, count: n,
      imssObrero: c.imssObrero * n, imssPatronal: c.imssPatronal * n,
      infonavit: c.infonavit * n, isn: c.isn * n,
      provisiones: c.provisiones * n, isrEmpleado: c.isrEmpleado * n,
      costoTotal: c.costoTotal * n,
      aguinaldo: c.aguinaldo * n, primaVacacional: c.primaVacacional * n,
      primaAntiguedad: c.primaAntiguedad * n, costoAsimilado: (c.costoAsimilado || 0) * n
      // sueldo se mantiene unitario para mostrar en tabla
    };
  }

  /**
   * Costo total patronal por puesto (mensual).
   * Soporta campo "count" para representar N personas en el mismo rol.
   * Si esHonorarios=true omite IMSS/ISN/Infonavit — costo = sueldo.
   */
  function calcCostoPuesto(p) {
    const count = Math.max(1, Math.round(p.count || 1));
    const sueldo = p.sueldo || 0;

    // Si la persona es honorarios, no tiene cargas sociales
    if (p.esHonorarios) {
      const { isr, subsidio } = calcISR(sueldo);
      const isrEmpleado = Math.max(0, isr - subsidio);
      const s = {
        count, sueldo, sd: 0, sdi: 0, sbcMensual: 0,
        imssObrero: 0, imssPatronal: 0, infonavit: 0, isn: 0,
        aguinaldo: 0, primaVacacional: 0, primaAntiguedad: 0, provisiones: 0,
        isrEmpleado, subsidio, netoEstimado: sueldo - isrEmpleado,
        costoAsimilado: sueldo * 0.065, costoTotal: sueldo + (sueldo * 0.065)
      };
      return multiplyByCnt(s, count);
    }

    // De acuerdo a las fórmulas exactas solicitadas:
    const sd = sueldo === 0 ? 0 : sueldo * 12 / 365;
    const sdi = sueldo === 0 ? 0 : sd * NOM_FI;
    const sbcMensual = sueldo === 0 ? 0 : sdi * NOM_DIAS_MES;

    // IMSS Obrero (P2)
    const excDiario = Math.max(sdi - 3 * NOM_UMA, 0);
    const imssObrero = sueldo === 0 ? 0 : (excDiario * 0.004 + sdi * (0.00375 + 0.0025 + 0.00625 + 0.01125)) * NOM_DIAS_MES;

    // IMSS Patronal sin INFONAVIT (Q2 - simplificado)
    const imssPatronal = sueldo === 0 ? 0 :
      (sdi * 0.01 * NOM_DIAS_MES) +
      (NOM_UMA * 0.204 * NOM_DIAS_MES) +
      (excDiario * 0.011 * NOM_DIAS_MES) +
      (sdi * (0.0105 + 0.007 + 0.0175 + 0.01 + 0.055) * NOM_DIAS_MES);

    const infonavit = sueldo === 0 ? 0 : sbcMensual * 0.05;
    const isn = sueldo * 0.03;

    // Provisiones (T, U, V)
    const aguinaldo = sueldo === 0 ? 0 : sd * NOM_AGUINALDO_DIAS / 12;
    const vacacionesMensual = sueldo === 0 ? 0 : sd * NOM_VACACIONES_DIAS / 12;
    const primaVacacional = sueldo === 0 ? 0 : sd * NOM_VACACIONES_DIAS * NOM_PRIMA_VAC / 12;
    const provisiones = aguinaldo + primaVacacional + vacacionesMensual;

    // ISR y Subsidio basado en Bruto final - IMSS Obrero
    const baseGravable = Math.max(sueldo - imssObrero, 0);
    const result = calcISR(baseGravable);
    const isrEmpleado = result.isr; // No restamos aquí el subsidio de la variable principal ISR_Mensual (N)
    const subsidio = result.subsidio; // O2

    // Según su excel: Costo fiscal mensual (W) y Costo Total (X)
    const costoFiscal = sueldo === 0 ? 0 : (imssPatronal + imssObrero + isrEmpleado - subsidio + infonavit + isn + aguinaldo + vacacionesMensual + primaVacacional);
    const netoEstimado = sueldo - imssObrero - isrEmpleado + subsidio;

    const single = {
      count, sueldo, sd, sdi, sbcMensual,
      imssObrero, imssPatronal, infonavit, isn,
      aguinaldo, primaVacacional, primaAntiguedad: vacacionesMensual, // Reutilizaremos este campo prestado para vacaciones mensuales
      provisiones, costoAsimilado: 0,
      isrEmpleado, netoEstimado, subsidio,
      costoTotal: sueldo === 0 ? 0 : (sueldo + costoFiscal)
    };
    return multiplyByCnt(single, count);
  }

  // ============================================================

  /** Calcula el costo de la nómina de Dirección Ejecutiva (honorarios) asignado a este campus */
  function calcDirEjecutiva(yearIdx) {
    const de = state.dirEjecutiva || {};
    const tasa = de.tasaHonorarios ?? 0.065;
    const campus = Math.max(1, Math.round(de.totalCampus || 1));
    const inf = Math.pow(1 + state.variables.inflacion, yearIdx);
    const puestos = de.puestos || [];

    const totalSalarios = puestos.reduce((s, p) => s + (p.salario || 0), 0);
    const totalHonorarios = totalSalarios * tasa;
    const totalFiscal = totalSalarios + totalHonorarios;  // costo total de la dirección
    const costoCampus = (totalFiscal / campus) * inf;     // porción de este campus, con inflación

    return { totalSalarios, totalHonorarios, totalFiscal, costoCampus, tasa, campus, inf, puestos };
  }

  /**
   * Factor de escala de gasto por matrícula — 3 zonas:
   *   alumnos < base            → factor = alumnos / base         (escala proporcional hacia abajo)
   *   base ≤ alumnos ≤ superBase → factor = 1.0                   (100% de gasto base)
   *   alumnos > superBase       → factor = alumnos / superBase    (escala proporcional hacia arriba)
   */
  function calcFactorGasto(alumnos, base, superBase) {
    const b  = Math.max(1, base);
    const sb = Math.max(b, superBase);
    if (alumnos < b)  return alumnos / b;
    if (alumnos <= sb) return 1.0;
    return alumnos / sb;
  }

  /**
   * Costo mensual de nómina para el yearIdx dado.
   * Factor de 3 zonas (base / superBase) — misma lógica que gastos op.
   * Si totalAlumnos no se pasa (ej. vista de Resumen sin corrida), se asume factor = 1.
   */
  function calcNomina(yearIdx, totalAlumnos) {
    const inf = Math.pow(1 + state.variables.inflacion, yearIdx);
    const puestos = state.nominas.puestos || [];
    const puestosBase = puestos.reduce((s, p) => s + calcCostoPuesto(p).costoTotal, 0);

    // Factor por matrícula — 3 zonas: < base → escala abajo | base–superBase → 100% | > superBase → escala arriba
    const capNomina      = state.gastosOperacion.capacidadGastoRef      || 400;
    const capNominaSuper = state.gastosOperacion.capacidadGastoSuperRef || 650;
    const factorNomina   = totalAlumnos == null ? 1 : calcFactorGasto(totalAlumnos, capNomina, capNominaSuper);

    // Si hay puestos definidos, su total ya incluye IMSS/ISN/etc — inflacionar directamente
    const base = (puestosBase > 0 ? puestosBase : state.nominas.nominaCampusBase) * inf * factorNomina;
    const asim = state.nominas.asimilados;
    const fondo = state.nominas.fondoFiniquitos;
    const transicion = state.nominas.nominaTransicion[yearIdx] || 0;

    // Cuando se usan puestos, IMSS/ISN ya están embebidos en "base", 
    // pero sumaremos los desgloses para posibles gráficas detalladas si fuere necesario, 
    // asumiendo que puestosBase sumó "costoTotal" de todos
    const usaPuestos = puestosBase > 0;
    const honor = usaPuestos ? 0 : (state.nominas.honorarios || 0);
    const sal = usaPuestos ? base : (base + honor);

    // Si no usamos puestos (legacy), calculamos tasas flat
    const imss = usaPuestos ? (puestos.reduce((s, p) => s + calcCostoPuesto(p).imssPatronal, 0) * inf * factorNomina) : sal * state.nominas.imssRate;
    const infonavit = usaPuestos ? (puestos.reduce((s, p) => s + calcCostoPuesto(p).infonavit, 0) * inf * factorNomina) : sal * state.nominas.infonavitRate;
    const isrNomina = usaPuestos ? 0 : sal * state.nominas.isrNominaRate; // En el nuevo modelo, el ISR lo paga el empleado (Retención), el costo empresa no incluye ISR
    const impEst = usaPuestos ? (puestos.reduce((s, p) => s + calcCostoPuesto(p).isn, 0) * inf * factorNomina) : sal * state.nominas.impEstatalRate;
    const aguinaldo = usaPuestos ? (puestos.reduce((s, p) => s + calcCostoPuesto(p).aguinaldo, 0) * inf * factorNomina) : sal * state.nominas.aguinaldoRate;
    const primaVac = usaPuestos ? (puestos.reduce((s, p) => s + calcCostoPuesto(p).primaVacacional, 0) * inf * factorNomina) : sal * state.nominas.primaVacacionalRate;
    const primaAnt = usaPuestos ? (puestos.reduce((s, p) => s + calcCostoPuesto(p).primaAntiguedad, 0) * inf * factorNomina) : sal * state.nominas.primaAntiguedadRate;

    // Nómina dirección ejecutiva (honorarios corporativos ÷ campus)
    const de = calcDirEjecutiva(yearIdx);

    const totalMensual = usaPuestos
      ? (base + asim + fondo + transicion + de.costoCampus) // "base" ya incluye todas las provisiones y cargas
      : (sal + asim + imss + infonavit + isrNomina + impEst + aguinaldo + primaVac + primaAnt + fondo + transicion + de.costoCampus);

    return {
      base, honor, asim, fondo, transicion, imss, infonavit, factorNomina,
      isrNomina, impEst, aguinaldo, primaVac, primaAnt,
      dirEjecutivaCampus: de.costoCampus,
      totalMensual, totalAnual: totalMensual * 12
    };
  }

  function calcGastos(yearIdx, totalAlumnos) {
    const go = state.gastosOperacion;
    const inf = Math.pow(1 + state.variables.inflacion, yearIdx);
    // Factor 3 zonas: < base → escala abajo | base–superBase → 100% | > superBase → escala arriba
    const cap      = go.capacidadGastoRef      || 400;
    const capSuper = go.capacidadGastoSuperRef || 650;
    const factor   = calcFactorGasto(totalAlumnos || 0, cap, capSuper);

    const sumC = (go.controlados || []).reduce((s, c) => s + (c.monto || 0), 0) * factor * inf;
    const sumF = (go.fijos || []).reduce((s, c) => s + (c.monto || 0), 0) * inf;
    const sumFn = (go.financieros || []).reduce((s, c) => s + (c.monto || 0), 0) * inf;
    const total = sumC + sumF + sumFn;

    return { total, sumControlados: sumC, sumFijos: sumF, sumFinancieros: sumFn, factor, inf };
  }

  function calcCorrida() {
    const matricula = calcMatricula();
    const results = [];
    let cashAcumulado = 0;

    for (let i = 0; i < getYears(); i++) {
      const ano = (state.variables.anoInicio || ANO_INICIO) + i;
      const infFactor = Math.pow(1 + state.variables.inflacion, i);
      const colFactor = Math.pow(1 + state.variables.aumentoColegiatura, i);

      const gradeEnrollment = matricula[i];
      const levelEnrollment = aggregateToTuitionBuckets(gradeEnrollment);
      const totalAlumnos = Object.values(gradeEnrollment).reduce((s, v) => s + v, 0);

      let sumInscripciones = 0;
      let sumColegiaturas = 0;
      let sumCuotas = 0;

      TUITION_KEYS.forEach(lk => {
        const n = levelEnrollment[lk] || 0;
        sumInscripciones += n * inscripcionTotal(lk) * colFactor;
        sumColegiaturas += n * (state.colegiaturas[lk] || 0) * colFactor * 10;
        sumCuotas += n * cuotaTotal(lk) * colFactor;
      });

      const descInscripcion = sumInscripciones * state.descuentos.inscripcionPct;
      const apoyosEcon = sumColegiaturas * state.descuentos.apoyosEconomicosPct;
      const becas = sumColegiaturas * state.descuentos.becasSepPct;
      const prontoPago = sumColegiaturas * (state.descuentos.prontoPagoPct || 0);
      // Ingresos adicionales / eventos
      const ingExtra = (state.ingresosAdicionales || []).reduce((s, ia) => {
        const starts = ia.cicloInicio || 1;
        if (i + 1 < starts) return s;
        if (!ia.esRecurrente && i + 1 > starts) return s;
        return s + (ia.montoAnual || 0) * Math.pow(1 + state.variables.inflacion, i);
      }, 0);
      const ingresoTotal = (sumInscripciones - descInscripcion) + sumColegiaturas - apoyosEcon - becas - prontoPago + sumCuotas + ingExtra;

      const nomina = calcNomina(i, totalAlumnos);
      const gastosOpDet = calcGastos(i, totalAlumnos);
      const gastosOp = gastosOpDet.total;
      const egresoTotal = nomina.totalAnual + gastosOp;

      const subtotal = ingresoTotal - egresoTotal;
      const operadora = Math.max(0, subtotal) * state.variables.porcentajeOperadora;
      const rentaInmueble = state.variables.rentaInmuebleBase * infFactor;
      const ebitda = subtotal - operadora - rentaInmueble;

      cashAcumulado += ebitda;
      const numAcc = state.variables.numAcciones || 1;
      const pctModelo = state.variables.porcentajeModelo || 0.30;
      const accVenta = numAcc - Math.round(numAcc * pctModelo);
      const valorAccion = accVenta > 0 ? (state.variables.capitalRequerido || 0) / accVenta : 0;
      const utilidadPorAccion = ebitda / numAcc;
      const porcentajePorAccion = valorAccion > 0 ? utilidadPorAccion / valorAccion : 0;

      results.push({
        ano, i, infFactor, colFactor,
        gradeEnrollment, levelEnrollment, totalAlumnos,
        sumInscripciones, descInscripcion, sumColegiaturas, sumCuotas, ingExtra,
        apoyosEcon, becas, prontoPago, ingresoTotal,
        nomina, gastosOp, egresoTotal,
        subtotal, operadora, rentaInmueble, ebitda,
        cashAcumulado, utilidadPorAccion, porcentajePorAccion
      });
    }
    return results;
  }

  // ============================================================
  // 6. FORMATTING
  // ============================================================
  const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const NUM = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const PCT = new Intl.NumberFormat('es-MX', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 });

  function M(n) { return MXN.format(n); }
  function N(n) { return NUM.format(Math.round(n)); }
  function P(n) { return PCT.format(n); }
  function m2M(n) { return (n / 1e6).toFixed(2) + ' M'; }

  function pctInput(val, key, nested) {
    return `<input type="number" class="form-input" value="${(val * 100).toFixed(2)}"
      step="0.01" data-key="${key}" ${nested ? `data-nested="${nested}"` : ''}> <span class="form-hint">%</span>`;
  }
  function numInput(val, key, nested, step = '1') {
    return `<input type="number" class="form-input" value="${val}"
      step="${step}" data-key="${key}" ${nested ? `data-nested="${nested}"` : ''}>`;
  }

  // ============================================================
  // 7. VIEW — DASHBOARD
  // ============================================================
  function renderDashboard() {
    const corrida = calcCorrida();
    const y1 = corrida[0], yN = corrida[corrida.length - 1];

    const kpis = [
      { label: 'Matrícula Año 1', val: N(y1.totalAlumnos) + ' alumnos', sub: `Capacidad ${N(calcTopeTotal())} · ${P(y1.totalAlumnos / calcTopeTotal())}`, cls: '', accent: 'accent' },
      { label: 'Ingresos Año 1', val: m2M(y1.ingresoTotal), sub: 'Netos descontando becas', cls: '', accent: 'positive' },
      { label: `Ingresos Año ${getYears()}`, val: m2M(yN.ingresoTotal), sub: `+${P(yN.ingresoTotal / y1.ingresoTotal - 1)} vs Año 1`, cls: '', accent: 'positive' },
      { label: 'Nómina Mensual Año 1', val: m2M(y1.nomina.totalMensual), sub: `Factor matrícula ${P(y1.nomina.factorNomina)}`, cls: '', accent: 'neutral' },
      { label: `EBITDA Año ${getYears()}`, val: m2M(yN.ebitda), sub: 'Utilidad operativa neta', cls: 'gold', accent: 'positive' },
      { label: 'Margen EBITDA Año 1', val: P(y1.ebitda / y1.ingresoTotal), sub: 'Utilidad / Ingresos netos', cls: 'cobalt', accent: 'positive' },
      { label: 'Flujo Acumulado 7 Años', val: m2M(yN.cashAcumulado), sub: 'Dinero en bancos al cierre', cls: '', accent: 'positive' }
    ];

    return `
    <div class="section-header">
      <div>
        <div class="section-title">Dashboard · Resumen Ejecutivo</div>
        <div class="section-sub">Lógica &amp; Liquidez · Ciclos 1–${getYears()} (${corrida[0].ano}–${corrida[getYears() - 1].ano})</div>
      </div>
      <div class="badge badge-oxford">México · Ciclo escolar Sept–Ago</div>
    </div>

    <div class="kpi-grid">
      ${kpis.map(k => `
        <div class="kpi-card ${k.cls}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value ${k.accent}">${k.val}</div>
          <div class="kpi-sub">${k.sub}</div>
        </div>`).join('')}
    </div>

    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Ingresos vs Egresos · 7 Años</div><div class="chart-wrap"><canvas id="chart-ingegr"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">EBITDA y Flujo Acumulado</div><div class="chart-wrap"><canvas id="chart-ebitda"></canvas></div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Nómina Total · 7 Años</div><div class="chart-wrap"><canvas id="chart-nomina"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Gastos de Operación · 7 Años</div><div class="chart-wrap"><canvas id="chart-gastos"></canvas></div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Matrícula por Nivel · Proyección</div><div class="chart-wrap"><canvas id="chart-matricula"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Desglose de Costos Año 1–7</div><div class="chart-wrap"><canvas id="chart-costos"></canvas></div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Composición de Ingresos Año 1</div><div class="chart-wrap"><canvas id="chart-pie"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Composición de Egresos Año 1</div><div class="chart-wrap"><canvas id="chart-gastos-pie"></canvas></div></div>
    </div>

    ${renderProyeccionTable(corrida)}`;
  }

  // ============================================================
  // 8. VIEW — VARIABLES INICIALES
  // ============================================================
  function renderVariables() {
    const v = state.variables;
    const cap = v.capitalRequerido || 0;
    const pctModelo = v.porcentajeModelo || 0.30;
    const totalAcc = v.numAcciones || 100;
    const accModelo = Math.round(totalAcc * pctModelo);
    const accVenta = totalAcc - accModelo;
    const valorAccion = accVenta > 0 ? cap / accVenta : 0;
    const cashRecaudar = cap;
    const tickets = v.numTickets || 500;
    const valorTicket = tickets > 0 ? cap / tickets : 0;
    const ano0 = v.anoInicio || ANO_INICIO;

    // Row helper para valores calculados (read-only, gold)
    const statRow = (label, value, hint = '') => `
      <div class="form-group">
        <label class="form-label" style="opacity:.75">${label}</label>
        <div style="padding:9px 4px;border-bottom:1px solid var(--beige);color:var(--gold);
          font-weight:400;font-size:15px;font-variant-numeric:tabular-nums">${value}</div>
        ${hint ? `<span class="form-hint">${hint}</span>` : ''}
      </div>`;

    return `
    <div class="section-header">
      <div><div class="section-title">Variables Iniciales</div>
      <div class="section-sub">Parámetros macroeconómicos, de capital y captación</div></div>
    </div>
    <div class="info-note">Cualquier cambio recalcula automáticamente todos los módulos y se guarda en el navegador.</div>

    <div class="card">
      <div class="card-title">Ciclo Escolar</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Año de inicio — Ciclo 1 <span>(año calendario)</span></label>
          ${numInput(ano0, 'anoInicio', 'variables', '1')}
          <span class="form-hint">Ciclo 1 = ${ano0 - 1}-${String(ano0).slice(-2)} · La corrida proyecta los ${getYears()} ciclos siguientes</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Capital del Proyecto</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Capital Requerido <span>(MXN)</span></label>
          ${numInput(cap, 'capitalRequerido', 'variables', '1000000')}
          <span class="form-hint">${M(cap)}</span>
        </div>
        <div class="form-group">
          <label class="form-label">Renta Anual del Activo <span>(MXN, Ciclo 1)</span></label>
          ${numInput(v.rentaInmuebleBase, 'rentaInmuebleBase', 'variables', '100000')}
          <span class="form-hint">${M(v.rentaInmuebleBase)} · crece con inflación</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Parámetros Económicos</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Inflación Operacional <span>(%/año)</span></label>${pctInput(v.inflacion, 'inflacion', 'variables')}<span class="form-hint">Afecta nóminas, gastos y renta del activo</span></div>
        <div class="form-group"><label class="form-label">Aumento Anual Colegiaturas <span>(%/año)</span></label>${pctInput(v.aumentoColegiatura, 'aumentoColegiatura', 'variables')}</div>
        <div class="form-group"><label class="form-label">Comisión Operadora <span>(%)</span></label>${pctInput(v.porcentajeOperadora, 'porcentajeOperadora', 'variables')}</div>
        <div class="form-group"><label class="form-label">Aportación Valor del Modelo <span>(%)</span></label>${pctInput(pctModelo, 'porcentajeModelo', 'variables')}<span class="form-hint">Porción del capital que aporta el modelo (no en efectivo)</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Estructura de Capital</div>

      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--beige)">
        <div class="form-hint" style="font-size:11px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px">Acciones</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Total de Acciones</label>
            ${numInput(totalAcc, 'numAcciones', 'variables', '1')}
            <span class="form-hint">Incluye acciones del modelo + acciones a la venta</span>
          </div>
          ${statRow('Acciones del Modelo', `${accModelo}`, `${P(pctModelo)} × ${totalAcc} acciones (aportación en especie)`)}
          ${statRow('Acciones a la Venta', `${accVenta}`, `${totalAcc} − ${accModelo} = ${accVenta} acciones disponibles para inversores`)}
          ${statRow('Valor por Acción', M(valorAccion), `${M(cap)} ÷ ${accVenta} acciones a la venta`)}
          ${statRow('Capital a Recaudar <span style="font-weight:300">(efectivo)</span>', M(cashRecaudar), `${accVenta} acciones × ${M(valorAccion)} — inversores aportan el 100% del capital`)}
        </div>
      </div>

      <div>
        <div class="form-hint" style="font-size:11px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px">Tickets de Inversión</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Número de Tickets</label>
            ${numInput(tickets, 'numTickets', 'variables', '1')}
            <span class="form-hint">Unidades mínimas de inversión</span>
          </div>
          ${statRow('Valor por Ticket', M(valorTicket), `${M(cap)} ÷ ${N(tickets)} tickets`)}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Factor de Gasto por Matrícula</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Alumnos base <span class="form-hint">(inicio del 100%)</span></label>
          <input type="number" class="form-input" value="${state.gastosOperacion?.capacidadGastoRef || 400}" step="10"
            data-key="capacidadGastoRef" data-nested="gastosOperacion">
          <span class="form-hint">Con menos alumnos, la nómina y gastos controlados escalan hacia abajo.</span>
        </div>
        <div class="form-group">
          <label class="form-label">Alumnos super-base <span class="form-hint">(inicio de gasto extra)</span></label>
          <input type="number" class="form-input" value="${state.gastosOperacion?.capacidadGastoSuperRef || 650}" step="10"
            data-key="capacidadGastoSuperRef" data-nested="gastosOperacion">
          <span class="form-hint">Entre base y super-base = 100%. Pasando de super-base, el gasto sube proporcionalmente.</span>
        </div>
      </div>
    </div>`;
  }

  // ============================================================
  // 9. VIEW — MATRIZ DE ALUMNOS INTELIGENTE
  // ============================================================
  function renderMatricula() {
    const matricula = calcMatricula();
    const corrida0 = calcCorrida();
    const allYears = corrida0.map(yr => yr.ano);

    // ── Detect any overpopulation cells ──
    let hasOverpop = false;
    GRADES.forEach(g => {
      const cap = state.capacidadMaxima[g.key] || Infinity;
      for (let t = 1; t < getYears(); t++) {
        if ((matricula[t][g.key] || 0) >= cap * 1.05) { hasOverpop = true; }
      }
    });

    const rein = state.tasaReinscripcion ?? 0.85;
    const crec = state.tasaCrecimientoNuevoIngreso ?? 0.05;
    const activos = state.gradosActivos || {};
    const topeEsc = calcTopeTotal();

    // ── Totales por año (sólo grados activos) ──
    const grandTotals = matricula.map(yr =>
      GRADES.filter(g => activos[g.key] !== false).reduce((s, g) => s + (yr[g.key] || 0), 0));

    // ── NI = suma grados ENTRADA activos · Reinscritos = suma grados CASCADE activos ──
    const niRow = matricula.map(yr =>
      GRADES.filter(g => ENTRY_GRADES.has(g.key) && activos[g.key] !== false)
        .reduce((s, g) => s + (yr[g.key] || 0), 0));
    const reinscritosRow = matricula.map(yr =>
      GRADES.filter(g => !ENTRY_GRADES.has(g.key) && activos[g.key] !== false)
        .reduce((s, g) => s + (yr[g.key] || 0), 0));

    // ── Cuerpo de la tabla ──
    let tableBody = '';
    LEVELS.forEach(lv => {
      const grades = GRADES.filter(g => g.level === lv.key);
      const anyActive = grades.some(g => activos[g.key] !== false);

      tableBody += `<tr class="tr-level-header">
        <td colspan="${getYears() + 2}">▸ ${lv.key}
          ${!anyActive ? '<span style="font-size:9px;color:var(--text-faint);margin-left:8px">(inactivo)</span>' : ''}
        </td>
      </tr>`;

      grades.forEach(g => {
        const activo = activos[g.key] !== false;
        const esEntrada = ENTRY_GRADES.has(g.key);
        const cap = state.capacidadMaxima[g.key] || Infinity;

        const yearCells = matricula.map((yr, t) => {
          const n = yr[g.key] || 0;
          if (t === 0) {
            return `<td class="col-year-0" style="${!activo ? 'opacity:.3' : ''}">
              <input type="number" class="cell-input" value="${n}" step="1"
                data-mat-grade="${g.key}" style="width:56px" ${!activo ? 'disabled' : ''}></td>`;
          }
          if (!activo) return `<td style="opacity:.3;color:var(--text-faint)">—</td>`;
          const isOverpop = n >= cap * 1.05;
          const isHigh = !isOverpop && n > (state.matriculaInicial[g.key] || 0) && esEntrada;
          const cls = isOverpop ? 'num-negative overpop-cell' : isHigh ? 'enroll-high' : '';
          const icon = isOverpop ? ' <span class="overpop-icon" title="Sobrepoblación">⚠</span>' : '';
          return `<td class="${cls}">${N(n)}${icon}</td>`;
        }).join('');
        tableBody += `<tr style="${!activo ? 'opacity:.55' : ''}">
          <td style="padding-left:6px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" data-toggle-grade="${g.key}" ${activo ? 'checked' : ''}
                style="accent-color:var(--cobalt);cursor:pointer;width:13px;height:13px;flex-shrink:0">
              <span>${g.label}</span>
              ${esEntrada && activo ? '<span style="font-size:9px;color:var(--cobalt);opacity:.8;margin-left:2px">↑</span>' : ''}
            </label>
          </td>
          <td><input type="number" class="cell-input" value="${cap === Infinity ? 0 : cap}" step="5" min="0"
            data-key="${g.key}" data-cap-grade="true"
            style="width:56px;text-align:right;font-size:11px;color:var(--text-muted)"
            ${!activo ? 'disabled' : ''}></td>
          ${yearCells}
        </tr>`;
      });

      // Subtotal nivel — sólo grados activos
      const levelTotals = matricula.map(yr =>
        grades.filter(g => activos[g.key] !== false).reduce((s, g) => s + (yr[g.key] || 0), 0));
      tableBody += `<tr class="tr-level-sub tr-gold-total">
        <td style="padding-left:6px">Total ${lv.key}</td><td></td>
        ${levelTotals.map(t => `<td>${N(t)}</td>`).join('')}
      </tr>`;
    });

    // ── Filas resumen ──
    tableBody += `
    <tr class="tr-ebitda">
      <td style="padding-left:6px">↺ Reinscritos <small style="opacity:.6;font-size:9px">(cascade)</small></td><td></td>
      ${reinscritosRow.map(v => `<td>${N(v)}</td>`).join('')}
    </tr>
    <tr class="tr-result">
      <td style="padding-left:6px">↑ Nuevo Ingreso <small style="opacity:.6;font-size:9px">(entradas)</small></td><td></td>
      ${niRow.map(v => `<td>${N(v)}</td>`).join('')}
    </tr>
    <tr class="tr-total">
      <td style="padding-left:6px">TOTAL ALUMNOS</td>
      <td style="text-align:right;font-size:11px;color:var(--gold);font-weight:400">${N(topeEsc)}</td>
      ${grandTotals.map(t => `<td>${N(t)}</td>`).join('')}
    </tr>
    <tr class="tr-sub">
      <td style="padding-left:10px">% Capacidad</td><td></td>
      ${grandTotals.map(t => `<td>${P(t / topeEsc)}</td>`).join('')}
    </tr>`;

    return `
    <div class="section-header">
      <div>
        <div class="section-title">Matriz de Alumnos</div>
        <div class="section-sub">Ciclos 1–${getYears()} (${String(corrida0[0].ano).slice(-2)}-${String(corrida0[0].ano + 1).slice(-2)} → ${String(corrida0[getYears() - 1].ano).slice(-2)}-${String(corrida0[getYears() - 1].ano + 1).slice(-2)})
          · Reinscripción <strong style="color:var(--gold)">${P(rein)}</strong>
          · Crecimiento <strong style="color:var(--cobalt)">+${P(crec)}/año</strong>
        </div>
      </div>
      <span class="badge badge-oxford">Tope: ${N(topeEsc)} alumnos</span>
    </div>

    ${hasOverpop ? `
    <div class="alert-overpop">
      <span style="font-size:14px">⚠</span>
      <div><strong>Sobrepoblación detectada.</strong> Un grado supera el 105% de su tope. Los valores han sido truncados.</div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">Variables Globales de Matrícula</div>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px">
        <div class="form-group">
          <label class="form-label">% Reinscripción <span>(alumnos que se quedan)</span></label>
          ${pctInput(rein, 'tasaReinscripcion')}
          <span class="form-hint">Ej. 85% → de 20 alumnos, 17 se reinscriben.</span>
        </div>
        <div class="form-group">
          <label class="form-label">% Crecimiento <span>(nuevo ingreso sobre reinscritos)</span></label>
          ${pctInput(crec, 'tasaCrecimientoNuevoIngreso')}
          <span class="form-hint">Ej. 20% → los 17 reinscritos × 1.20 = ~20 alumnos totales.</span>
        </div>
        <div class="form-group">
          <label class="form-label" style="margin-bottom:6px">Fórmula aplicada</label>
          <div style="font-size:12px;color:var(--text-secondary);line-height:2;padding:4px 0">
            <span style="color:var(--cobalt)">↑ Entrada</span> (mat, p1, s1, b1):<br>
            &nbsp;&nbsp;base × (1 + ${P(crec)})<sup>t</sup><br>
            <span style="color:var(--gold)">↺ Cascade</span> (demás grados):<br>
            &nbsp;&nbsp;grado_ant × ${P(rein)} × (1 + ${P(crec)})
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Proyección de Matrícula · Ciclos 1–${getYears()}
        <span class="form-hint" style="margin-left:12px;font-size:10px;text-transform:none;letter-spacing:0">
          ☑ activa / ☐ desactiva cada grado
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Grado</th>
              <th style="text-align:right;min-width:56px">Tope</th>
              ${allYears.map((y, i) => `<th class="${i === 0 ? 'col-year-0' : ''}"><span style="font-size:10px">${String(y).slice(-2)}-${String(y + 1).slice(-2)}</span></th>`).join('')}
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
      <div class="form-hint mt-8" style="display:flex;gap:16px;flex-wrap:wrap">
        <span><span style="color:var(--cobalt)">↑</span> Grado entrada: base × (1+${P(crec)})<sup>t</sup></span>
        <span><span style="color:var(--gold)">↺</span> Grado cascade: ant × ${P(rein)} × (1+${P(crec)})</span>
        <span><span style="color:var(--purple)">⚠</span> Sobrepoblación &gt;105% tope</span>
        <span style="color:var(--text-muted)">☑/☐ activa o desactiva el grado</span>
      </div>
    </div>`;
  }

  // ============================================================
  // 10. VIEW — VALORES DE REFERENCIA
  // ============================================================
  function renderReferencias() {
    const c = state.colegiaturas;
    const desc = state.descuentos;
    const ano0 = state.variables.anoInicio || ANO_INICIO;
    const ciclo1 = `${ano0 - 1}-${String(ano0).slice(-2)}`;
    const sel = state.selectorColegiatura || { tipo: 'newland', descuentoMedias: 0.15, descuentoBajas: 0.30 };
    const nwl = state.colegiaturasNewland || DEFAULTS.colegiaturasNewland;
    const tipoActual = sel.tipo || 'newland';
    const pctMedias = sel.descuentoMedias ?? 0.15;
    const pctBajas  = sel.descuentoBajas  ?? 0.30;
    const medias = Object.fromEntries(TUITION_KEYS.map(k => [k, Math.round(nwl[k] * (1 - pctMedias))]));
    const bajas  = Object.fromEntries(TUITION_KEYS.map(k => [k, Math.round(nwl[k] * (1 - pctBajas))]));

    const previewRows = TUITION_KEYS.map((lk, i) => {
      const hlN = tipoActual === 'newland' ? 'color:var(--gold)' : 'color:var(--text-muted)';
      const hlM = tipoActual === 'media'   ? 'color:var(--gold)' : 'color:var(--text-muted)';
      const hlB = tipoActual === 'baja'    ? 'color:var(--gold)' : 'color:var(--text-muted)';
      return `<tr>
        <td>${TUITION_LABELS[i]}</td>
        <td style="${hlN}"><input type="number" class="cell-input" value="${nwl[lk]}"
          data-ref-type="colegiaturasNewland" data-ref-grade="${lk}"
          style="color:inherit;width:100px"></td>
        <td style="${hlM};font-variant-numeric:tabular-nums">${N(medias[lk])}</td>
        <td style="${hlB};font-variant-numeric:tabular-nums">${N(bajas[lk])}</td>
      </tr>`;
    }).join('');

    function radioBtn(value, label) {
      const active = tipoActual === value;
      return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 18px;
        border-radius:6px;border:1px solid ${active ? 'var(--cobalt)' : 'var(--beige)'};
        background:${active ? 'rgba(0,71,171,0.06)' : 'transparent'};
        font-size:13px;color:${active ? 'var(--cobalt)' : 'var(--text)'}">
        <input type="radio" name="selector-tipo" value="${value}" ${active ? 'checked' : ''}
          onchange="App.setSelectorTipo(this.value)" style="accent-color:var(--cobalt)">
        ${label}
      </label>`;
    }

    const rows = TUITION_KEYS.map((lk, i) => `
      <tr>
        <td>${TUITION_LABELS[i]}</td>
        <td style="color:var(--gold);font-variant-numeric:tabular-nums">${N(inscripcionTotal(lk))}</td>
        <td><input type="number" class="cell-input" value="${c[lk]}" data-ref-type="colegiaturas" data-ref-grade="${lk}"></td>
        <td style="color:var(--gold);font-variant-numeric:tabular-nums">${N(cuotaTotal(lk))}</td>
      </tr>`).join('');

    return `
    <div class="section-header"><div>
      <div class="section-title">Valores de Referencia</div>
      <div class="section-sub">Aranceles y descuentos · Ciclo 1 · ${ciclo1}</div>
    </div></div>

    <div class="card">
      <div class="card-title">Selector de Tipo de Colegiatura</div>

      <div class="table-wrap" style="margin-bottom:20px">
        <table>
          <thead><tr>
            <th>Nivel</th>
            <th>Newland <span class="form-hint">(base editable)</span></th>
            <th>Medias <span class="form-hint">(−${Math.round(pctMedias*100)}%)</span></th>
            <th>Bajas <span class="form-hint">(−${Math.round(pctBajas*100)}%)</span></th>
          </tr></thead>
          <tbody>${previewRows}</tbody>
        </table>
      </div>

      <div style="display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Descuento Medias</label>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="number" class="form-input" value="${Math.round(pctMedias*100)}"
              min="0" max="100" step="1" data-selector-descuento="descuentoMedias"
              style="width:80px">
            <span class="form-hint">%</span>
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Descuento Bajas</label>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="number" class="form-input" value="${Math.round(pctBajas*100)}"
              min="0" max="100" step="1" data-selector-descuento="descuentoBajas"
              style="width:80px">
            <span class="form-hint">%</span>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px">
        <span style="font-size:12px;color:var(--text-muted);margin-right:4px">Tipo a aplicar:</span>
        ${radioBtn('newland', 'Newland')}
        ${radioBtn('media', 'Medias')}
        ${radioBtn('baja', 'Bajas')}
      </div>

      <button onclick="App.aplicarTipoColegiatura()"
        style="background:var(--cobalt);color:#fff;border:none;border-radius:6px;
          padding:11px 28px;font-size:13px;font-weight:400;cursor:pointer;
          font-family:inherit;letter-spacing:0.02em">
        Aplicar tipo de colegiatura
      </button>
    </div>

    <div class="card">
      <div class="card-title">Aranceles por Nivel · Ciclo 1 (${ciclo1}) <span class="form-hint">— valores activos en el modelo</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nivel</th>
            <th>Inscripción (MXN)</th>
            <th>Colegiatura/mes (MXN)</th>
            <th>Cuotas Anuales (MXN)</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Descuentos y Apoyos</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Descuento prom. Inscripciones</label>${pctInput(desc.inscripcionPct, 'inscripcionPct', 'descuentos')}<span class="form-hint">Descuento promedio aplicado al total de inscripciones (becas, cortesías, maestros)</span></div>
        <div class="form-group"><label class="form-label">Apoyos Económicos</label>${pctInput(desc.apoyosEconomicosPct, 'apoyosEconomicosPct', 'descuentos')}<span class="form-hint">% sobre total de colegiaturas anuales</span></div>
        <div class="form-group"><label class="form-label">Becas SEP + Maestros + Socios</label>${pctInput(desc.becasSepPct, 'becasSepPct', 'descuentos')}<span class="form-hint">% sobre total de colegiaturas anuales</span></div>
        <div class="form-group"><label class="form-label">Pronto Pago</label>${pctInput(desc.prontoPagoPct, 'prontoPagoPct', 'descuentos')}<span class="form-hint">% de descuento sobre colegiaturas mes a mes por pago anticipado</span></div>
      </div>
    </div>`;
  }

  // ============================================================
  // 11. VIEW — CUOTAS ESCOLARES
  // ============================================================
  function renderCuotas() {
    const corrida = calcCorrida();
    const CONCEPTOS = [
      { key: 'cuota', label: 'Precio Cuotas' },
      { key: 'lider', label: 'Yo Soy Líder' },
      { key: 'utiles', label: 'Útiles Escolares' },
      { key: 'teds', label: 'TEDS' },
      { key: 'otro', label: 'Otro' },
    ];

    const desglose = TUITION_KEYS.map((lk, i) => {
      const c = (state.cuotas[lk] && typeof state.cuotas[lk] === 'object') ? state.cuotas[lk] : {};
      const total = cuotaTotal(lk);
      const conceptoCells = CONCEPTOS.map(cp => `
        <td><input type="number" class="cell-input" value="${c[cp.key] || 0}" step="1"
          data-cuota-level="${lk}" data-cuota-concepto="${cp.key}"></td>`).join('');
      return `<tr>
        <td>${TUITION_LABELS[i]}</td>
        ${conceptoCells}
        <td style="color:var(--gold);font-weight:400;font-variant-numeric:tabular-nums">${N(total)}</td>
      </tr>`;
    }).join('');

    const proyRows = TUITION_KEYS.map((lk, i) => {
      const cells = corrida.map(yr => {
        const n = yr.levelEnrollment[lk] || 0;
        return `<td>${M(n * cuotaTotal(lk) * yr.colFactor)}</td>`;
      }).join('');
      return `<tr><td>${TUITION_LABELS[i]}</td>${cells}</tr>`;
    }).join('');

    const totales = `<tr class="tr-total"><td>TOTAL CUOTAS</td>${corrida.map(yr => `<td>${M(yr.sumCuotas)}</td>`).join('')}</tr>`;

    return `
    <div class="section-header"><div>
      <div class="section-title">Cuotas Escolares</div>
      <div class="section-sub">Ingreso anual por alumno · desglose por concepto · Ciclo 2025–26</div>
    </div></div>

    <div class="card">
      <div class="card-title">Desglose de Cuotas por Nivel <span class="form-hint">(MXN/alumno/año · edita cada concepto)</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nivel</th>
            ${CONCEPTOS.map(cp => `<th>${cp.label}</th>`).join('')}
            <th>Total</th>
          </tr></thead>
          <tbody>${desglose}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Proyección de Ingresos por Cuotas (MXN)</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nivel</th>${corrida.map(thCiclo).join('')}</tr></thead>
          <tbody>${proyRows}${totales}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 12. VIEW — INSCRIPCIONES Y RE-INSCRIPCIONES
  // ============================================================
  function renderInscripciones() {
    const corrida = calcCorrida();
    const desc = state.descuentos;

    const CONCEPTOS = [
      { key: 'cuotaInsc', label: 'Cuota de Inscripción' },
      { key: 'admision', label: 'Cuota de Admisión' },
      { key: 'orfandad', label: 'Beca de Orfandad' },
      { key: 'seguro', label: 'Seguro por Accidentes' },
      { key: 'otro', label: 'Otro' },
    ];

    const desglose = TUITION_KEYS.map((lk, i) => {
      const c = (state.inscripciones[lk] && typeof state.inscripciones[lk] === 'object') ? state.inscripciones[lk] : {};
      const total = inscripcionTotal(lk);
      const conceptoCells = CONCEPTOS.map(cp => `
        <td><input type="number" class="cell-input" value="${c[cp.key] || 0}" step="1"
          data-insc-level="${lk}" data-insc-concepto="${cp.key}"></td>`).join('');
      return `<tr>
        <td>${TUITION_LABELS[i]}</td>
        ${conceptoCells}
        <td style="color:var(--gold);font-weight:400;font-variant-numeric:tabular-nums">${N(total)}</td>
      </tr>`;
    }).join('');

    const proyRows = TUITION_KEYS.map((lk, i) => {
      const cells = corrida.map(yr => {
        const n = yr.levelEnrollment[lk] || 0;
        const bruto = n * inscripcionTotal(lk) * yr.colFactor;
        const neto = bruto * (1 - (desc.inscripcionPct || 0));
        return `<td>${M(neto)}</td>`;
      }).join('');
      return `<tr><td>${TUITION_LABELS[i]}</td>${cells}</tr>`;
    }).join('');

    const totRow = `<tr class="tr-total"><td>TOTAL INSCRIPCIONES (neto)</td>${corrida.map(yr => `<td>${M(yr.sumInscripciones * (1 - desc.inscripcionPct))}</td>`).join('')}</tr>`;

    return `
    <div class="section-header"><div>
      <div class="section-title">Inscripciones y Re-inscripciones</div>
      <div class="section-sub">Desglose por concepto · descuento ${(desc.inscripcionPct * 100).toFixed(1)}% aplicado al total</div>
    </div></div>

    <div class="card">
      <div class="card-title">Desglose por Nivel <span class="form-hint">(MXN/alumno · edita cada concepto)</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nivel</th>
            ${CONCEPTOS.map(cp => `<th>${cp.label}</th>`).join('')}
            <th>Total Bruto</th>
          </tr></thead>
          <tbody>${desglose}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Proyección de Ingresos por Inscripciones (MXN neto)</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nivel</th>${corrida.map(thCiclo).join('')}</tr></thead>
          <tbody>${proyRows}${totRow}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 13. VIEW — NÓMINAS
  // ============================================================
  function renderNominas() {
    const nom = state.nominas;
    const nomY1 = calcNomina(0);
    const corrida = calcCorrida();
    const annuals = corrida.map(yr => calcNomina(yr.i, yr.totalAlumnos));

    // factor matrícula del año 1 — misma referencia que gastos de operación
    const capNomina = state.gastosOperacion.capacidadGastoRef || 400;

    // ── Tabla de puestos ──────────────────────────────────────────
    const puestos = nom.puestos || [];
    const pCosts = puestos.map(calcCostoPuesto);
    const pRows = puestos.map((p, idx) => {
      const c = pCosts[idx];
      const cnt = c.count || 1;
      const honCheck = p.esHonorarios
        ? `<input type="checkbox" checked onchange="App.toggleHonorarios(${idx})">`
        : `<input type="checkbox" onchange="App.toggleHonorarios(${idx})">`;
      const tdC = (v, color = '', bold = false) =>
        `<td style="text-align:right;${color ? 'color:' + color + ';' : ''}${bold ? 'font-weight:600;' : ''}">${M(v || 0)}</td>`;
      return `<tr>
        <td><input type="text" class="cell-input" value="${p.nombre}" style="width:130px;text-align:left;font-size:11px"
          data-puesto-idx="${idx}" data-puesto-field="nombre"></td>
        <td><input type="text" class="cell-input" value="${p.sector}" style="width:80px;text-align:left;font-size:10px"
          data-puesto-idx="${idx}" data-puesto-field="sector"></td>
        <td><input type="number" class="cell-input" value="${cnt}" step="1" min="1" style="width:40px;text-align:center"
          data-puesto-idx="${idx}" data-puesto-field="count" title="Personas"></td>
        <td><input type="number" class="cell-input" value="${p.sueldo}" step="500" style="width:80px;text-align:right;font-weight:600"
          data-puesto-idx="${idx}" data-puesto-field="sueldo" title="Sueldo bruto base (editable)"></td>
        <td style="text-align:center">${honCheck}</td>
        ${p.esHonorarios
          ? `<td colspan="9" style="text-align:center;opacity:.4;font-size:10px">— exento cálculos Seguridad Social —</td>
             ${tdC(c.costoAsimilado, 'var(--gold)')}`
          : `${tdC(c.sd)}${tdC(c.sdi)}${tdC(c.imssObrero, '#c0392b')}${tdC(c.isrEmpleado, '#c0392b')}${tdC(c.netoEstimado, 'var(--emerald)', true)}${tdC(c.imssPatronal)}${tdC(c.infonavit)}${tdC(c.isn)}${tdC(c.provisiones)}<td style="text-align:center;opacity:.3">-</td>`}
        ${tdC(c.costoTotal, 'var(--gold)', true)}
        <td style="text-align:center">
          <button onclick="App.removePuesto(${idx})"
            style="background:none;border:none;color:var(--purple);cursor:pointer;font-size:13px;padding:2px 6px"
            title="Eliminar">✕</button>
        </td>
      </tr>`;
    }).join('');

    const totSueldoBruto = pCosts.reduce((s, c) => s + c.sueldo * (c.count || 1), 0);
    const totIMSSObrero = pCosts.reduce((s, c) => s + c.imssObrero, 0);
    const totISRRetenido = pCosts.reduce((s, c) => s + c.isrEmpleado, 0);
    const totNetoEstimado = pCosts.reduce((s, c) => s + c.netoEstimado, 0);
    const totIMSS = pCosts.reduce((s, c) => s + c.imssPatronal, 0); // Corrección: Antes era imss (NaN)
    const totISN = pCosts.reduce((s, c) => s + c.isn, 0);
    const totInfo = pCosts.reduce((s, c) => s + c.infonavit, 0);
    const totProv = pCosts.reduce((s, c) => s + c.provisiones, 0);
    const totCostoAsimilado = pCosts.reduce((s, c) => s + (c.costoAsimilado || 0), 0);
    const totCosto = pCosts.reduce((s, c) => s + c.costoTotal, 0);
    const totPersonas = puestos.reduce((s, p) => s + Math.max(1, Math.round(p.count || 1)), 0);

    const puestosCard = `
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        Estructura de Puestos
        <span class="form-hint" style="margin:0 auto 0 12px">${totPersonas} personas · UMA $${NOM_UMA} · SMG $${NOM_SMG}</span>
        <button onclick="App.addPuesto()"
          style="background:var(--cobalt);color:#fff;border:none;border-radius:4px;
                 padding:5px 14px;font-size:12px;cursor:pointer;letter-spacing:.5px">
          + Añadir Puesto
        </button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th style="text-align:left">Puesto</th>
          <th style="text-align:left">Sector</th>
          <th style="text-align:center" title="Número de personas">N°</th>
          <th style="text-align:right;color:var(--cobalt)">Bruto Unit.</th>
          <th title="Honorarios" style="text-align:center">Hon.</th>
          <th style="text-align:right">S.D.</th>
          <th style="text-align:right">S.D.I.</th>
          <th style="text-align:right;color:#c0392b">IMSS Obr</th>
          <th style="text-align:right;color:#c0392b">ISR Ret.</th>
          <th style="text-align:right;color:var(--emerald)">Neto Est.</th>
          <th style="text-align:right">IMSS Pat</th>
          <th style="text-align:right">Infonavit</th>
          <th style="text-align:right">ISN</th>
          <th style="text-align:right">Provs.</th>
          <th style="text-align:right;color:var(--gold)">Costo Asimil.</th>
          <th style="text-align:right;color:var(--gold)">Costo Total</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${pRows}
          <tr class="tr-total">
            <td colspan="2">TOTAL MENSUAL</td>
            <td style="text-align:center;color:var(--cobalt);font-weight:600">${totPersonas}</td>
            <td style="text-align:right;color:var(--cobalt);font-weight:600">${M(totSueldoBruto)}</td>
            <td></td>
            <td colspan="5" style="text-align:right;color:var(--emerald);font-size:10px">— Totales Patronales —</td>
            <td style="text-align:right;font-weight:600">${M(totIMSS)}</td>
            <td style="text-align:right;font-weight:600">${M(totInfo)}</td>
            <td style="text-align:right;font-weight:600">${M(totISN)}</td>
            <td style="text-align:right;font-weight:600">${M(totProv)}</td>
            <td style="text-align:right;font-weight:600">${M(totCostoAsimilado)}</td>
            <td style="text-align:right;color:var(--gold);font-weight:600">${M(totCosto)}</td>
            <td></td>
          </tr>
        </tbody>
      </table></div>
      <div style="margin-top:10px;padding:8px 4px;border-top:1px solid var(--beige);
           font-size:11px;color:var(--oxford);opacity:.6;letter-spacing:.3px">
        N° = personas en el puesto · Los totales consideran la carga total de colaboradores
        · SDI = Sal.Diario × ${NOM_FI.toFixed(4)} · IMSS = Cuota Fija + Excedente + Gastos Medicos + Retiro + Cesantia + Guarderias
        · Provs = Aguinaldo + Prima Vacacional + Prima Antigüedad · ISN 3% · Infonavit 5%
      </div>
    </div>`;

    // ── Resumen consolidado 7 años ────────────────────────────────
    // Datos de la tabla de puestos (campus)
    const totSueldoBrutoMes = totCosto - totIMSS - totISN - totInfo - totProv; // = totSueldoBruto
    const de0 = calcDirEjecutiva(0);

    // Fila de honor. Dir.Ejec. ajustada por año (inflación ya en costoCampus×inf)
    const deRowCols = annuals.map(a => `<td style="color:var(--gold)">${M(a.dirEjecutivaCampus || 0)}</td>`).join('');

    // Filas del resumen (valores por año)
    function sumRow(label, fn, style = '') {
      const cells = annuals.map(a => `<td style="${style}">${M(fn(a))}</td>`).join('');
      return `<tr><td>${label}</td>${cells}</tr>`;
    }
    function sumRowDirect(label, fn, style = '') {
      // fn recibe el índice i y los pCosts inflacionados
      const cells = Array.from({ length: getYears() }, (_, i) => {
        const inf = Math.pow(1 + state.variables.inflacion, i);
        return `<td style="${style}">${M(fn(i, inf))}</td>`;
      }).join('');
      return `<tr><td>${label}</td>${cells}</tr>`;
    }

    const summaryCard = `
    <div class="card" style="border-top:3px solid var(--cobalt)">
      <div class="card-title" style="font-size:15px;letter-spacing:.5px">
        RESUMEN NÓMINA TOTAL · PROYECCIÓN 7 AÑOS
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th style="text-align:left;min-width:220px">Concepto</th>
          ${corrida.map(thCiclo).join('')}
        </tr></thead>
        <tbody>
          <tr><td style="opacity:.5;font-size:11px">Factor matrícula (${capNomina} al.=100%)</td>
            ${annuals.map(a => `<td style="opacity:.5;font-size:11px;text-align:right">${(a.factorNomina * 100).toFixed(0)}%</td>`).join('')}
          </tr>
          ${sumRowDirect('Sueldos Brutos (campus)', (i, inf) => totSueldoBruto * inf * annuals[i].factorNomina)}
          ${sumRowDirect('IMSS Obrero (Retenido)', (i, inf) => totIMSSObrero * inf * annuals[i].factorNomina, 'color:#c0392b')}
          ${sumRowDirect('ISR Retenido a Trabajadores', (i, inf) => totISRRetenido * inf * annuals[i].factorNomina, 'color:#c0392b')}
          ${sumRowDirect('Nómina Neta a Pagar', (i, inf) => totNetoEstimado * inf * annuals[i].factorNomina, 'color:var(--emerald);font-weight:500')}
          ${sumRowDirect('IMSS Patronal', (i, inf) => totIMSS * inf * annuals[i].factorNomina)}
          ${sumRowDirect('Infonavit (5% SDI)', (i, inf) => totInfo * inf * annuals[i].factorNomina)}
          ${sumRowDirect('ISN (3%)', (i, inf) => totISN * inf * annuals[i].factorNomina)}
          ${sumRowDirect('CRM / Provisiones (ley)', (i, inf) => totProv * inf * annuals[i].factorNomina)}
          ${sumRowDirect('Costo Sindicato / Asimilado (6.5%)', (i, inf) => totCostoAsimilado * inf * annuals[i].factorNomina, 'color:var(--gold)')}
          ${annuals[0].asim ? sumRow('Asimilados', a => a.asim) : ''}
          ${annuals[0].fondo ? sumRow('Fondo Finiquitos', a => a.fondo) : ''}
          ${annuals[0].transicion ? sumRow('Nómina Transición (legado)', a => a.transicion) : ''}
          <tr style="opacity:.35"><td colspan="${getYears() + 1}"></td></tr>
          <tr><td style="color:var(--gold)">Honorarios Dir. Ejecutiva (campus)</td>${deRowCols}</tr>
          <tr class="tr-total">
            <td>TOTAL NÓMINA MENSUAL</td>
            ${annuals.map(a => `<td style="color:var(--cobalt);font-weight:500">${M(a.totalMensual)}</td>`).join('')}
          </tr>
          <tr class="tr-ebitda">
            <td>TOTAL NÓMINA ANUAL (×12)</td>
            ${annuals.map(a => `<td style="color:var(--gold);font-weight:500">${M(a.totalAnual)}</td>`).join('')}
          </tr>
        </tbody>
      </table></div>
      <div style="margin-top:8px;font-size:11px;opacity:.55;padding:4px">
        Capacidad de referencia: <strong>${N(capNomina)}</strong> alumnos = 100% nómina
        <span style="opacity:.7">(compartida con Gastos de Operación · editable en esa sección)</span>
      </div>
    </div>`;

    return `
    <div class="section-header"><div>
      <div class="section-title">Nóminas</div>
      <div class="section-sub">Sueldos y obligaciones patronales · Normativa México 2025</div>
    </div></div>

    ${summaryCard}

    ${puestosCard}

    ${renderDirEjecutivaCard(corrida)}`;
  }

  // ── Card: Dirección Ejecutiva (Honorarios) ───────────────────────────────────────
  function renderDirEjecutivaCard(corrida) {
    const de = state.dirEjecutiva || {};
    const tasa = de.tasaHonorarios ?? 0.065;
    const campus = Math.max(1, Math.round(de.totalCampus || 1));
    const puestos = de.puestos || [];

    const totalSalarios = puestos.reduce((s, p) => s + (p.salario || 0), 0);
    const totalHonorarios = totalSalarios * tasa;
    const totalFiscal = totalSalarios + totalHonorarios;
    const costoCampus = totalFiscal / campus;

    const deRows = puestos.map((p, idx) => {
      const hon = (p.salario || 0) * tasa;
      return `<tr>
        <td><input type="text" class="cell-input" value="${p.nombre}"
          style="min-width:250px;width:100%;text-align:left"
          data-direj-idx="${idx}" data-direj-field="nombre"></td>
        <td><input type="text" class="cell-input" value="${p.puesto || ''}" style="width:130px"
          data-direj-idx="${idx}" data-direj-field="puesto"></td>
        <td><input type="number" class="cell-input" value="${p.salario}" step="100" style="width:110px"
          data-direj-idx="${idx}" data-direj-field="salario"></td>
        <td style="text-align:right;color:var(--gold)">${M(hon)}</td>
        <td style="text-align:right;color:var(--cobalt);font-weight:500">${M((p.salario || 0) + hon)}</td>
      </tr>`;
    }).join('');

    // Proyección de costo campus a 7 años
    const proyRow = corrida.map(yr => {
      const inf = yr.infFactor;
      return `<td style="color:var(--cobalt)">${M(costoCampus * inf)}</td>`;
    }).join('');

    return `
    <div class="card" style="border-left:3px solid var(--gold)">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--gold)">DIRECCIÓN EJECUTIVA — NÓMINA POR HONORARIOS</span>
        <span class="badge badge-gold">Sub-nómina corporativa</span>
      </div>

      <div class="info-note" style="margin-bottom:16px">
        Nómina compartida entre campus. El <strong>Costo Fiscal = Salario Neto × (1 + ${(tasa * 100).toFixed(1)}%)</strong>. El total se divide entre <strong>Total de Campus</strong> para obtener la porción de este colegio.
      </div>

      <div class="form-grid" style="margin-bottom:18px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        <div class="form-group">
          <label class="form-label">Tasa de Honorarios <span>(%)</span></label>
          <input type="number" class="form-input" value="${(tasa * 100).toFixed(2)}" step="0.1"
            data-key="tasaHonorarios" data-nested="dirEjecutiva">
          <span class="form-hint">% del salario neto como costo fiscal ISR honorarios</span>
        </div>
        <div class="form-group">
          <label class="form-label">Total de Campus <span>(divisor)</span></label>
          <input type="number" class="form-input" value="${campus}" step="1" min="1"
            data-key="totalCampus" data-nested="dirEjecutiva">
          <span class="form-hint">El costo total se divide entre este número</span>
        </div>
        <div class="form-group">
          <label class="form-label" style="opacity:.6">Costo Total (todos los campus)</label>
          <div style="padding:9px 4px;border-bottom:1px solid var(--beige);color:var(--text-muted)">${M(totalFiscal)}</div>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--gold)">Costo Este Campus / Mes</label>
          <div style="padding:9px 4px;border-bottom:2px solid var(--gold);color:var(--gold);font-size:16px;font-weight:400">${M(costoCampus)}</div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="text-align:left">Trabajador</th>
            <th style="text-align:left">Puesto</th>
            <th style="text-align:right">Salario Mensual Neto</th>
            <th style="text-align:right;color:var(--gold)">Costo Honorarios (${(tasa * 100).toFixed(1)}%)</th>
            <th style="text-align:right;color:var(--cobalt)">Total Costo Fiscal</th>
          </tr></thead>
          <tbody>
            ${deRows}
            <tr class="tr-total">
              <td colspan="2">TOTALES</td>
              <td style="text-align:right">${M(totalSalarios)}</td>
              <td style="text-align:right;color:var(--gold)">${M(totalHonorarios)}</td>
              <td style="text-align:right;color:var(--cobalt);font-weight:500">${M(totalFiscal)}</td>
            </tr>
            <tr class="tr-ebitda">
              <td colspan="4">COSTO ESTE CAMPUS (÷ ${campus} campus)</td>
              <td style="text-align:right;color:var(--gold);font-weight:500;font-size:15px">${M(costoCampus)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-title" style="margin-top:20px">Proyección Costo Campus · 7 Años</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Concepto</th>${corrida.map(thCiclo).join('')}</tr></thead>
          <tbody>
            <tr class="tr-result"><td>Costo Dir. Ejec. este campus (inflacionado)</td>${proyRow}</tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 13. VIEW — GASTOS DE OPERACIÓN
  // ============================================================
  function renderGastos() {
    const go = state.gastosOperacion;
    const corrida = calcCorrida();
    const cap = go.capacidadGastoRef || 400;
    // Per-year detail
    const annuals = corrida.map(yr => calcGastos(yr.i, yr.totalAlumnos));

    function seccionRows(arr, secKey, esControlado) {
      const catRows = arr.map((c, idx) => {
        const cells = annuals.map(a => {
          const inf = a.inf;
          const factor = esControlado ? a.factor : 1;
          return `<td>${M((c.monto || 0) * factor * inf)}</td>`;
        }).join('');
        return `<tr>
          <td><input type="text" class="cell-input" value="${c.label}"
            data-gasto-section="${secKey}" data-gasto-idx="${idx}" data-gasto-field="label"
            style="width:200px;text-align:left"></td>
          <td><input type="number" class="cell-input" value="${c.monto || 0}" step="1000"
            data-gasto-section="${secKey}" data-gasto-idx="${idx}" data-gasto-field="monto"
            style="width:110px"></td>
          ${cells}
        </tr>`;
      }).join('');

      const totals = annuals.map((a) => {
        const val = esControlado ? a.sumControlados
          : secKey === 'fijos' ? a.sumFijos : a.sumFinancieros;
        return `<td>${M(val)}</td>`;
      }).join('');

      return catRows +
        `<tr class="tr-total"><td>SUBTOTAL</td><td></td>${totals}</tr>`;
    }

    const factorRow = `<tr class="tr-sub">
      <td colspan="2" style="color:var(--gold);font-size:11px;letter-spacing:.5px">% GASTO ESTIMADO (matrícula/${cap} alumnos)</td>
      ${annuals.map(a => `<td style="color:var(--gold);font-weight:400">${(a.factor * 100).toFixed(1)}%</td>`).join('')}
    </tr>`;

    const resumenRows = [
      { label: 'Egresos Controlados', key: 'sumControlados', cls: '' },
      { label: 'Egresos Fijos', key: 'sumFijos', cls: '' },
      { label: 'Gastos Financieros', key: 'sumFinancieros', cls: '' },
    ].map(r => `<tr>
      <td>${r.label}</td>
      ${annuals.map(a => `<td>${M(a[r.key])}</td>`).join('')}
    </tr>`).join('');

    return `
    <div class="section-header"><div>
      <div class="section-title">Gastos de Operación</div>
      <div class="section-sub">Controlados · Fijos · Financieros · factor configurado en Variables Iniciales (base ${cap} / super-base ${go.capacidadGastoSuperRef||650} alumnos)</div>
    </div></div>

    <div class="card">
      <div class="card-title">Resumen de Egresos</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Categoría</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>
          ${resumenRows}
          <tr class="tr-result"><td>TOTAL GASTOS OPERACIÓN</td>${annuals.map(a => `<td>${M(a.total)}</td>`).join('')}</tr>
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-title">Egresos Controlados <span class="form-hint">(escalan con matrícula)</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Concepto</th><th>Monto base (MXN/año)</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>${seccionRows(go.controlados || [], 'controlados', true)}${factorRow}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-title">Egresos Fijos <span class="form-hint">(no escalan con matrícula)</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Concepto</th><th>Monto base (MXN/año)</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>${seccionRows(go.fijos || [], 'fijos', false)}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-title">Gastos Financieros</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Concepto</th><th>Monto base (MXN/año)</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>${seccionRows(go.financieros || [], 'financieros', false)}</tbody>
      </table></div>
    </div>`;
  }

  // ============================================================
  // 14b. VIEW — INGRESOS POR COLEGIATURAS
  // ============================================================
  function renderColegiaturas() {
    const corrida = calcCorrida();
    const desc = state.descuentos;

    // Bruto por nivel
    const brutoPorNivel = TUITION_KEYS.map((lk, i) => {
      const cells = corrida.map(yr => {
        const n = yr.levelEnrollment[lk] || 0;
        return `<td>${M(n * (state.colegiaturas[lk] || 0) * yr.colFactor * 10)}</td>`;
      }).join('');
      return `<tr><td>${TUITION_LABELS[i]}</td>${cells}</tr>`;
    }).join('');

    const totalBruto = corrida.map(yr => yr.sumColegiaturas);
    const apoyos     = corrida.map(yr => yr.apoyosEcon);
    const becas      = corrida.map(yr => yr.becas);
    const pronto     = corrida.map(yr => yr.sumColegiaturas * (desc.prontoPagoPct || 0));
    const neto       = corrida.map((_, i) => totalBruto[i] - apoyos[i] - becas[i] - pronto[i]);

    const sumRow = (label, vals, color = '', neg = false) =>
      `<tr class="tr-total"><td>${label}</td>${vals.map(v =>
        `<td style="${color ? `color:${color}` : ''}">${neg ? '−' : ''}${M(Math.abs(v))}</td>`).join('')}</tr>`;

    return `
    <div class="section-header"><div>
      <div class="section-title">Ingresos por Colegiaturas</div>
      <div class="section-sub">Bruto por nivel · descuentos · neto final · 10 mensualidades/año</div>
    </div></div>

    <div class="card">
      <div class="card-title">Colegiaturas brutas por nivel (MXN)</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nivel</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>
          ${brutoPorNivel}
          ${sumRow('TOTAL BRUTO', totalBruto)}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-title">Descuentos aplicados</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Concepto</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>
          <tr><td>Apoyos Económicos <span class="form-hint">(${P(desc.apoyosEconomicosPct)})</span></td>${apoyos.map(v => `<td style="color:var(--purple)">−${M(v)}</td>`).join('')}</tr>
          <tr><td>Becas SEP + Maestros <span class="form-hint">(${P(desc.becasSepPct)})</span></td>${becas.map(v => `<td style="color:var(--purple)">−${M(v)}</td>`).join('')}</tr>
          <tr><td>Pronto Pago <span class="form-hint">(${P(desc.prontoPagoPct || 0)})</span></td>${pronto.map(v => `<td style="color:var(--purple)">−${M(v)}</td>`).join('')}</tr>
          <tr class="tr-total"><td>TOTAL DESCUENTOS</td>${corrida.map((_, i) =>
            `<td style="color:var(--purple)">−${M(apoyos[i] + becas[i] + pronto[i])}</td>`).join('')}</tr>
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-title">Colegiatura neta (MXN)</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Concepto</th>${corrida.map(thCiclo).join('')}</tr></thead>
        <tbody>
          <tr><td>Colegiaturas brutas</td>${totalBruto.map(v => `<td>${M(v)}</td>`).join('')}</tr>
          <tr><td style="color:var(--purple)">Menos descuentos</td>${corrida.map((_, i) =>
            `<td style="color:var(--purple)">−${M(apoyos[i] + becas[i] + pronto[i])}</td>`).join('')}</tr>
          <tr class="tr-total"><td>NETO COLEGIATURAS</td>${neto.map(v =>
            `<td style="color:var(--gold)">${M(v)}</td>`).join('')}</tr>
        </tbody>
      </table></div>
    </div>`;
  }

  // ============================================================
  // 14. VIEW — CORRIDA ANUAL
  // ============================================================
  function renderCorrida() {
    const corrida = calcCorrida();
    let html = `
    <div class="section-header"><div>
      <div class="section-title">Corrida Anual</div>
      <div class="section-sub">Estado de resultados detallado por nivel y año</div>
    </div></div>`;

    corrida.forEach(yr => {
      const breakdown = TUITION_KEYS.map((lk, i) => {
        const n = yr.levelEnrollment[lk] || 0;
        const ins = inscripcionTotal(lk) * yr.colFactor * (1 - state.descuentos.inscripcionPct);
        const col = (state.colegiaturas[lk] || 0) * yr.colFactor * 10;
        const cuota = cuotaTotal(lk) * yr.colFactor;
        return `<tr>
          <td>${TUITION_LABELS[i]}</td>
          <td>${N(n)}</td>
          <td>${M(inscripcionTotal(lk) * yr.colFactor)}</td>
          <td>${M(n * ins)}</td>
          <td>${M((state.colegiaturas[lk] || 0) * yr.colFactor)}</td>
          <td>${M(n * col)}</td>
          <td>${M(n * cuota)}</td>
          <td class="num-gold">${M(n * (ins + col + cuota))}</td>
        </tr>`;
      }).join('');

      html += `
      <div class="card" style="margin-bottom:22px">
        <div class="corrida-year-header">
          <span class="corrida-year-num">${yr.ano}</span>
          <span class="corrida-year-label">· ${N(yr.totalAlumnos)} alumnos · ${P(yr.totalAlumnos / calcTopeTotal())} capacidad</span>
          <span class="badge ${yr.ebitda >= 0 ? 'badge-green' : 'badge-red'}" style="margin-left:auto">EBITDA ${M(yr.ebitda)}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nivel</th><th>Alumnos</th>
              <th>Inscripción</th><th>Total Inscripciones</th>
              <th>Colegiatura/mes</th><th>Total Colegiaturas</th>
              <th>Cuotas</th><th>Total</th>
            </tr></thead>
            <tbody>
              ${breakdown}
              <tr class="tr-total"><td>TOTAL</td><td>${N(yr.totalAlumnos)}</td><td>—</td><td>${M(yr.sumInscripciones)}</td><td>—</td><td>${M(yr.sumColegiaturas)}</td><td>${M(yr.sumCuotas)}</td><td>${M(yr.ingresoTotal + yr.apoyosEcon + yr.becas + yr.descInscripcion)}</td></tr>
              <tr><td colspan="2">Descuentos Inscripciones</td><td colspan="6" class="num-negative">${M(-yr.descInscripcion)}</td></tr>
              <tr><td colspan="2">Apoyos Económicos</td><td colspan="6" class="num-negative">${M(-yr.apoyosEcon)}</td></tr>
              <tr><td colspan="2">Becas SEP/Maestros</td><td colspan="6" class="num-negative">${M(-yr.becas)}</td></tr>
              <tr class="tr-result"><td colspan="2">INGRESO TOTAL NETO</td><td colspan="6">${M(yr.ingresoTotal)}</td></tr>
              <tr><td colspan="2">Nómina Total</td><td colspan="6" class="num-negative">${M(yr.nomina.totalAnual)}</td></tr>
              <tr><td colspan="2">Gastos de Operación</td><td colspan="6" class="num-negative">${M(yr.gastosOp)}</td></tr>
              <tr class="tr-result"><td colspan="2">EGRESO TOTAL</td><td colspan="6">${M(yr.egresoTotal)}</td></tr>
              <tr class="tr-ebitda"><td colspan="2">SUBTOTAL OPERATIVO</td><td colspan="6">${M(yr.subtotal)}</td></tr>
              <tr><td colspan="2">Comisión Operadora (−${P(state.variables.porcentajeOperadora)})</td><td colspan="6" class="num-negative">${M(-yr.operadora)}</td></tr>
              <tr><td colspan="2">Renta del Activo Inmobiliario</td><td colspan="6" class="num-negative">${M(-yr.rentaInmueble)}</td></tr>
              <tr class="tr-ebitda"><td colspan="2">EBITDA</td><td colspan="6">${M(yr.ebitda)}</td></tr>
              <tr class="tr-sub"><td colspan="2">Flujo Acumulado</td><td colspan="6" class="num-gold">${M(yr.cashAcumulado)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
    });

    return html;
  }

  // ============================================================
  // 15. VIEW — PROYECCIÓN 7 AÑOS
  // ============================================================
  function renderProyeccion() {
    const yr = getYears();
    const corrida = calcCorrida();
    return `
    <div class="section-header">
      <div>
        <div class="section-title">Proyección Financiera</div>
        <div class="section-sub">Estado de Resultados Consolidado · ${yr} ciclo${yr > 1 ? 's' : ''} (${corrida[0].ano}–${corrida[yr - 1].ano})</div>
      </div>
      <button class="toggle-btn" onclick="App.exportCSV()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3 11v1.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Exportar CSV
      </button>
    </div>

    <!-- ── Selector de horizonte ── -->
    <div class="card" style="padding:18px 26px;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);white-space:nowrap">Horizonte de proyección</div>
        <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:220px">
          <input type="range" id="horizonte-slider" min="1" max="10" value="${yr}"
            style="flex:1;accent-color:var(--emerald);cursor:pointer;height:4px"
            oninput="App.setHorizonte(this.value)">
          <div style="min-width:80px;font-size:22px;font-weight:300;color:var(--navy)"
            id="horizonte-label">${yr} año${yr > 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
      `<button onclick="App.setHorizonte(${n})"
              style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:400;
              border:1px solid ${n === yr ? 'var(--emerald)' : 'var(--border)'};
              background:${n === yr ? 'var(--emerald)' : 'transparent'};
              color:${n === yr ? '#fff' : 'var(--text-muted)'};
              cursor:pointer;transition:all .15s">${n}</button>`).join('')}
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Ingresos vs Egresos · ${yr} Años</div><div class="chart-wrap"><canvas id="chart-ingegr"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">EBITDA y Flujo Acumulado</div><div class="chart-wrap"><canvas id="chart-ebitda"></canvas></div></div>
    </div>
    ${renderProyeccionTable(corrida)}`;
  }

  function renderProyeccionTable(corrida) {
    const years = corrida.map(y => y.ano);
    const rows = [
      { l: 'Matrícula Total (alumnos)', fn: y => N(y.totalAlumnos), cls: '' },
      { sep: true },
      { head: 'INGRESOS' },
      { l: 'Inscripciones Netas', fn: y => M(y.sumInscripciones - y.descInscripcion) },
      { l: 'Total Colegiaturas', fn: y => M(y.sumColegiaturas) },
      { l: 'Cuotas Escolares', fn: y => M(y.sumCuotas) },
      { l: 'Apoyos Económicos', fn: y => M(-y.apoyosEcon), cls: 'num-negative' },
      { l: 'Becas SEP / Maestros', fn: y => M(-y.becas), cls: 'num-negative' },
      { l: 'TOTAL INGRESOS', fn: y => M(y.ingresoTotal), result: true },
      { sep: true },
      { head: 'EGRESOS' },
      { l: 'Nómina Total', fn: y => M(y.nomina.totalAnual), cls: 'num-negative' },
      { l: 'Gastos de Operación', fn: y => M(y.gastosOp), cls: 'num-negative' },
      { l: 'TOTAL EGRESOS', fn: y => M(y.egresoTotal), result: true },
      { sep: true },
      { l: 'RESULTADO OPERATIVO', fn: y => M(y.subtotal), ebitda: true },
      { l: 'Comisión Operadora', fn: y => M(-y.operadora), cls: 'num-negative' },
      { l: 'Renta del Activo Inmobiliario', fn: y => M(-y.rentaInmueble), cls: 'num-negative' },
      { l: 'EBITDA', fn: y => M(y.ebitda), ebitda: true },
      { sep: true },
      { l: 'Flujo Acumulado (Bancos)', fn: y => M(y.cashAcumulado), cls: 'num-gold' },
      { sep: true },
      { l: 'Utilidad por Acción', fn: y => M(y.utilidadPorAccion), cls: 'num-blue' },
      { l: 'Rendimiento por Acción', fn: y => P(y.porcentajePorAccion), cls: 'num-gold' }
    ];

    const makeRow = r => {
      if (r.head) return `<tr class="tr-sub"><td colspan="${years.length + 1}" style="font-weight:500;letter-spacing:1.2px;font-size:10.5px;text-transform:uppercase;color:var(--text-muted)">${r.head}</td></tr>`;
      if (r.sep) return `<tr style="height:4px;background:var(--bg)"><td colspan="${years.length + 1}"></td></tr>`;
      const tc = r.ebitda ? 'tr-ebitda' : r.result ? 'tr-result' : '';
      return `<tr class="${tc}"><td>${r.l}</td>${corrida.map(y => `<td class="${r.cls || ''}">${r.fn(y)}</td>`).join('')}</tr>`;
    };

    return `
    <div class="card" style="overflow:hidden">
      <div class="card-title">Estado de Resultados · ${corrida.length} Ciclos (${corrida[0].ano}–${corrida[corrida.length - 1].ano})</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Concepto</th>${corrida.map(thCiclo).join('')}</tr></thead>
          <tbody>${rows.map(makeRow).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 16. CHARTS
  // ============================================================
  // Datalabels config: show TOTAL above each group of bars (sum of all datasets at same index)
  const DL_TOTAL = {
    datalabels: {
      display: true,
      align: 'end',
      anchor: 'end',
      color: 'rgba(26,43,72,.75)',
      font: { size: 10, weight: '400', family: 'Montserrat, system-ui, sans-serif' },
      formatter: (value, ctx) => {
        // Sum all dataset values at this index
        const datasets = ctx.chart.data.datasets;
        const idx = ctx.dataIndex;
        const total = datasets.reduce((s, ds) => {
          const v = ds.data[idx];
          return s + (typeof v === 'number' ? v : 0);
        }, 0);
        // Only show on the LAST visible dataset
        const lastVisible = [...datasets].reverse().find(ds => !ds.hidden);
        if (ctx.dataset !== lastVisible) return null;
        // Format: use M for millions, K for thousands
        if (Math.abs(total) >= 1e6) return (total / 1e6).toFixed(1) + ' M';
        if (Math.abs(total) >= 1e3) return (total / 1e3).toFixed(0) + 'K';
        return Math.round(total).toString();
      }
    }
  };

  function destroyCharts() {
    Object.values(chartInstances).forEach(c => { if (c) c.destroy(); });
    chartInstances = {};
  }

  const CC = {
    blue: '#4A9FFF', blueA: 'rgba(74,159,255,.75)', blueL: 'rgba(74,159,255,.14)',
    gold: '#E5BC35', goldA: 'rgba(229,188,53,.85)', goldL: 'rgba(229,188,53,.14)',
    cobalt: '#2A70CC',
    green: 'rgba(229,188,53,.90)',
    red: 'rgba(168,127,216,.85)',
    grades: ['rgba(74,159,255,.80)', 'rgba(229,188,53,.80)', 'rgba(168,127,216,.75)', 'rgba(42,112,204,.70)', 'rgba(229,188,53,.50)']
  };

  const BASE_OPTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      ...DL_TOTAL,
      legend: { labels: { color: 'rgba(26,43,72,.85)', font: { size: 12, weight: '400' }, boxWidth: 13, padding: 16 } },
      tooltip: {
        backgroundColor: 'rgba(8,21,40,.97)', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1,
        titleColor: 'rgba(220,233,245,.95)', bodyColor: 'rgba(154,184,212,.90)', padding: 9,
        callbacks: {
          label: ctx => {
            const v = ctx.raw;
            return typeof v === 'number' && Math.abs(v) > 1000
              ? ` ${ctx.dataset.label}: ${MXN.format(v)}`
              : ` ${ctx.dataset.label}: ${v}`;
          }
        }
      }
    },
    scales: {
      x: { ticks: { color: 'rgba(94,130,164,.70)', font: { size: 9.5 } }, grid: { color: 'rgba(255,255,255,.06)' } },
      y: {
        ticks: {
          color: 'rgba(94,130,164,.70)', font: { size: 9.5 },
          callback: v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(0) + ' M' : NUM.format(v)
        }, grid: { color: 'rgba(255,255,255,.06)' }
      }
    }
  };

  function initCharts(corrida) {
    destroyCharts();
    // Register datalabels plugin (shows totals above bars)
    if (window.ChartDataLabels) Chart.register(ChartDataLabels);
    requestAnimationFrame(() => {
      _chartIngEgr(corrida);
      _chartEbitda(corrida);
      _chartMatricula(corrida);
      _chartPie(corrida);
      _chartNomina(corrida);
      _chartGastos(corrida);
      _chartCostos(corrida);
      _chartMargen(corrida);
    });
  }

  function _chartIngEgr(corrida) {
    const el = document.getElementById('chart-ingegr'); if (!el) return;
    const labels = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    chartInstances.ingegr = new Chart(el, {
      type: 'bar', data: {
        labels,
        datasets: [
          { label: 'Ingresos', data: corrida.map(y => y.ingresoTotal), backgroundColor: CC.blueL, borderColor: CC.blueA, borderWidth: 2, borderRadius: 4 },
          { label: 'Egresos', data: corrida.map(y => y.egresoTotal), backgroundColor: 'rgba(107,63,160,.18)', borderColor: CC.red, borderWidth: 2, borderRadius: 4 }
        ]
      }, options: { ...BASE_OPTS }
    });
  }

  function _chartEbitda(corrida) {
    const el = document.getElementById('chart-ebitda'); if (!el) return;
    const labels = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    chartInstances.ebitda = new Chart(el, {
      type: 'bar', data: {
        labels,
        datasets: [
          { label: 'EBITDA', data: corrida.map(y => y.ebitda), type: 'bar', backgroundColor: CC.goldL, borderColor: CC.goldA, borderWidth: 2, borderRadius: 4 },
          { label: 'Flujo Acumulado', data: corrida.map(y => y.cashAcumulado), type: 'line', borderColor: CC.green, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 4, pointBackgroundColor: CC.green }
        ]
      }, options: { ...BASE_OPTS }
    });
  }

  function _chartNomina(corrida) {
    const el = document.getElementById('chart-nomina'); if (!el) return;
    const labels = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    chartInstances.nomina = new Chart(el, {
      type: 'bar', data: {
        labels,
        datasets: [
          { label: 'Nómina Campus', data: corrida.map(y => y.nomina.base), backgroundColor: CC.blueL, borderColor: CC.blueA, borderWidth: 2, borderRadius: 4, stack: 'n' },
          { label: 'Honorarios Dir.Ejec.', data: corrida.map(y => y.nomina.dirEjecutivaCampus || 0), backgroundColor: CC.goldL, borderColor: CC.goldA, borderWidth: 2, borderRadius: 4, stack: 'n' }
        ]
      }, options: {
        ...BASE_OPTS,
        plugins: { ...BASE_OPTS.plugins, ...DL_TOTAL },
        scales: {
          x: { ...BASE_OPTS.scales.x, stacked: true },
          y: { ...BASE_OPTS.scales.y, stacked: true }
        }
      }
    });
  }

  function _chartGastos(corrida) {
    const el = document.getElementById('chart-gastos'); if (!el) return;
    const labels = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    const annuals = corrida.map(yr => calcGastos(yr.i, yr.totalAlumnos));
    chartInstances.gastos = new Chart(el, {
      type: 'bar', data: {
        labels,
        datasets: [
          { label: 'Controlados', data: annuals.map(a => a.sumControlados), backgroundColor: 'rgba(0,71,171,.20)', borderColor: CC.blueA, borderWidth: 2, borderRadius: 4, stack: 'g' },
          { label: 'Fijos', data: annuals.map(a => a.sumFijos), backgroundColor: CC.goldL, borderColor: CC.goldA, borderWidth: 2, borderRadius: 4, stack: 'g' },
          { label: 'Financieros', data: annuals.map(a => a.sumFinancieros), backgroundColor: 'rgba(107,63,160,.20)', borderColor: CC.red, borderWidth: 2, borderRadius: 4, stack: 'g' }
        ]
      }, options: {
        ...BASE_OPTS,
        plugins: { ...BASE_OPTS.plugins, ...DL_TOTAL },
        scales: {
          x: { ...BASE_OPTS.scales.x, stacked: true },
          y: { ...BASE_OPTS.scales.y, stacked: true }
        }
      }
    });
  }

  function _chartCostos(corrida) {
    const el = document.getElementById('chart-costos'); if (!el) return;
    const labels = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    chartInstances.costos = new Chart(el, {
      type: 'bar', data: {
        labels,
        datasets: [
          { label: 'Nómina', data: corrida.map(y => y.nomina.totalAnual), backgroundColor: CC.blueL, borderColor: CC.blueA, borderWidth: 2, borderRadius: 4, stack: 'c' },
          { label: 'Gastos Op.', data: corrida.map(y => y.gastosOp), backgroundColor: CC.goldL, borderColor: CC.goldA, borderWidth: 2, borderRadius: 4, stack: 'c' },
          { label: 'Renta + Op.', data: corrida.map(y => y.rentaInmueble + y.operadora), backgroundColor: 'rgba(107,63,160,.22)', borderColor: CC.red, borderWidth: 2, borderRadius: 4, stack: 'c' }
        ]
      }, options: {
        ...BASE_OPTS,
        plugins: { ...BASE_OPTS.plugins, ...DL_TOTAL },
        scales: {
          x: { ...BASE_OPTS.scales.x, stacked: true },
          y: { ...BASE_OPTS.scales.y, stacked: true }
        }
      }
    });
  }

  function _chartMargen(corrida) {
    const el = document.getElementById('chart-margen'); if (!el) return;
    const labels = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    chartInstances.margen = new Chart(el, {
      type: 'line', data: {
        labels,
        datasets: [
          {
            label: 'Margen EBITDA %',
            data: corrida.map(y => y.ingresoTotal > 0 ? (y.ebitda / y.ingresoTotal) * 100 : 0),
            borderColor: CC.goldA, backgroundColor: CC.goldL, borderWidth: 2,
            pointRadius: 5, pointBackgroundColor: CC.goldA, fill: true, tension: 0.3
          }
        ]
      }, options: {
        ...BASE_OPTS,
        plugins: { ...BASE_OPTS.plugins, ...DL_TOTAL },
        scales: {
          x: { ...BASE_OPTS.scales.x },
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v.toFixed(1) + '%' } }
        }
      }
    });
  }

  function _chartMatricula(corrida) {
    const el = document.getElementById('chart-matricula'); if (!el) return;
    chartInstances.matricula = new Chart(el, {
      type: 'bar', data: {
        labels: corrida.map(y => y.ano),
        datasets: LEVELS.map((lv, i) => ({
          label: lv.key,
          data: corrida.map(yr => lv.grades.reduce((s, g) => s + (yr.gradeEnrollment[g] || 0), 0)),
          backgroundColor: CC.grades[i], borderWidth: 0, borderRadius: 2, stack: 'm'
        }))
      }, options: {
        ...BASE_OPTS, scales: {
          x: { ...BASE_OPTS.scales.x, stacked: true },
          y: { ...BASE_OPTS.scales.y, stacked: true, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => N(v) } }
        }
      }
    });
  }

  function _chartPie(corrida) {
    const el = document.getElementById('chart-pie'); if (!el) return;
    const yr = corrida[0];
    chartInstances.pie = new Chart(el, {
      type: 'doughnut', data: {
        labels: ['Inscripciones', 'Colegiaturas', 'Cuotas'],
        datasets: [{
          data: [yr.sumInscripciones - yr.descInscripcion, yr.sumColegiaturas - yr.apoyosEcon - yr.becas, yr.sumCuotas],
          backgroundColor: [CC.blueA, CC.goldA, CC.cobalt], borderColor: '#FFFFFF', borderWidth: 3
        }]
      }, options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          ...DL_TOTAL,
          legend: { position: 'right', labels: { color: 'rgba(0,33,71,.65)', font: { size: 10 }, padding: 12, boxWidth: 12 } },
          tooltip: {
            ...BASE_OPTS.plugins.tooltip, callbacks: {
              label: ctx => {
                const t = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return ` ${ctx.label}: ${M(ctx.raw)} (${(ctx.raw / t * 100).toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });

    // ── Pie de composición de EGRESOS Año 1 ──
    const elGP = document.getElementById('chart-gastos-pie'); if (!elGP) return;
    const yr1 = corrida[0];
    const gpData = [
      { label: 'Nómina Total', val: yr1.nomina.totalAnual },
      { label: 'Gastos de Operación', val: yr1.gastosOp },
      { label: 'Renta Inmueble', val: yr1.rentaInmueble },
      { label: 'Comisión Operadora', val: yr1.operadora }
    ].filter(d => d.val > 0);
    chartInstances.gastosPie = new Chart(elGP, {
      type: 'doughnut', data: {
        labels: gpData.map(d => d.label),
        datasets: [{
          data: gpData.map(d => d.val),
          backgroundColor: ['rgba(42,112,204,.82)', 'rgba(197,160,89,.82)', 'rgba(168,127,216,.80)', 'rgba(74,159,255,.75)'],
          borderColor: '#FFFFFF', borderWidth: 3
        }]
      }, options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          ...DL_TOTAL,
          legend: { position: 'right', labels: { color: 'rgba(26,43,72,.85)', font: { size: 12, weight: '400' }, padding: 14, boxWidth: 13 } },
          tooltip: {
            ...BASE_OPTS.plugins.tooltip, callbacks: {
              label: ctx => {
                const t = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return ` ${ctx.label}: ${M(ctx.raw)} (${(ctx.raw / t * 100).toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ============================================================
  // 17. VIEW — REPORTES PDF
  // ============================================================
  function renderReportes() {
    const reports = [
      { id: 'ejecutivo', icon: '📊', title: 'Resumen Ejecutivo', color: 'var(--cobalt)', desc: 'KPIs clave, EBITDA, ingresos, matrícula y flujo acumulado de los 7 ciclos.' },
      { id: 'corrida', icon: '📈', title: 'Corrida Anual · 7 Años', color: 'var(--oxford)', desc: 'Estado de resultados completo año a año: ingresos, egresos, EBITDA y flujo.' },
      { id: 'nomina', icon: '👥', title: 'Reporte de Nómina', color: 'var(--oxford)', desc: 'Catálogo de puestos con IMSS, ISN, Infonavit y CRM. Dir. Ejecutiva incluida.' },
      { id: 'gastos', icon: '📋', title: 'Gastos de Operación', color: 'var(--oxford)', desc: 'Desglose por categoría (controlados, fijos, financieros) a 7 años.' },
      { id: 'proyeccion', icon: '🎯', title: 'Proyección Financiera', color: 'var(--gold)', desc: 'Tabla ejecutiva completa con todos los conceptos financieros clave.' },
      { id: 'matricula', icon: '🏫', title: 'Matrícula y Capacidad', color: 'var(--oxford)', desc: 'Proyección de alumnos por nivel y grado, ocupación y topes de capacidad.' }
    ];
    return `
    <div class="section-header"><div>
      <div class="section-title">Reportes PDF</div>
      <div class="section-sub">Genera y descarga reportes financieros listos para imprimir</div>
    </div></div>
    <div class="info-note" style="margin-bottom:20px">
      Haz clic en <strong>Descargar PDF</strong>. Se abrirá una ventana nueva con el reporte formateado.
      En Mac: <kbd>⌘P</kbd> → <em>Guardar como PDF</em> · En Windows: <kbd>Ctrl+P</kbd> → <em>Microsoft Print to PDF</em>.
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
      ${reports.map(r => `
      <div class="card" style="display:flex;flex-direction:column;gap:12px;border-left:3px solid ${r.color}">
        <div style="font-size:30px;line-height:1">${r.icon}</div>
        <div class="card-title" style="margin:0;color:${r.color}">${r.title}</div>
        <p style="font-size:12px;color:var(--text-muted);flex:1;line-height:1.7;margin:0">${r.desc}</p>
        <button onclick="App.generarPDF('${r.id}')"
          style="background:${r.color};color:#fff;border:none;border-radius:6px;padding:10px 18px;
                 font-size:11px;letter-spacing:.8px;cursor:pointer;text-transform:uppercase;
                 font-family:inherit;font-weight:400"
          onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
          ↓ Descargar PDF
        </button>
      </div>`).join('')}
    </div>`;
  }

  function _generarPDF(tipo) {
    const corrida = calcCorrida();
    const ciclos = corrida.map(y => `${String(y.ano).slice(-2)}-${String(y.ano + 1).slice(-2)}`);
    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,sans-serif;font-size:9.5pt;color:#001f3f;padding:20px 28px;background:#fff}
      h1{font-size:16pt;font-weight:300;letter-spacing:1px;color:#002147;margin-bottom:4px}
      h2{font-size:10.5pt;font-weight:400;color:#002147;margin:16px 0 6px;letter-spacing:.4px;border-bottom:1px solid #dde;padding-bottom:3px}
      .meta{font-size:7.5pt;color:#888;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:12px}
      th{background:#002147;color:#fff;padding:4px 7px;text-align:right;font-weight:400;font-size:7.5pt}
      th:first-child{text-align:left}td{padding:3.5px 7px;text-align:right;border-bottom:1px solid #eef}
      td:first-child{text-align:left}tr:nth-child(even) td{background:#f7f9fc}
      .tr-total td{background:#002147!important;color:#fff;font-weight:500}
      .tr-gold td{background:#c8a84b!important;color:#fff;font-weight:500}
      .tr-sub td{background:#003580!important;color:#fff;font-size:7.5pt;letter-spacing:.3px}
      .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
      .kpi{background:#f7f9fc;border-left:3px solid #002147;padding:8px 12px;border-radius:3px}
      .kpi-label{font-size:7pt;color:#888;text-transform:uppercase;letter-spacing:.5px}
      .kpi-val{font-size:13pt;font-weight:300;color:#002147;margin-top:2px}
      .kpi-sub{font-size:6.5pt;color:#aaa;margin-top:2px}
      .kpi.gold{border-left-color:#c8a84b}.kpi.gold .kpi-val{color:#c8a84b}
      .kpi.cobalt{border-left-color:#0047ab}.kpi.cobalt .kpi-val{color:#0047ab}
      @media print{@page{margin:1.2cm;size:A4 landscape}body{padding:0}}
       .pdf-hdr{display:flex;align-items:center;gap:18px;margin-bottom:18px;padding-bottom:10px;border-bottom:2px solid #C5A059}
       .pdf-hdr img{width:70px;height:70px;object-fit:contain;flex-shrink:0}
       .pdf-hdr-text h1{font-size:13pt;font-weight:300;letter-spacing:.8px;color:#002147;margin-bottom:2px}
       .pdf-hdr-text .meta{font-size:7pt;color:#888;margin:0}`;

    const fm = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v || 0));
    const fn2 = v => new Intl.NumberFormat('es-MX').format(Math.round(v || 0));
    const fp = v => (v * 100).toFixed(1) + '%';
    const TH = cols => `<tr>${cols.map((c, i) => `<th${i === 0 ? ' style="text-align:left"' : ''}>${c}</th>`).join('')}</tr>`;
    const TD = (cells, cls = '') => `<tr class="${cls}">${cells.map((c, i) => `<td${i === 0 ? ' style="text-align:left"' : ''}>${c}</td>`).join('')}</tr>`;
    const logoSrc = window.location.href.replace(/\/[^\/]*$/, '/img/logo.png');
    const HDR = `<div class="pdf-hdr">
      <img src="${logoSrc}" alt="L&amp;L Logo">
      <div class="pdf-hdr-text">
        <h1>L&amp;L · Lógica Institucional &amp; Liquidez</h1>
        <p class="meta">Modelo Financiero Institucional &nbsp;·&nbsp; Generado el ${fecha} &nbsp;·&nbsp; Ciclos ${ciclos[0]} – ${ciclos[ciclos.length - 1]}</p>
      </div>
    </div>`;

    let body = '';
    if (tipo === 'ejecutivo') {
      const y1 = corrida[0], yN = corrida[corrida.length - 1], cap = calcTopeTotal();
      body = HDR + `<div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Matrícula Año 1</div><div class="kpi-val">${fn2(y1.totalAlumnos)}</div><div class="kpi-sub">${fp(y1.totalAlumnos / cap)} de capacidad (tope ${fn2(cap)})</div></div>
        <div class="kpi cobalt"><div class="kpi-label">Ingresos Año 1</div><div class="kpi-val">${fm(y1.ingresoTotal)}</div><div class="kpi-sub">Netos tras becas y descuentos</div></div>
        <div class="kpi cobalt"><div class="kpi-label">Ingresos Año ${getYears()}</div><div class="kpi-val">${fm(yN.ingresoTotal)}</div><div class="kpi-sub">+${fp(yN.ingresoTotal / y1.ingresoTotal - 1)} vs Año 1</div></div>
        <div class="kpi"><div class="kpi-label">Nómina Mensual Año 1</div><div class="kpi-val">${fm(y1.nomina.totalMensual)}</div><div class="kpi-sub">Factor matrícula ${fp(y1.nomina.factorNomina)}</div></div>
        <div class="kpi gold"><div class="kpi-label">EBITDA Año ${getYears()}</div><div class="kpi-val">${fm(yN.ebitda)}</div><div class="kpi-sub">Utilidad operativa neta</div></div>
        <div class="kpi cobalt"><div class="kpi-label">Flujo Acumulado</div><div class="kpi-val">${fm(yN.cashAcumulado)}</div><div class="kpi-sub">Saldo bancario al cierre</div></div>
      </div>
      <h2>Proyección de Resultados · ${getYears()} Ciclos</h2>
      <table><thead>${TH(['Concepto', ...ciclos])}</thead><tbody>
        ${TD(['Matrícula (alumnos)', ...corrida.map(y => fn2(y.totalAlumnos))])}
        ${TD(['Ingresos Totales', ...corrida.map(y => fm(y.ingresoTotal))], 'tr-sub')}
        ${TD(['Nómina Anual', ...corrida.map(y => fm(y.nomina.totalAnual))])}
        ${TD(['Gastos Operación', ...corrida.map(y => fm(y.gastosOp))])}
        ${TD(['EBITDA', ...corrida.map(y => fm(y.ebitda))], 'tr-gold')}
        ${TD(['Margen EBITDA %', ...corrida.map(y => fp(y.ingresoTotal > 0 ? y.ebitda / y.ingresoTotal : 0))])}
        ${TD(['Flujo Acumulado', ...corrida.map(y => fm(y.cashAcumulado))], 'tr-total')}
      </tbody></table>`;
    } else if (tipo === 'corrida') {
      body = HDR + `<h2>Corrida Anual · Estado de Resultados</h2>
      <table><thead>${TH(['Concepto', ...ciclos])}</thead><tbody>` + [
          ['Matrícula total', y => fn2(y.totalAlumnos), ''],
          ['Inscripciones (neto)', y => fm(y.sumInscripciones - y.descInscripcion), ''],
          ['Colegiaturas (neto)', y => fm(y.sumColegiaturas - y.apoyosEcon - y.becas - y.prontoPago), ''],
          ['Cuotas Escolares', y => fm(y.sumCuotas), ''],
          ['INGRESOS TOTALES', y => fm(y.ingresoTotal), 'tr-sub'],
          ['Nómina Anual', y => fm(y.nomina.totalAnual), ''],
          ['Gastos de Operación', y => fm(y.gastosOp), ''],
          ['EGRESOS TOTALES', y => fm(y.egresoTotal), 'tr-total'],
          ['Renta Inmueble', y => fm(y.rentaInmueble), ''],
          ['Cuota Operadora', y => fm(y.operadora), ''],
          ['EBITDA', y => fm(y.ebitda), 'tr-gold'],
          ['Margen EBITDA %', y => fp(y.ingresoTotal > 0 ? y.ebitda / y.ingresoTotal : 0), ''],
          ['Flujo Acumulado', y => fm(y.cashAcumulado), 'tr-total']
        ].map(([l, f, c]) => TD([l, ...corrida.map(f)], c)).join('') + `</tbody></table>`;
    } else if (tipo === 'nomina') {
      const ps = state.nominas.puestos || [], pc = ps.map(calcCostoPuesto);
      const de = state.dirEjecutiva || {}, tasa = de.tasaHonorarios ?? 0.065, ncampus = Math.max(1, de.totalCampus || 1);
      const dps = de.puestos || [], totDS = dps.reduce((s, p) => s + (p.salario || 0), 0);
      const n1 = corrida[0].nomina;
      body = HDR +
        `<h2>Nómina Campus · Catálogo de ${ps.length} Puestos</h2>
        <table><thead>${TH(['Puesto', 'Sector', 'Cant.', 'Sueldo Unit.', 'IMSS Pat.', 'ISN', 'Infonavit', 'Prov.', 'Costo Total'])}</thead><tbody>` +
        ps.map((p, i) => { const c = pc[i]; return TD([p.nombre, p.sector, fn2(c.count || 1), fm(p.sueldo), fm(c.imss), fm(c.isn), fm(c.infonavit), fm(c.provisiones), fm(c.costoTotal)]); }).join('') +
        TD(['TOTAL CAMPUS', '', '', '', ...['imss', 'isn', 'infonavit', 'provisiones', 'costoTotal'].map(k => fm(pc.reduce((s, c) => s + (k === 'sueldo' ? c.sueldo * (c.count || 1) : c[k]), 0)))], 'tr-total') +
        `</tbody></table>
        <h2>Dirección Ejecutiva · Honorarios ÷ ${ncampus} campus</h2>
        <table><thead>${TH(['Trabajador', 'Puesto', 'Salario Neto', `Hon. ${(tasa * 100).toFixed(1)}%`, 'Total Fiscal'])}</thead><tbody>` +
        dps.map(p => { const h = (p.salario || 0) * tasa; return TD([p.nombre, p.puesto, fm(p.salario), fm(h), fm((p.salario || 0) + h)]); }).join('') +
        TD(['', 'COSTO ESTE CAMPUS', fm(totDS / ncampus), fm(totDS * tasa / ncampus), fm(totDS * (1 + tasa) / ncampus)], 'tr-gold') +
        `</tbody></table>
        <h2>Resumen Nómina Mensual Año 1</h2>
        <table><thead>${TH(['Concepto', 'Mensual', 'Anual'])}</thead><tbody>
        ${TD(['Sueldos + Cargas Sociales Campus', fm(n1.base), fm(n1.base * 12)])}
        ${TD(['Honorarios Dir. Ejecutiva (campus)', fm(n1.dirEjecutivaCampus || 0), fm((n1.dirEjecutivaCampus || 0) * 12)])}
        ${TD(['TOTAL NÓMINA', fm(n1.totalMensual), fm(n1.totalAnual)], 'tr-total')}
        </tbody></table>`;
    } else if (tipo === 'gastos') {
      const go = state.gastosOperacion, an = corrida.map(yr => calcGastos(yr.i, yr.totalAlumnos));
      const sec = (lbl, arr, fn3) => `<h2>${lbl}</h2><table><thead>${TH(['Concepto', 'Base', ...ciclos])}</thead><tbody>` +
        arr.map(c => TD([c.label, fm(c.monto), ...an.map(a => fm(c.monto * fn3(a)))])).join('') + `</tbody></table>`;
      body = HDR +
        sec('Gastos Controlados (escalan con matrícula)', go.controlados || [], a => a.factor * a.inf) +
        sec('Gastos Fijos', go.fijos || [], a => a.inf) +
        sec('Gastos Financieros', go.financieros || [], a => a.inf) +
        `<h2>Totales de Gastos de Operación</h2><table><thead>${TH(['Concepto', ...ciclos])}</thead><tbody>
        ${TD(['Controlados', ...an.map(a => fm(a.sumControlados))])}
        ${TD(['Fijos', ...an.map(a => fm(a.sumFijos))])}
        ${TD(['Financieros', ...an.map(a => fm(a.sumFinancieros))])}
        ${TD(['TOTAL GASTOS', ...an.map(a => fm(a.total))], 'tr-total')}
        </tbody></table>`;
    } else if (tipo === 'proyeccion') {
      body = HDR + `<h2>Proyección Financiera Ejecutiva · ${getYears()} Ciclos</h2>
      <table><thead>${TH(['Concepto', ...ciclos])}</thead><tbody>` + [
          ['Matrícula total', y => fn2(y.totalAlumnos), ''],
          ['% Ocupación', y => fp(y.totalAlumnos / calcTopeTotal()), ''],
          ['Ingresos Inscripciones', y => fm(y.sumInscripciones - y.descInscripcion), ''],
          ['Ingresos Colegiaturas', y => fm(y.sumColegiaturas - y.apoyosEcon - y.becas), ''],
          ['Cuotas Escolares', y => fm(y.sumCuotas), ''],
          ['INGRESOS TOTALES', y => fm(y.ingresoTotal), 'tr-sub'],
          ['Nómina Mensual', y => fm(y.nomina.totalMensual), ''],
          ['Nómina Anual', y => fm(y.nomina.totalAnual), ''],
          ['Gastos Operación', y => fm(y.gastosOp), ''],
          ['EGRESOS TOTALES', y => fm(y.egresoTotal), 'tr-total'],
          ['EBITDA', y => fm(y.ebitda), 'tr-gold'],
          ['Margen EBITDA %', y => fp(y.ingresoTotal > 0 ? y.ebitda / y.ingresoTotal : 0), ''],
          ['Flujo Acumulado', y => fm(y.cashAcumulado), 'tr-total']
        ].map(([l, f, c]) => TD([l, ...corrida.map(f)], c)).join('') + `</tbody></table>`;
    } else if (tipo === 'matricula') {
      const mat = calcMatricula();
      body = HDR + `<h2>Proyección de Matrícula por Nivel</h2>
      <table><thead>${TH(['Nivel / Grado', ...ciclos])}</thead><tbody>` +
        LEVELS.flatMap(lv => [
          `<tr><td colspan="${getYears() + 1}" style="background:#002147;color:#fff;padding:3px 7px;font-size:7.5pt">${lv.key}</td></tr>`,
          ...GRADES.filter(g => g.level === lv.key).map(g => TD([g.label, ...mat.map(yr => fn2(yr[g.key] || 0))]))
        ]).join('') +
        TD(['TOTAL ALUMNOS', ...mat.map(yr => fn2(GRADES.reduce((s, g) => s + (yr[g.key] || 0), 0)))], 'tr-total') +
        `</tbody></table>`;
    }

    const win = window.open('', '_blank');
    if (!win) { alert('Habilita ventanas emergentes para generar el PDF.'); return; }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte · L&L Financiero</title><style>${CSS}</style></head><body>${body}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  // ============================================================
  // 18. NAVIGATION
  // ============================================================


  // ============================================================
  // ── NUEVAS VISTAS — BATCH 2 ──────────────────────────────────
  // ============================================================

  // ── COSTO POR ALUMNO ─────────────────────────────────────────
  function renderCostoPorAlumno() {
    const corrida = calcCorrida();
    const y1 = corrida[0];
    const rows = corrida.map(yr => {
      const cpa = yr.totalAlumnos > 0 ? yr.egresoTotal / yr.totalAlumnos : 0;
      const ipa = yr.totalAlumnos > 0 ? yr.ingresoTotal / yr.totalAlumnos : 0;
      const margen = yr.ingresoTotal > 0 ? yr.ebitda / yr.ingresoTotal : 0;
      const cpaColor = cpa < ipa ? 'var(--emerald)' : '#c0392b';
      const cpaBase = y1.totalAlumnos > 0 ? y1.egresoTotal / y1.totalAlumnos : 1;
      const delta = cpa - cpaBase;
      return `<tr>
        <td>${yr.ano}–${yr.ano + 1}</td>
        <td style="text-align:right">${N(yr.totalAlumnos)}</td>
        <td style="text-align:right">${M(yr.egresoTotal)}</td>
        <td style="text-align:right;color:${cpaColor}"><strong>${M(cpa)}</strong></td>
        <td style="text-align:right">${M(ipa)}</td>
        <td style="text-align:right;${margen < 0 ? 'color:#c0392b' : ''}">${(margen * 100).toFixed(1)}%</td>
        <td style="text-align:right;font-size:11px;color:${delta <= 0 ? 'var(--emerald)' : '#e67e22'}">
          ${delta === 0 ? '—' : (delta > 0 ? '+' : '')}${M(delta)}
        </td>
      </tr>`;
    }).join('');
    const best = corrida.reduce((b, y) => {
      const c = y.totalAlumnos > 0 ? y.egresoTotal / y.totalAlumnos : Infinity;
      return c < (b.totalAlumnos > 0 ? b.egresoTotal / b.totalAlumnos : Infinity) ? y : b;
    }, corrida[0]);
    return `<div class="section-header"><div><div class="section-title">Costo por Alumno</div>
      <div class="section-sub">Egreso total ÷ matrícula · eficiencia de escala por ciclo</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px">
      <div class="card" style="border-top:3px solid var(--cobalt);text-align:center;padding:16px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Costo/Alumno Año 1</div>
        <div style="font-size:22px;font-weight:300;color:var(--cobalt)">${M(corrida[0].totalAlumnos > 0 ? corrida[0].egresoTotal / corrida[0].totalAlumnos : 0)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--emerald);text-align:center;padding:16px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Mejor Ciclo</div>
        <div style="font-size:22px;font-weight:300;color:var(--emerald)">${best.ano}–${best.ano + 1}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--gold);text-align:center;padding:16px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Ingreso/Alumno Año 1</div>
        <div style="font-size:22px;font-weight:300;color:var(--gold)">${M(corrida[0].totalAlumnos > 0 ? corrida[0].ingresoTotal / corrida[0].totalAlumnos : 0)}</div>
      </div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Ciclo</th><th style="text-align:right">Matrícula</th><th style="text-align:right">Egreso Total</th><th style="text-align:right">Costo/Alumno</th><th style="text-align:right">Ingreso/Alumno</th><th style="text-align:right">Margen</th><th style="text-align:right">Δ vs Año 1</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="padding:10px 0 0;font-size:10px;color:var(--text-muted)">
      Si Costo/Alumno baja año a año → <span style="color:var(--emerald)">economías de escala</span>. Si sube → revisar control de costos.
    </div></div>`;
  }

  // ── INGRESOS ADICIONALES / EVENTOS ───────────────────────────
  function renderIngresosAdicionales() {
    const list = state.ingresosAdicionales || [];
    const corrida = calcCorrida();
    const rows = list.length === 0
      ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No hay ingresos adicionales definidos.</td></tr>'
      : list.map((ia, i) => `<tr>
          <td><input class="cell-input" value="${ia.nombre || ''}" style="width:160px" oninput="App.updateIngreso(${i},'nombre',this.value)"></td>
          <td><input type="number" class="cell-input" value="${ia.montoAnual || 0}" step="10000" style="width:110px;text-align:right" oninput="App.updateIngreso(${i},'montoAnual',+this.value)"></td>
          <td style="text-align:center">
            <input type="number" class="cell-input" value="${ia.cicloInicio || 1}" min="1" max="${getYears()}" step="1" style="width:55px;text-align:center" oninput="App.updateIngreso(${i},'cicloInicio',+this.value)">
          </td>
          <td style="text-align:center">
            <label style="cursor:pointer;display:flex;align-items:center;gap:6px;justify-content:center">
              <input type="checkbox" ${ia.esRecurrente ? 'checked' : ''} style="accent-color:var(--emerald)" onchange="App.updateIngreso(${i},'esRecurrente',this.checked)">
              <span style="font-size:11px">${ia.esRecurrente ? 'Anual' : 'Solo Año ' + ia.cicloInicio}</span>
            </label>
          </td>
          <td style="text-align:right">${M((ia.montoAnual || 0) * (ia.esRecurrente ? getYears() : 1))}</td>
          <td><button onclick="App.removeIngreso(${i})" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:16px;padding:2px 6px">✕</button></td>
        </tr>`).join('');
    const totalAnual = list.reduce((s, ia) => s + (ia.esRecurrente ? ia.montoAnual || 0 : 0), 0);
    const totalEventos = list.reduce((s, ia) => s + (!ia.esRecurrente ? ia.montoAnual || 0 : 0), 0);
    return `<div class="section-header"><div><div class="section-title">Ingresos Adicionales</div>
      <div class="section-sub">Eventos, renta de instalaciones, donaciones y otros no-recurrentes</div></div>
      <button class="toggle-btn" onclick="App.addIngreso()">+ Agregar ingreso</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px">
      <div class="card" style="border-top:3px solid var(--emerald);text-align:center;padding:16px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Recurrentes / año</div>
        <div style="font-size:22px;font-weight:300;color:var(--emerald)">${M(totalAnual)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--gold);text-align:center;padding:16px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Eventos (único)</div>
        <div style="font-size:22px;font-weight:300;color:var(--gold)">${M(totalEventos)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--cobalt);text-align:center;padding:16px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Ingreso Extra Año 1</div>
        <div style="font-size:22px;font-weight:300;color:var(--cobalt)">${M(corrida[0].ingExtra || 0)}</div>
      </div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Concepto</th><th style="text-align:right">Monto Anual</th><th style="text-align:center">Desde Ciclo</th><th style="text-align:center">Tipo</th><th style="text-align:right">Total acumulado</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
  }

  // ── HISTORIAL DE CAMBIOS ──────────────────────────────────────
  const HIST_KEY = 'lil_change_log';
  function getHistorial() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { return []; }
  }
  function logChange(campo, valorAnterior, valorNuevo) {
    const log = getHistorial();
    log.unshift({ ts: Date.now(), campo, anterior: valorAnterior, nuevo: valorNuevo });
    localStorage.setItem(HIST_KEY, JSON.stringify(log.slice(0, 200)));
  }
  function clearHistorial() {
    localStorage.removeItem(HIST_KEY);
    navigate('historial');
  }
  function renderHistorial() {
    const log = getHistorial();
    const rows = log.length === 0
      ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">No hay cambios registrados aún. Los cambios se registran automáticamente al editar variables.</td></tr>'
      : log.map(e => {
        const d = new Date(e.ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const antStr = JSON.stringify(e.anterior)?.substring(0, 40) ?? '—';
        const newStr = JSON.stringify(e.nuevo)?.substring(0, 40) ?? '—';
        return `<tr>
            <td style="font-size:10px;color:var(--text-muted);white-space:nowrap">${d}</td>
            <td><strong>${e.campo}</strong></td>
            <td style="color:#c0392b;font-size:11px">${antStr}</td>
            <td style="color:var(--emerald);font-size:11px">${newStr}</td>
          </tr>`;
      }).join('');
    return `<div class="section-header"><div><div class="section-title">Historial de Cambios</div>
      <div class="section-sub">${log.length} cambio${log.length !== 1 ? 's' : ''} registrado${log.length !== 1 ? 's' : ''} en este navegador</div></div>
      ${log.length > 0 ? `<button class="toggle-btn" onclick="App.clearHistorial()" style="color:#c0392b">🗑 Limpiar historial</button>` : ''}
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Fecha/Hora</th><th>Campo</th><th>Valor anterior</th><th>Valor nuevo</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
  }

  // ── RESUMEN EJECUTIVO PDF ─────────────────────────────────────
  function renderResumenEjec() {
    return `<div class="section-header"><div><div class="section-title">Resumen Ejecutivo PDF</div>
      <div class="section-sub">Documento de 2 páginas tipo executive summary para inversionistas</div></div></div>
    <div class="card" style="padding:32px;text-align:center">
      <div style="font-size:44px;margin-bottom:14px">📄</div>
      <div style="font-size:16px;font-weight:400;color:var(--navy);margin-bottom:8px">Resumen Ejecutivo para Inversionistas</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;max-width:440px;margin-left:auto;margin-right:auto">
        Genera un PDF compacto con: logo institucional, KPIs clave, TIR/VPN, flujo acumulado, tabla de resultados y alertas del modelo.
        Diseñado para presentar a socios e inversionistas.
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
        <button class="toggle-btn" style="padding:12px 28px;font-size:13px;background:var(--navy);color:#fff;border-color:var(--navy)" onclick="App.generarPDF('ejecutivo')">
          📄 Reporte Ejecutivo (Dashboard)
        </button>
        <button class="toggle-btn" style="padding:12px 28px;font-size:13px;background:var(--gold);color:#fff;border-color:var(--gold)" onclick="App.generarPDF('proyeccion')">
          📊 Proyección Financiera Completa
        </button>
        <button class="toggle-btn" style="padding:12px 28px;font-size:13px;background:var(--emerald);color:#fff;border-color:var(--emerald)" onclick="App.generarPDF('matricula')">
          🏫 Matrícula por Nivel
        </button>
        <button class="toggle-btn" style="padding:12px 28px;font-size:13px;background:var(--cobalt);color:#fff;border-color:var(--cobalt)" onclick="App.generarPDF('nomina')">
          👥 Reporte de Nómina
        </button>
      </div>
      <div style="margin-top:20px;font-size:10px;color:var(--text-muted)">
        Los reportes se abren en una ventana nueva lista para imprimir o guardar como PDF desde el navegador.
      </div>
    </div>`;
  }

  // ============================================================
  // ── ANÁLISIS AVANZADO — 8 NUEVAS VISTAS ──────────────────────
  // ============================================================

  // ── VISTA 1: PUNTO DE EQUILIBRIO ──────────────────────────────
  function renderBreakEven() {
    const corrida = calcCorrida();
    const cap = calcTopeTotal() || 999;
    // For each year, binary-search enrollment that makes EBITDA ≥ 0
    function beAlumnos(yearIdx) {
      const yr = corrida[yearIdx];
      if (yr.ebitda >= 0) return '—';            // already profitable
      // Estimate: EBITDA = IngresoTotal - Egresos - Renta - Operadora
      // IngresoTotal ≈ alumnos × (ingreso_por_alumno_año1)
      const ingPerAlumno = yr.totalAlumnos > 0 ? yr.ingresoTotal / yr.totalAlumnos : 0;
      const fixedCosts = yr.gastosOp + yr.rentaInmueble;
      const nomRate = yr.nomina.totalAnual / Math.max(1, yr.totalAlumnos);
      // Simplified: EBITDA = n·ingPerAlumno – n·nomRate – fixedCosts – operadora(n)
      // operadora = max(0, sub)·opPct where sub = n·(ing-nom) – fixedCosts
      const opPct = state.variables.porcentajeOperadora;
      // Iterative solve
      for (let n = 1; n <= cap; n += 1) {
        const ing = n * ingPerAlumno;
        const nom = n * nomRate;
        const sub = ing - nom - fixedCosts;
        const ebitda = sub - Math.max(0, sub) * opPct - yr.rentaInmueble;
        if (ebitda >= 0) return n;
      }
      return '>' + cap;
    }
    const rows = corrida.map((yr, i) => {
      const be = beAlumnos(i);
      const delta = typeof be === 'number' ? yr.totalAlumnos - be : null;
      const pct = yr.totalAlumnos > 0 ? Math.min(100, (yr.totalAlumnos / cap) * 100) : 0;
      const beStr = typeof be === 'number' ? N(be) : be;
      const status = yr.ebitda >= 0 ? 'be-ok' : 'be-warn';
      const icon = yr.ebitda >= 0 ? '✅' : '⚠️';
      const deltaStr = delta !== null ? (delta >= 0 ? `<span style="color:var(--emerald)">+${N(delta)} excedente</span>` : `<span style="color:#c0392b">${N(delta)} faltan</span>`) : '—';
      return `<tr class="${status}">
        <td>${yr.ano}–${yr.ano + 1}</td>
        <td style="text-align:right">${N(yr.totalAlumnos)}</td>
        <td style="text-align:right"><strong>${beStr}</strong></td>
        <td>${deltaStr}</td>
        <td>${icon} ${yr.ebitda >= 0 ? 'Rentable' : 'En pérdida'}</td>
        <td>
          <div style="background:var(--border);border-radius:4px;height:8px;width:100%;min-width:80px">
            <div style="background:${yr.ebitda >= 0 ? 'var(--emerald)' : '#e74c3c'};height:8px;border-radius:4px;width:${pct.toFixed(1)}%"></div>
          </div>
          <div style="font-size:9px;color:var(--text-muted);margin-top:2px">${pct.toFixed(1)}% de cap. (${N(cap)} máx)</div>
        </td>
      </tr>`;
    }).join('');
    return `<div class="section-header"><div><div class="section-title">Punto de Equilibrio</div>
      <div class="section-sub">Alumnos mínimos para EBITDA ≥ 0 · por ciclo escolar</div></div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Ciclo</th><th style="text-align:right">Matrícula</th><th style="text-align:right">Break-Even</th><th>Diferencia</th><th>Estado</th><th>Ocupación</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="padding:14px 0 4px;font-size:11px;color:var(--text-muted)">
      ⚠ El break-even es una estimación lineal basada en proporciones del Año 1. Para un análisis preciso ajusta las variables del modelo.
    </div>
    </div>`;
  }

  // ── VISTA 2: TIR & VPN ─────────────────────────────────────────
  function renderTIRVPN() {
    const corrida = calcCorrida();
    const capital = state.variables.capitalRequerido || 0;
    const tasaDesc = state.variables.tasaDescuento ?? 0.12;
    const flujos = [-capital, ...corrida.map(y => y.ebitda)];

    // NPV
    const vpn = flujos.reduce((s, f, i) => s + f / Math.pow(1 + tasaDesc, i), 0);

    // IRR — Newton-Raphson
    function calcIRR(flows) {
      let r = 0.15;
      for (let iter = 0; iter < 200; iter++) {
        let f = 0, df = 0;
        flows.forEach((cf, t) => { f += cf / Math.pow(1 + r, t); df -= t * cf / Math.pow(1 + r, t + 1); });
        if (Math.abs(df) < 1e-10) break;
        const nr = r - f / df;
        if (Math.abs(nr - r) < 1e-8) { r = nr; break; }
        r = nr;
      }
      return r;
    }
    const tir = calcIRR(flujos);

    // Payback
    const payback = (() => {
      let acc = -capital;
      for (let i = 0; i < corrida.length; i++) {
        acc += corrida[i].ebitda;
        if (acc >= 0) return `${i + 1} año${i > 0 ? 's' : ''}`;
      }
      return `>${corrida.length} años`;
    })();

    const vpnColor = vpn >= 0 ? 'var(--emerald)' : '#c0392b';
    const tirColor = tir > tasaDesc ? 'var(--emerald)' : '#c0392b';
    const vpnFmt = `<span style="color:${vpnColor};font-weight:500">${M(vpn)}</span>`;
    const tirFmt = `<span style="color:${tirColor};font-weight:500">${(tir * 100).toFixed(2)}%</span>`;

    const flowRows = flujos.map((f, i) => {
      const discounted = f / Math.pow(1 + tasaDesc, i);
      const label = i === 0 ? 'Inversión Inicial' : `Año ${i} (${corrida[i - 1].ano}–${corrida[i - 1].ano + 1})`;
      return `<tr>
        <td>${label}</td>
        <td style="text-align:right;${f < 0 ? 'color:#c0392b' : ''}">${M(f)}</td>
        <td style="text-align:right;color:var(--text-muted)">${M(discounted)}</td>
      </tr>`;
    }).join('');

    return `<div class="section-header"><div><div class="section-title">TIR &amp; VPN</div>
      <div class="section-sub">Tasa Interna de Retorno · Valor Presente Neto · Payback</div></div></div>

    <!-- ── Ajuste de tasa de descuento inline ── -->
    <div class="card" style="margin-bottom:18px;padding:16px 22px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Tasa de Descuento (WACC)</div>
          <div style="font-size:10px;color:var(--text-muted);max-width:340px">
            Rendimiento mínimo exigido al capital invertido. Para colegios en México: 10–15% es rango típico.
            Si TIR > Tasa, el proyecto es viable.
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <input type="range" min="1" max="30" step="0.5"
            value="${(tasaDesc * 100).toFixed(1)}"
            style="width:160px;accent-color:var(--emerald);cursor:pointer"
            oninput="App.setTasaDescuento(this.value/100);document.getElementById('tasa-val').textContent=parseFloat(this.value).toFixed(1)+'%'">
          <div id="tasa-val" style="font-size:22px;font-weight:300;color:var(--navy);min-width:54px">${(tasaDesc * 100).toFixed(1)}%</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${[8, 10, 12, 15, 18, 20].map(n =>
      `<button onclick="App.setTasaDescuento(${n / 100})"
              style="padding:4px 10px;border-radius:4px;font-size:11px;
              border:1px solid ${Math.abs(tasaDesc * 100 - n) < 0.1 ? 'var(--emerald)' : 'var(--border)'};
              background:${Math.abs(tasaDesc * 100 - n) < 0.1 ? 'var(--emerald)' : 'transparent'};
              color:${Math.abs(tasaDesc * 100 - n) < 0.1 ? '#fff' : 'var(--text-muted)'};
              cursor:pointer;transition:all .15s">${n}%</button>`).join('')}
        </div>
      </div>
    </div>

    <div class="cards-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:18px">
      <div class="card" style="border-top:3px solid ${tirColor};text-align:center;padding:18px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">TIR</div>
        <div style="font-size:28px;font-weight:300">${tirFmt}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">
          ${tir > tasaDesc ? '✅ TIR > Tasa — Proyecto viable' : '⚠️ TIR < Tasa — Revisar supuestos'}
        </div>
      </div>
      <div class="card" style="border-top:3px solid ${vpnColor};text-align:center;padding:18px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">VPN · ${(tasaDesc * 100).toFixed(1)}% tasa</div>
        <div style="font-size:28px;font-weight:300">${vpnFmt}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${vpn >= 0 ? '✅ Proyecto crea valor' : '⚠️ Proyecto destruye valor a esta tasa'}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--gold);text-align:center;padding:18px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Payback</div>
        <div style="font-size:28px;font-weight:300;color:var(--gold)">${payback}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Recuperación de la inversión</div>
      </div>
      <div class="card" style="border-top:3px solid var(--navy);text-align:center;padding:18px">
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Inversión Base</div>
        <div style="font-size:28px;font-weight:300;color:var(--navy)">${M(capital)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Capital requerido Año 0</div>
      </div>
    </div>
    <div class="card"><div class="card-title">Flujos Descontados al ${(tasaDesc * 100).toFixed(1)}%</div><div class="table-wrap"><table>
      <thead><tr><th>Período</th><th style="text-align:right">Flujo Nominal</th><th style="text-align:right">Flujo Descontado</th></tr></thead>
      <tbody>${flowRows}</tbody>
    </table></div></div>`;
  }

  // ── VISTA 3: ANÁLISIS DE ESCENARIOS ────────────────────────────
  function renderEscenarios() {
    const corrida = calcCorrida();
    // Scenario multipliers on growth + reinscription
    const scenarios = [
      { name: 'Conservador', growthMult: 0.5, reinMult: 0.97, color: '#e74c3c', icon: '📉' },
      { name: 'Base', growthMult: 1.0, reinMult: 1.00, color: 'var(--cobalt)', icon: '📊' },
      { name: 'Optimista', growthMult: 1.5, reinMult: 1.03, color: 'var(--emerald)', icon: '📈' }
    ];
    function calcScenario(sc) {
      const savedCrec = state.tasaCrecimientoNuevoIngreso;
      const savedRein = state.tasaReinscripcion;
      state.tasaCrecimientoNuevoIngreso = (savedCrec ?? 0.05) * sc.growthMult;
      state.tasaReinscripcion = Math.min(0.99, (savedRein ?? 0.85) * sc.reinMult);
      const c = calcCorrida();
      state.tasaCrecimientoNuevoIngreso = savedCrec;
      state.tasaReinscripcion = savedRein;
      return c;
    }
    const scData = scenarios.map(sc => ({ ...sc, corrida: calcScenario(sc) }));
    const years = corrida.map(y => `${y.ano}`);
    const kpis = ['EBITDA Año 1', 'EBITDA Año Final', 'Flujo Acumulado', 'Matrícula Año Final'];
    const tableRows = kpis.map(kpi => {
      const cells = scData.map(sc => {
        const y1 = sc.corrida[0], yn = sc.corrida[sc.corrida.length - 1];
        let val;
        if (kpi === 'EBITDA Año 1') val = M(y1.ebitda);
        else if (kpi === 'EBITDA Año Final') val = M(yn.ebitda);
        else if (kpi === 'Flujo Acumulado') val = M(yn.cashAcumulado);
        else val = N(yn.totalAlumnos) + ' alumnos';
        const cls = val.includes('-') ? 'num-negative' : '';
        return `<td class="${cls}" style="color:${sc.color}">${val}</td>`;
      }).join('');
      return `<tr><td><strong>${kpi}</strong></td>${cells}</tr>`;
    }).join('');
    return `<div class="section-header"><div><div class="section-title">Análisis de Escenarios</div>
      <div class="section-sub">Conservador · Base · Optimista — usando variables actuales ±50%</div></div></div>
    <div class="card" style="margin-bottom:18px"><div class="table-wrap"><table>
      <thead><tr><th>KPI</th>${scData.map(sc => `<th style="color:${sc.color}">${sc.icon} ${sc.name}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
      ${scData.map(sc => `<div class="card" style="border-top:3px solid ${sc.color}">
        <div class="card-title" style="color:${sc.color}">${sc.icon} Escenario ${sc.name}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">
          Crecimiento NI: ${((state.tasaCrecimientoNuevoIngreso ?? 0.05) * sc.growthMult * 100).toFixed(1)}% ·
          Reinscripción: ${(Math.min(0.99, (state.tasaReinscripcion ?? 0.85) * sc.reinMult) * 100).toFixed(1)}%
        </div>
        ${sc.corrida.slice(0, 4).map(y => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px">
            <span>${y.ano}</span>
            <span style="color:${y.ebitda >= 0 ? sc.color : '#c0392b'}">${M(y.ebitda)}</span>
          </div>`).join('')}
      </div>`).join('')}
    </div>`;
  }

  // ── VISTA 4: FLUJO MENSUAL AÑO 1 ───────────────────────────────
  function renderFlujoMensual() {
    const corrida = calcCorrida();
    const yr = corrida[0];
    const MESES = ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
    // Distribute annual figures across 10 active months (Jul & Ago = vacation, low income)
    const weightIngresos = [1, 1, 1, 0.8, 1, 1, 1, 1, 1, 1, 0.5, 0.3]; // Aug/Jul lower
    const weightNomina = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];         // uniform
    const sumW = weightIngresos.reduce((s, v) => s + v, 0);
    const ingMensual = yr.ingresoTotal / sumW;
    const nomMensual = yr.nomina.totalAnual / 12;
    const gastMensual = yr.gastosOp / 12;
    const rentaMensual = yr.rentaInmueble / 12;
    let acum = 0;
    const rows = MESES.map((mes, i) => {
      const ing = ingMensual * weightIngresos[i];
      const egr = nomMensual * weightNomina[i] + gastMensual + rentaMensual;
      const flujo = ing - egr;
      acum += flujo;
      const cls = flujo >= 0 ? '' : 'num-negative';
      const acumCls = acum >= 0 ? 'num-gold' : 'num-negative';
      return `<tr>
        <td><strong>${mes}</strong></td>
        <td style="text-align:right">${M(ing)}</td>
        <td style="text-align:right;color:#c0392b">${M(egr)}</td>
        <td style="text-align:right" class="${cls}">${M(flujo)}</td>
        <td style="text-align:right" class="${acumCls}">${M(acum)}</td>
        <td>
          <div style="background:var(--border);border-radius:3px;height:6px;width:100%;min-width:60px">
            <div style="background:${flujo >= 0 ? 'var(--emerald)' : '#e74c3c'};height:6px;border-radius:3px;width:${Math.min(100, Math.abs(flujo) / ingMensual * 100).toFixed(0)}%"></div>
          </div>
        </td>
      </tr>`;
    }).join('');
    return `<div class="section-header"><div><div class="section-title">Flujo Mensual Año 1</div>
      <div class="section-sub">Distribución estimada del primer ciclo escolar (Sep ${yr.ano} – Ago ${yr.ano + 1})</div></div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Mes</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Egresos</th><th style="text-align:right">Flujo</th><th style="text-align:right">Acumulado</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="padding:14px 0 4px;font-size:10px;color:var(--text-muted)">
      ⚠ Los pesos mensuales son estimados. Julio-Agosto reflejan vacaciones con menor recaudación. Ajusta las variables para mayor precisión.
    </div></div>`;
  }

  // ── VISTA 5: ESCENARIOS GUARDADOS ──────────────────────────────
  const SC_KEY = 'lil_saved_scenarios';
  function getSavedScenarios() {
    try { return JSON.parse(localStorage.getItem(SC_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveCurrentScenario(name) {
    const corrida = calcCorrida();
    const y1 = corrida[0], yn = corrida[corrida.length - 1];
    const list = getSavedScenarios();
    const snap = {
      name, ts: Date.now(),
      state: JSON.parse(JSON.stringify(state)),
      metrics: {
        capital: state.variables.capitalRequerido,
        anoInicio: state.variables.anoInicio,
        alumnos1: Math.round(y1.totalAlumnos),
        ebitda1: Math.round(y1.ebitda),
        flujoFinal: Math.round(yn.cashAcumulado),
        horizonte: getYears()
      }
    };
    list.unshift(snap);
    localStorage.setItem(SC_KEY, JSON.stringify(list.slice(0, 20)));
    navigate('scenariosaved');
    toast(`Corrida "${name}" guardada`, 'success');
  }

  function quickSave() {
    const input = document.getElementById('qs-name');
    const name = (input?.value || '').trim() ||
      `Corrida ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const corrida = calcCorrida();
    const y1 = corrida[0], yn = corrida[corrida.length - 1];
    const list = getSavedScenarios();
    const snap = {
      name, ts: Date.now(),
      state: JSON.parse(JSON.stringify(state)),
      metrics: {
        capital: state.variables.capitalRequerido,
        anoInicio: state.variables.anoInicio,
        alumnos1: Math.round(y1.totalAlumnos),
        ebitda1: Math.round(y1.ebitda),
        flujoFinal: Math.round(yn.cashAcumulado),
        horizonte: getYears()
      }
    };
    list.unshift(snap);
    localStorage.setItem(SC_KEY, JSON.stringify(list.slice(0, 20)));
    closeQuickSave();
    toast(`Corrida "${name}" guardada`, 'success');
  }

  function openQuickSave() {
    const overlay = document.getElementById('quick-save-overlay');
    if (!overlay) return;
    const now = new Date();
    const name = `Corrida ${now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    const input = document.getElementById('qs-name');
    if (input) input.value = name;
    // Preview del estado actual
    const corrida = calcCorrida();
    const y1 = corrida[0], yn = corrida[corrida.length - 1];
    const prev = document.getElementById('qs-preview');
    if (prev) prev.innerHTML =
      `Capital ${M(state.variables.capitalRequerido)} &nbsp;·&nbsp; ${Math.round(y1.totalAlumnos)} alumnos Año 1 &nbsp;·&nbsp; EBITDA: ${M(y1.ebitda)} &nbsp;·&nbsp; Flujo ${getYears()} años: ${M(yn.cashAcumulado)}`;
    // Lista de corridas guardadas
    const list = getSavedScenarios();
    const ql = document.getElementById('qs-saved-list');
    if (ql) {
      if (list.length === 0) { ql.innerHTML = ''; }
      else {
        ql.innerHTML = `<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Corridas guardadas</div>` +
          list.slice(0, 6).map((sc, i) => {
            const d = new Date(sc.ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const m = sc.metrics;
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--beige)">
              <div>
                <div style="font-size:12px;font-weight:400;color:var(--navy)">${sc.name}</div>
                <div style="font-size:9px;color:var(--text-muted)">${d}${m ? ` &nbsp;·&nbsp; ${Math.round(m.alumnos1)} alum &nbsp;·&nbsp; EBITDA ${M(m.ebitda1)}` : ''}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <button onclick="App.loadScenario(${i});App.closeQuickSave()"
                  style="background:none;border:1px solid var(--cobalt);color:var(--cobalt);border-radius:4px;
                    padding:3px 10px;font-size:10px;cursor:pointer;font-family:inherit">Cargar</button>
                <button onclick="App.deleteScenario(${i})"
                  style="background:none;border:none;color:var(--purple);cursor:pointer;font-size:13px;padding:2px 4px">✕</button>
              </div>
            </div>`;
          }).join('');
      }
    }
    overlay.style.display = 'flex';
    setTimeout(() => { input?.select(); }, 60);
  }

  function closeQuickSave() {
    const overlay = document.getElementById('quick-save-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function loadScenario(idx) {
    const list = getSavedScenarios();
    if (!list[idx]) return;
    Object.assign(state, JSON.parse(JSON.stringify(list[idx].state)));
    saveState();
    navigate(currentView);
    toast(`Corrida "${list[idx].name}" cargada`, 'success');
    requestAnimationFrame(() => initCharts(calcCorrida()));
  }

  function deleteScenario(idx) {
    const list = getSavedScenarios();
    list.splice(idx, 1);
    localStorage.setItem(SC_KEY, JSON.stringify(list));
    // Refresh modal list if open, else refresh view
    const overlay = document.getElementById('quick-save-overlay');
    if (overlay && overlay.style.display !== 'none') { openQuickSave(); }
    else { navigate('scenariosaved'); }
  }

  function renderScenarioSaved() {
    const list = getSavedScenarios();
    const corrida = calcCorrida();
    const y1 = corrida[0], yn = corrida[corrida.length - 1];
    const savedRows = list.length === 0
      ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No hay corridas guardadas aún. Usa el botón "Guardar corrida" en la barra superior.</td></tr>'
      : list.map((sc, i) => {
        const d = new Date(sc.ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const m = sc.metrics;
        return `<tr>
            <td><strong style="font-weight:400">${sc.name}</strong><div style="font-size:9px;color:var(--text-muted)">${d}</div></td>
            <td style="text-align:right">${m ? M(m.capital) : '—'}</td>
            <td style="text-align:right">${m ? m.anoInicio : (sc.state.variables?.anoInicio || '—')}</td>
            <td style="text-align:right">${m ? N(m.alumnos1) : '—'}</td>
            <td style="text-align:right;color:var(--gold)">${m ? M(m.ebitda1) : '—'}</td>
            <td style="text-align:right;color:var(--cobalt)">${m ? M(m.flujoFinal) : '—'}</td>
            <td style="display:flex;gap:6px;align-items:center;justify-content:flex-end">
              <button class="toggle-btn" style="padding:4px 10px;font-size:10px" onclick="App.loadScenario(${i})">Cargar</button>
              <button onclick="App.deleteScenario(${i})" style="background:none;border:none;color:var(--purple);cursor:pointer;font-size:14px;padding:2px 4px">✕</button>
            </td>
          </tr>`;
      }).join('');
    return `<div class="section-header"><div><div class="section-title">Corridas Guardadas</div>
      <div class="section-sub">Historial de escenarios · usa "Guardar corrida" en la barra superior para añadir</div></div>
      <button onclick="App.openQuickSave()"
        style="background:var(--cobalt);color:#fff;border:none;border-radius:6px;padding:9px 20px;
          font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap">+ Guardar corrida actual</button>
    </div>
    <div class="card" style="margin-bottom:4px">
      <div style="font-size:10px;color:var(--text-muted);line-height:1.8">
        Estado actual &nbsp;·&nbsp; Capital ${M(state.variables.capitalRequerido)} &nbsp;·&nbsp;
        ${Math.round(y1.totalAlumnos)} alumnos Año 1 &nbsp;·&nbsp;
        EBITDA Año 1: <span style="color:var(--gold)">${M(y1.ebitda)}</span> &nbsp;·&nbsp;
        Flujo ${getYears()} años: <span style="color:var(--cobalt)">${M(yn.cashAcumulado)}</span>
      </div>
    </div>
    <div class="card"><div class="card-title">Historial de corridas (${list.length} / 20)</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Nombre</th>
          <th style="text-align:right">Capital</th>
          <th style="text-align:right">Año inicio</th>
          <th style="text-align:right">Alumnos A1</th>
          <th style="text-align:right">EBITDA A1</th>
          <th style="text-align:right">Flujo final</th>
          <th style="text-align:right">Acción</th>
        </tr></thead>
        <tbody>${savedRows}</tbody>
      </table></div>
    </div>`;
  }

  // ── VISTA 6: RATIO FORMADORES-ALUMNOS ────────────────────────
  function renderRatioMaestro() {
    const corrida = calcCorrida();
    const puestos = state.nominas.puestos || [];

    // Base = TODO el personal (campus + dirección ejecutiva)
    // La misma base se escala con factorNomina cuando matrícula < capacidad de referencia
    const totalBase = puestos.reduce((s, p) => s + (p.count || 1), 0);
    // Factor por matrícula — misma referencia que gastos de operación
    const capRef = state.gastosOperacion.capacidadGastoRef || 400;
    // factor aplicado a todo el personal (misma lógica que calcNomina)
    const dePersonas = (() => {
      const de = state.dirEjecutiva || {};
      return (de.puestos || []).reduce((s, p) => s + 1, 0);
    })();
    const totalBaseTotal = totalBase + dePersonas;

    const rows = corrida.map(yr => {
      // factorNomina ya calculado: min(1, alumnos / capRef)
      const factor = Math.min(1, yr.totalAlumnos / capRef);
      const formadoresEfectivos = totalBaseTotal > 0 ? totalBaseTotal * factor : null;
      const ratio = formadoresEfectivos ? (yr.totalAlumnos / formadoresEfectivos).toFixed(1) : '—';
      const ratioNum = formadoresEfectivos ? yr.totalAlumnos / formadoresEfectivos : null;
      const semaforo = ratioNum === null ? '—'
        : ratioNum <= 15 ? '🟢' : ratioNum <= 25 ? '🟡' : '🔴';
      const evaluacion = ratioNum === null
        ? 'Agrega puestos en Nóminas'
        : ratioNum <= 15 ? 'Óptimo'
          : ratioNum <= 25 ? 'Aceptable' : 'Alto — revisa dotación';
      return `<tr>
        <td>${yr.ano}–${yr.ano + 1}</td>
        <td style="text-align:right">${N(yr.totalAlumnos)}</td>
        <td style="text-align:right">${totalBaseTotal || '—'}</td>
        <td style="text-align:right;color:var(--text-muted)">${(factor * 100).toFixed(0)}%
          <div style="font-size:9px">${formadoresEfectivos ? formadoresEfectivos.toFixed(1) + ' efectivos' : ''}</div>
        </td>
        <td style="text-align:right"><strong>${ratio}</strong></td>
        <td>${semaforo} ${evaluacion}</td>
      </tr>`;
    }).join('');

    const sinPersonal = totalBaseTotal === 0
      ? `<div style="padding:12px;background:var(--bg);border-radius:6px;font-size:11px;color:var(--text-muted);margin-bottom:14px">
          ⓘ No se encontraron puestos definidos. Ve a
          <a href="#" onclick="App.navigate('nominas');return false" style="color:var(--cobalt)">Nóminas</a>
          y agrega los puestos del campus.
        </div>` : '';

    return `<div class="section-header"><div><div class="section-title">Ratio Formadores-Alumnos</div>
      <div class="section-sub">Todo el personal (campus + Dir. Ejecutiva) por alumno · escala con matrícula vs. capacidad (ref: ${N(capRef)} alumnos · configurada en Gastos de Operación)</div></div></div>
    ${sinPersonal}
    <div class="card">
      <div style="display:flex;gap:24px;flex-wrap:wrap;padding:0 2px 14px;border-bottom:1px solid var(--border);margin-bottom:14px">
        <div><div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Personal campus</div>
          <div style="font-size:20px;font-weight:300;color:var(--navy)">${totalBase}</div></div>
        <div><div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Dir. Ejecutiva</div>
          <div style="font-size:20px;font-weight:300;color:var(--navy)">${dePersonas}</div></div>
        <div><div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Total base</div>
          <div style="font-size:20px;font-weight:300;color:var(--gold)">${totalBaseTotal}</div></div>
        <div><div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Cap. referencia</div>
          <div style="font-size:20px;font-weight:300;color:var(--text-muted)">${N(capRef)}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Ciclo</th>
          <th style="text-align:right">Matrícula</th>
          <th style="text-align:right">Personal Base</th>
          <th style="text-align:right">Factor Plantilla</th>
          <th style="text-align:right">Ratio</th>
          <th>Evaluación</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div style="padding:12px 0 0;font-size:10px;color:var(--text-muted)">
        🟢 ≤ 15 alumnos/persona — Óptimo &nbsp;·&nbsp; 🟡 16–25 — Aceptable &nbsp;·&nbsp; 🔴 > 25 — Alto<br>
        <em>Factor Plantilla = matrícula ÷ ${N(capRef)}. Ejemplo: 200 alumnos → 50% del personal base está activo.</em>
      </div>
    </div>`;
  }

  // ── VISTA 9: ALERTAS ───────────────────────────────────────────
  function renderAlertas() {
    const corrida = calcCorrida();
    const cap = calcTopeTotal() || Infinity;
    const alerts = [];
    // Check each year
    corrida.forEach((yr, i) => {
      const ebitdaPct = yr.ingresoTotal > 0 ? yr.ebitda / yr.ingresoTotal : 0;
      const ocupPct = cap < Infinity ? yr.totalAlumnos / cap : null;
      if (yr.ebitda < 0)
        alerts.push({ sev: 'rojo', ciclo: `${yr.ano}–${yr.ano + 1}`, msg: `EBITDA NEGATIVO (${M(yr.ebitda)})`, desc: 'El proyecto opera en pérdida este ciclo.' });
      else if (ebitdaPct < 0.05)
        alerts.push({ sev: 'amarillo', ciclo: `${yr.ano}–${yr.ano + 1}`, msg: `Margen EBITDA muy bajo (${(ebitdaPct * 100).toFixed(1)}%)`, desc: 'Margen inferior al 5% — riesgo de pérdida ante variaciones menores.' });
      else if (ebitdaPct < 0.15)
        alerts.push({ sev: 'info', ciclo: `${yr.ano}–${yr.ano + 1}`, msg: `Margen EBITDA moderado (${(ebitdaPct * 100).toFixed(1)}%)`, desc: 'Margen entre 5–15%. Vigilar crecimiento de costos.' });
      if (ocupPct !== null && ocupPct < 0.50)
        alerts.push({ sev: 'amarillo', ciclo: `${yr.ano}–${yr.ano + 1}`, msg: `Ocupación baja (${(ocupPct * 100).toFixed(0)}% de capacidad)`, desc: `Solo ${N(yr.totalAlumnos)} alumnos de ${N(cap)} máximos. Matrícula insuficiente.` });
      else if (ocupPct !== null && ocupPct > 0.95)
        alerts.push({ sev: 'info', ciclo: `${yr.ano}–${yr.ano + 1}`, msg: `Capacidad casi agotada (${(ocupPct * 100).toFixed(0)}%)`, desc: 'Considera expansión de infraestructura.' });
    });
    const rojos = alerts.filter(a => a.sev === 'rojo').length;
    const amarillos = alerts.filter(a => a.sev === 'amarillo').length;
    const info = alerts.filter(a => a.sev === 'info').length;
    const sevColor = { rojo: '#c0392b', amarillo: '#e67e22', info: 'var(--cobalt)' };
    const sevIcon = { rojo: '🔴', amarillo: '🟡', info: '🔵' };
    const alertCards = alerts.length === 0
      ? '<div class="card" style="text-align:center;padding:32px;color:var(--emerald)"><div style="font-size:32px">✅</div><div style="font-weight:500;margin-top:8px">Sin alertas — el modelo está en buena forma</div></div>'
      : alerts.map(a => `<div class="card" style="border-left:4px solid ${sevColor[a.sev]};margin-bottom:12px;padding:14px 18px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:16px">${sevIcon[a.sev]}</span>
            <div>
              <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">${a.ciclo}</div>
              <div style="font-weight:500;color:${sevColor[a.sev]}">${a.msg}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${a.desc}</div>
            </div>
          </div>
        </div>`).join('');
    return `<div class="section-header"><div><div class="section-title">Alertas del Sistema</div>
      <div class="section-sub">Semáforos automáticos · ${rojos} críticas · ${amarillos} advertencias · ${info} informativas</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px">
      <div class="card" style="border-top:3px solid #c0392b;text-align:center;padding:14px">
        <div style="font-size:24px;color:#c0392b;font-weight:300">${rojos}</div>
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Críticas</div>
      </div>
      <div class="card" style="border-top:3px solid #e67e22;text-align:center;padding:14px">
        <div style="font-size:24px;color:#e67e22;font-weight:300">${amarillos}</div>
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Advertencias</div>
      </div>
      <div class="card" style="border-top:3px solid var(--cobalt);text-align:center;padding:14px">
        <div style="font-size:24px;color:var(--cobalt);font-weight:300">${info}</div>
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted)">Informativas</div>
      </div>
    </div>
    ${alertCards}`;
  }

  // ── VISTA 10: EXPORTAR EXCEL ────────────────────────────────────
  function renderExcelExport() {
    return `<div class="section-header"><div><div class="section-title">Exportar Excel</div>
      <div class="section-sub">Genera un archivo .xlsx con toda la corrida financiera</div></div></div>
    <div class="card" style="padding:28px;text-align:center">
      <div style="font-size:40px;margin-bottom:12px">📊</div>
      <div style="font-size:15px;font-weight:400;color:var(--navy);margin-bottom:8px">Exportar modelo financiero a Excel</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:24px;max-width:420px;margin-left:auto;margin-right:auto">
        Genera un archivo <code>.xlsx</code> con la corrida anual completa, matrícula por grado y KPIs ejecutivos.
        Requiere conexión a internet para cargar la librería SheetJS.
      </div>
      <button class="toggle-btn" style="padding:12px 28px;font-size:13px" onclick="App.exportExcel()">
        ⬇ Descargar Excel (.xlsx)
      </button>
    </div>`;
  }

  // ============================================================
  // XX. VIEW — ANÁLISIS DE TICKET DE INVERSIÓN
  // ============================================================
  function renderTicket() {
    const corrida = calcCorrida();
    const v = state.variables;

    // Parámetros base
    const numTickets = Math.max(1, v.numTickets || 100);
    const capReq = v.capitalRequerido || 100000000;
    const valorTicket = capReq / numTickets;

    // Utilidades totales proyectadas (7 años típicos)
    const ebitdaTotal = corrida.reduce((sum, yr) => sum + Math.max(0, yr.ebitda), 0);
    const utilAnualPromedio = ebitdaTotal / corrida.length;

    // Rendimiento del ticket base
    const utilTicketPromedio = utilAnualPromedio / numTickets;
    const rendimientoAnualPct = valorTicket > 0 ? (utilTicketPromedio / valorTicket) : 0;

    // Función helper para construir las cards de los Tiers
    const buildTierCard = (titulo, cantTickets, color, icono) => {
      const invBase = valorTicket * cantTickets;
      const utilAnual = utilTicketPromedio * cantTickets;
      const retorno7 = (ebitdaTotal / numTickets) * cantTickets;
      const roi = invBase > 0 ? (retorno7 / invBase) - 1 : 0;

      let breakdownHtml = '<div style="margin-top:20px; font-size:11px; background:rgba(0,0,0,0.01); padding:12px; border-radius:4px">';
      breakdownHtml += '<div style="font-weight:600; color:var(--text); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; font-size:10px; opacity:.7">Proyección Anual</div>';

      corrida.forEach((yr, idx) => {
        const utilAnio = (Math.max(0, yr.ebitda) / numTickets) * cantTickets;
        const rendimientoAnio = invBase > 0 ? (utilAnio / invBase) : 0;

        breakdownHtml += `
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.05)">
            <span style="opacity:.7">Año ${idx + 1}</span>
            <span style="font-weight:500; color:var(--${color})">${M(utilAnio)} <span style="opacity:.5; font-size:10px; margin-left:4px">(${P(rendimientoAnio)})</span></span>
          </div>
        `;
      });
      breakdownHtml += '</div>';

      return `
        <div class="kpi-card" style="border-top: 3px solid var(--${color}); flex: 1; min-width: 250px;">
          <div style="font-size:24px; margin-bottom:8px">${icono}</div>
          <div class="kpi-label" style="font-size:14px; color:var(--${color}); font-weight:600">${titulo}</div>
          <div style="font-size:11px; opacity:.6; margin-bottom:12px">${cantTickets} ${cantTickets === 1 ? 'Ticket' : 'Tickets'}</div>
          
          <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px dashed var(--border)">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; opacity:.5">Inversión Requerida</div>
            <div class="kpi-val" style="font-size:22px">${M(invBase)}</div>
          </div>
          
          <div style="margin-bottom:12px">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; opacity:.5">Utilidad Promedio Anual</div>
            <div class="kpi-val" style="font-size:18px; color:var(--gold)">${M(utilAnual)}</div>
            <div class="badge badge-gold" style="margin-top:4px">Rendimiento: ${P(rendimientoAnualPct)} anual</div>
          </div>
          
          <div style="margin-bottom:12px">
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; opacity:.5">Retorno Total Esperado (7 años)</div>
            <div class="kpi-val" style="font-size:18px">${M(retorno7)}</div>
            <div style="font-size:11px; opacity:.7; margin-top:2px">ROI: ${P(roi)}</div>
          </div>
          
          ${breakdownHtml}
        </div>
      `;
    };

    return `
    <div class="section-header">
      <div>
        <div class="section-title">Análisis de Ticket de Inversión</div>
        <div class="section-sub">Atractivo para inversionistas · Tiers y flujos proyectados a ${corrida.length} años</div>
      </div>
      <div class="badge badge-oxford">Capital Requerido: ${M(capReq)}</div>
    </div>

    <!-- Ajuste rápido de emisión -->
    <div class="card" style="display:flex; align-items:center; gap:20px; padding:16px 20px; background:linear-gradient(to right, rgba(14,30,74,0.03), transparent);">
      <div style="flex:1">
        <div style="font-weight:500; color:var(--navy); font-size:14px">Emisión de Tickets</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px">Ajusta el número total de tickets a emitir. Este valor se sincroniza con el módulo de Variables Iniciales.</div>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <label style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted)">Total a emitir:</label>
        <input type="number" class="form-input" value="${numTickets}" min="1" step="1" style="width:100px; font-weight:600; font-size:16px; text-align:center"
          data-key="numTickets" data-nested="variables">
      </div>
    </div>

    <!-- Tiers de Inversión -->
    <h3 style="font-size:14px; color:var(--navy); margin: 24px 0 16px; font-weight:500">Opciones de Inversión (Tiers)</h3>
    <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:stretch;">
      ${buildTierCard('Nivel Clásico', 1, 'cobalt', '🎟️')}
      ${buildTierCard('Nivel Premium', 3, 'gold', '🎖️')}
      ${buildTierCard('Nivel Fundador', 5, 'oxford', '🏛️')}
    </div>
    
    <!-- Contexto / Disclaimer -->
    <div style="margin-top:24px; padding:16px; background:var(--bg); border:1px solid var(--border); border-radius:6px; font-size:11px; color:var(--text-muted); line-height:1.6">
      <strong>Nota sobre el cálculo:</strong> La utilidad proyectada asume una distribución lineal del 100% del EBITDA generado a lo largo de ${corrida.length} años.
      El rendimiento anual promedio mostrado (${P(rendimientoAnualPct)}) es una media aritmética del flujo de caja libre antes de impuestos. El ROI refleja el crecimiento del capital inicial aportado al finalizar el ciclo proyectado.
    </div>
    `;
  }

  // ── NOMINA EXACTA (LEY / REPORTE) ───────────────────────────
  function renderSalariosExactos() {
    const puestos = state.nominas.puestos || [];
    if (puestos.length === 0) {
      return `<div class="section-header">
                <div><div class="section-title">Nómina Exacta (Ley)</div><div class="section-sub">Requiere puestos configurados en el módulo Nóminas</div></div>
              </div>
              <div style="padding:40px;text-align:center;color:var(--text-muted)">Aún no hay puestos definidos. Por favor ingresa al menú "Nóminas" para cargarlos.</div>`;
    }

    const rows = puestos.map(p => {
      const unit = calcCostoPuesto({ ...p, count: 1 });
      const esHon = p.esHonorarios ? '<span style="color:var(--cobalt)">Sí</span>' : 'No';

      return `<tr>
         <td style="text-align:left;font-weight:500">${p.nombre}</td>
         <td style="text-align:left">${p.sector}</td>
         <td style="text-align:right">${M(unit.sueldo)}</td>
         <td style="text-align:center">${esHon}</td>
         <td style="text-align:right">${M(unit.sd)}</td>
         <td style="text-align:right">${M(unit.sdi)}</td>
         <td style="text-align:right">${M(unit.sbcMensual)}</td>
         <td style="text-align:right;color:#c0392b">${M(unit.imssObrero)}</td>
         <td style="text-align:right;color:#c0392b">${M(unit.isrEmpleado)}</td>
         <td style="text-align:right;color:var(--emerald);font-weight:600">${M(unit.netoEstimado)}</td>
         <td style="text-align:right">${M(unit.imssPatronal)}</td>
         <td style="text-align:right">${M(unit.infonavit)}</td>
         <td style="text-align:right">${M(unit.isn)}</td>
         <td style="text-align:right">${M(unit.aguinaldo)}</td>
         <td style="text-align:right">${M(unit.primaAntiguedad)}</td> <!-- Vacaciones Mensual guardada aqui -->
         <td style="text-align:right">${M(unit.primaVacacional)}</td>
         <td style="text-align:right">${M(unit.costoAsimilado)}</td>
         <td style="text-align:right;color:var(--gold);font-weight:600">${M(unit.costoTotal)}</td>
       </tr>`;
    }).join('');

    return `
      <div class="section-header">
        <div>
          <div class="section-title">Nómina Exacta (Ley)</div>
          <div class="section-sub">Desglose mensual unitario por puesto. Retenciones y Cargas LSS/LISR 2024-2025.</div>
        </div>
        <div style="display:flex;gap:10px">
          <button onclick="App.exportarSalariosExcel()" style="cursor:pointer;background:var(--emerald);color:#fff;border:none;padding:8px 16px;border-radius:4px;font-size:12px;font-weight:500">
            Exportar Excel
          </button>
          <button onclick="App.exportarSalariosPDF()" style="cursor:pointer;background:#c0392b;color:#fff;border:none;padding:8px 16px;border-radius:4px;font-size:12px;font-weight:500">
            Exportar PDF
          </button>
        </div>
      </div>
      <div class="card" style="overflow-x:auto;">
        <table class="salarios-table" style="min-width: 1400px; font-size: 11px;">
          <thead>
            <tr>
              <th style="text-align:left">Puesto</th>
              <th style="text-align:left">Sector</th>
              <th style="text-align:right">Sueldo (Bruto)</th>
              <th style="text-align:center">Honorarios</th>
              <th style="text-align:right">Sal. Diario</th>
              <th style="text-align:right">SDI</th>
              <th style="text-align:right">SBC Mens.</th>
              <th style="text-align:right">IMSS Obr.</th>
              <th style="text-align:right">ISR Retenido</th>
              <th style="text-align:right;color:var(--emerald)">Neto Estimado</th>
              <th style="text-align:right">IMSS Pat.</th>
              <th style="text-align:right">INFONAVIT (5%)</th>
              <th style="text-align:right">ISN (3%)</th>
              <th style="text-align:right">Prov. Aguin.</th>
              <th style="text-align:right">Prov. Vacs.</th>
              <th style="text-align:right">Prov. Prima Vac.</th>
              <th style="text-align:right">Costo Asimil.</th>
              <th style="text-align:right;color:var(--gold)">Costo Empresa</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  function exportarSalariosExcel() {
    if (!window.XLSX) return alert("La librería para Excel no está cargada.");
    const puestos = state.nominas.puestos || [];
    const data = puestos.map(p => {
      const unit = calcCostoPuesto({ ...p, count: 1 });
      return {
        "Puesto": p.nombre,
        "Sector": p.sector,
        "Sueldo_Bruto": Math.round(unit.sueldo * 100) / 100,
        "Honorarios": p.esHonorarios ? "Sí" : "No",
        "Salario_Diario": Math.round(unit.sd * 100) / 100,
        "SDI": Math.round(unit.sdi * 100) / 100,
        "SBC_Mensual": Math.round(unit.sbcMensual * 100) / 100,
        "IMSS_Obrero": Math.round(unit.imssObrero * 100) / 100,
        "Subsidio": Math.round(unit.subsidio * 100) / 100,
        "ISR_Mensual": Math.round(unit.isrEmpleado * 100) / 100,
        "Neto_Estimado": Math.round(unit.netoEstimado * 100) / 100,
        "IMSS_Patronal": Math.round(unit.imssPatronal * 100) / 100,
        "INFONAVIT": Math.round(unit.infonavit * 100) / 100,
        "ISN": Math.round(unit.isn * 100) / 100,
        "Prov_Aguinaldo": Math.round(unit.aguinaldo * 100) / 100,
        "Prov_Vacs": Math.round(unit.primaAntiguedad * 100) / 100, // stored in primaAntiguedad logically
        "Prov_PrimaVac": Math.round(unit.primaVacacional * 100) / 100,
        "Costo_Fiscal": Math.round((unit.costoTotal - unit.sueldo) * 100) / 100, // W2
        "Costo_Asimilado": Math.round((unit.costoAsimilado || 0) * 100) / 100,
        "Costo_Total_Mensual": Math.round(unit.costoTotal * 100) / 100,
        "Costo_Total_Anual": Math.round((unit.costoTotal * 12) * 100) / 100
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nomina Exacta");
    XLSX.writeFile(workbook, "LL_Reporte_Salarios.xlsx");
  }

  function exportarSalariosPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) return alert("La librería para PDF no se pudo cargar.");
    const doc = new jspdf.jsPDF('landscape');

    doc.setFontSize(14);
    doc.text("L&L · Reporte de Nómina Exacta (Ley)", 14, 15);
    doc.setFontSize(10);
    doc.text("Cálculo unitario mensual por perfil de puesto. Moneda: MXN.", 14, 22);

    const puestos = state.nominas.puestos || [];
    const head = [["Puesto", "Sector", "Bruto", "SDI", "IMSS Obr", "Sub", "ISR", "Neto", "IMSS Pat", "Info", "Prov", "Asimilado", "Costo Emp."]];

    const body = puestos.map(p => {
      const u = calcCostoPuesto({ ...p, count: 1 });
      return [
        p.nombre,
        p.sector,
        N(u.sueldo),
        N(u.sdi),
        N(u.imssObrero),
        N(u.subsidio),
        N(u.isrEmpleado),
        N(u.netoEstimado),
        N(u.imssPatronal),
        N(u.infonavit),
        N(u.provisiones),
        N(u.costoAsimilado || 0),
        N(u.costoTotal)
      ];
    });

    doc.autoTable({
      head: head,
      body: body,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 48, 104] } // Oxford Blue L&L
    });

    doc.save("LL_Reporte_Salarios.pdf");
  }


  const VIEW_TITLES = {
    dashboard: 'Dashboard', variables: 'Variables Iniciales', matricula: 'Matriz de Alumnos',
    referencias: 'Valores de Referencia', cuotas: 'Cuotas Escolares',
    inscripciones: 'Inscripciones y Re-inscripciones',
    nominas: 'Nóminas', gastos: 'Gastos de Operación',
    corrida: 'Corrida Anual', proyeccion: 'Proyección Financiera', reportes: 'Reportes PDF',
    breakeven: 'Punto de Equilibrio', tirvanp: 'TIR & VPN',
    escenarios: 'Análisis de Escenarios', flujomensual: 'Flujo Mensual Año 1',
    scenariosaved: 'Escenarios Guardados', ratiomaestro: 'Ratio Formadores-Alumnos',
    alertas: 'Alertas del Sistema', excelexport: 'Exportar Excel',
    costoporal: 'Costo por Alumno', ingresosadicionales: 'Ingresos Adicionales',
    ticket: 'Análisis de Ticket de Inversión',
    historial: 'Historial de Cambios', resumenejec: 'Resumen Ejecutivo PDF',
    salariosexactos: 'Cálculo de Nómina Exacta',
    colegiaturas: 'Ingresos por Colegiaturas'
  };
  const RENDERERS = {
    dashboard: renderDashboard, variables: renderVariables, matricula: renderMatricula,
    referencias: renderReferencias, cuotas: renderCuotas, inscripciones: renderInscripciones,
    nominas: renderNominas, gastos: renderGastos, corrida: renderCorrida, proyeccion: renderProyeccion,
    reportes: renderReportes,
    colegiaturas: renderColegiaturas,
    breakeven: renderBreakEven, tirvanp: renderTIRVPN,
    escenarios: renderEscenarios, flujomensual: renderFlujoMensual,
    scenariosaved: renderScenarioSaved, ratiomaestro: renderRatioMaestro,
    alertas: renderAlertas, excelexport: renderExcelExport,
    costoporal: renderCostoPorAlumno, ingresosadicionales: renderIngresosAdicionales,
    ticket: renderTicket, salariosexactos: renderSalariosExactos,
    historial: renderHistorial, resumenejec: renderResumenEjec
  };

  function navigate(view) {
    if (!RENDERERS[view]) view = 'dashboard';
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    const t = document.getElementById('content-title');
    if (t) t.textContent = VIEW_TITLES[view] || view;
    destroyCharts();
    const body = document.getElementById('content-body');
    if (body) {
      body.innerHTML = RENDERERS[view]();
      attachInputListeners();
      requestAnimationFrame(() => initCharts(calcCorrida()));
    }
  }

  // ============================================================
  // 18. INPUT HANDLERS
  // ============================================================
  function attachInputListeners() {
    const body = document.getElementById('content-body');
    if (!body) return;
    body.querySelectorAll('input[type="number"]').forEach(el => {
      el.addEventListener('change', handleInput);
      el.addEventListener('input', debounce(handleInput, 450));
    });
    body.querySelectorAll('input[type="checkbox"][data-toggle-grade]').forEach(el => {
      el.addEventListener('change', e => {
        if (!state.gradosActivos) state.gradosActivos = {};
        state.gradosActivos[e.target.dataset.toggleGrade] = e.target.checked;
        scheduleUpdate();
      });
    });
  }

  function handleInput(e) {
    const el = e.target;

    // Puestos — nombre / sector (texto) antes del chequeo numérico
    if (el.dataset.puestoIdx !== undefined && el.dataset.puestoField &&
      (el.dataset.puestoField === 'nombre' || el.dataset.puestoField === 'sector')) {
      const idx = +el.dataset.puestoIdx;
      if (!state.nominas.puestos[idx]) state.nominas.puestos[idx] = {};
      state.nominas.puestos[idx][el.dataset.puestoField] = el.value;
      return scheduleUpdate();
    }

    // Puestos — campos numéricos (sueldo, count) — se procesan con raw más abajo
    if (el.dataset.puestoIdx !== undefined && el.dataset.puestoField &&
      (el.dataset.puestoField === 'sueldo' || el.dataset.puestoField === 'count')) {
      const idx = +el.dataset.puestoIdx;
      const raw2 = parseFloat(String(el.value).replace(/[$,\s]/g, ''));
      if (!isNaN(raw2)) {
        if (!state.nominas.puestos[idx]) state.nominas.puestos[idx] = {};
        state.nominas.puestos[idx][el.dataset.puestoField] = Math.max(el.dataset.puestoField === 'count' ? 1 : 0, raw2);
      }
      return scheduleUpdate();
    }

    // Gastos — label (texto) debe manejarse antes del chequeo numérico
    if (el.dataset.gastoSection && el.dataset.gastoIdx !== undefined && el.dataset.gastoField === 'label') {
      const sec = el.dataset.gastoSection;
      const idx = +el.dataset.gastoIdx;
      if (!state.gastosOperacion[sec]) state.gastosOperacion[sec] = [];
      if (!state.gastosOperacion[sec][idx]) state.gastosOperacion[sec][idx] = {};
      state.gastosOperacion[sec][idx].label = el.value;
      return scheduleUpdate();
    }

    // Dir. Ejecutiva — nombre / puesto del trabajador (texto)
    if (el.dataset.direjIdx !== undefined && (el.dataset.direjField === 'nombre' || el.dataset.direjField === 'puesto')) {
      const idx = +el.dataset.direjIdx;
      if (!state.dirEjecutiva?.puestos?.[idx]) return;
      state.dirEjecutiva.puestos[idx][el.dataset.direjField] = el.value;
      return scheduleUpdate();
    }

    const raw = parseFloat(String(el.value).replace(/[$,\s]/g, ''));
    if (isNaN(raw)) return;

    // Enrollment matrix — initial per grade
    if (el.dataset.matGrade) { state.matriculaInicial[el.dataset.matGrade] = raw; return scheduleUpdate(); }

    // Nuevos ingresos per grade (legacy)
    if (el.dataset.nuevosGrade) { state.nuevosIngresos[el.dataset.nuevosGrade] = raw; return scheduleUpdate(); }

    // Deserción por nivel (legacy flat)
    if (el.dataset.desNivel) { state.desercionPorNivel[el.dataset.key] = raw / 100; return scheduleUpdate(); }

    // Capacity per grade
    if (el.dataset.capGrade) { state.capacidadMaxima[el.dataset.key] = raw; return scheduleUpdate(); }

    // ── NEW: per-level per-year entrada ──
    if (el.dataset.entradaNivel !== undefined) {
      const nivel = el.dataset.entradaNivel;
      const idx = +el.dataset.yrIdx;
      if (!state.entradaPorNivel[nivel]) state.entradaPorNivel[nivel] = [];
      state.entradaPorNivel[nivel][idx] = raw;
      return scheduleUpdate();
    }

    // ── NEW: per-level per-year deserción anual ──
    if (el.dataset.desercionAnual !== undefined) {
      const nivel = el.dataset.desercionAnual;
      const idx = +el.dataset.yrIdx;
      if (!state.desercionAnual[nivel]) state.desercionAnual[nivel] = [];
      state.desercionAnual[nivel][idx] = raw / 100;
      return scheduleUpdate();
    }

    // Transition arrays
    if (el.dataset.key === 'nominaTransicion' && el.dataset.transicionIdx !== undefined) { state.nominas.nominaTransicion[+el.dataset.transicionIdx] = raw; return scheduleUpdate(); }
    if (el.dataset.key === 'transicion' && el.dataset.goIdx !== undefined) { state.gastosOperacion.transicion[+el.dataset.goIdx] = raw; return scheduleUpdate(); }

    // Gastos — edición de categorías (monto o etiqueta)
    // Gastos — monto numérico por categoría
    if (el.dataset.gastoSection && el.dataset.gastoIdx !== undefined && el.dataset.gastoField === 'monto') {
      const sec = el.dataset.gastoSection;
      const idx = +el.dataset.gastoIdx;
      if (!state.gastosOperacion[sec]) state.gastosOperacion[sec] = [];
      if (!state.gastosOperacion[sec][idx]) state.gastosOperacion[sec][idx] = {};
      state.gastosOperacion[sec][idx].monto = raw;
      return scheduleUpdate();
    }

    // Inscripciones — desglose por concepto
    if (el.dataset.inscLevel && el.dataset.inscConcepto) {
      const lk = el.dataset.inscLevel;
      const ck = el.dataset.inscConcepto;
      if (!state.inscripciones[lk] || typeof state.inscripciones[lk] !== 'object') state.inscripciones[lk] = {};
      state.inscripciones[lk][ck] = raw;
      return scheduleUpdate();
    }

    // Cuotas — desglose por concepto
    if (el.dataset.cuotaLevel && el.dataset.cuotaConcepto) {
      const lk = el.dataset.cuotaLevel;
      const ck = el.dataset.cuotaConcepto;
      if (!state.cuotas[lk] || typeof state.cuotas[lk] !== 'object') state.cuotas[lk] = {};
      state.cuotas[lk][ck] = raw;
      return scheduleUpdate();
    }

    // Dir. Ejecutiva — campos numéricos (salario por persona)
    if (el.dataset.direjIdx !== undefined && el.dataset.direjField === 'salario') {
      const idx = +el.dataset.direjIdx;
      if (!isNaN(raw) && state.dirEjecutiva?.puestos?.[idx]) {
        state.dirEjecutiva.puestos[idx].salario = Math.max(0, raw);
      }
      return scheduleUpdate();
    }

    // Selector colegiatura — porcentajes de descuento
    if (el.dataset.selectorDescuento) {
      if (!state.selectorColegiatura) state.selectorColegiatura = {};
      state.selectorColegiatura[el.dataset.selectorDescuento] = raw / 100;
      return scheduleUpdate();
    }

    // Ref tables
    if (el.dataset.refType && el.dataset.refGrade) { state[el.dataset.refType][el.dataset.refGrade] = raw; return scheduleUpdate(); }

    // Generic (key + optional nested)
    const key = el.dataset.key; if (!key) return;
    const nested = el.dataset.nested;
    const PCT_KEYS = ['Rate', 'Pct', 'inflacion', 'aumentoColegiatura', 'porcentajeModelo',
      'porcentajeOperadora', 'tasaDesercion', 'tasaCaptacion',
      'tasaReinscripcion', 'tasaCrecimientoNuevoIngreso'];
    const isPct = PCT_KEYS.some(p => key.endsWith(p) || key === p);
    const val = isPct ? raw / 100 : raw;

    if (nested) { if (!state[nested]) state[nested] = {}; state[nested][key] = val; }
    else { state[key] = val; }
    scheduleUpdate();
  }

  let updateTimer = null;
  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => { saveState(); softRefresh(); }, 250);
  }

  function softRefresh() {
    const body = document.getElementById('content-body'); if (!body) return;
    const scroll = body.scrollTop;
    destroyCharts();
    body.innerHTML = RENDERERS[currentView]();
    attachInputListeners();
    body.scrollTop = scroll;
    requestAnimationFrame(() => initCharts(calcCorrida()));
  }

  // ============================================================
  // 19. EXPORT CSV
  // ============================================================
  function exportCSV() {
    const corrida = calcCorrida();
    const years = corrida.map(y => y.ano);
    const BOM = '\uFEFF';
    const fields = [
      ['Año', y => y.ano],
      ['Total Alumnos', y => Math.round(y.totalAlumnos)],
      ['Inscripciones Brutas', y => Math.round(y.sumInscripciones)],
      ['Desc. Inscripciones', y => -Math.round(y.descInscripcion)],
      ['Colegiaturas Brutas', y => Math.round(y.sumColegiaturas)],
      ['Apoyos Economicos', y => -Math.round(y.apoyosEcon)],
      ['Becas SEP/Maestros', y => -Math.round(y.becas)],
      ['Cuotas Escolares', y => Math.round(y.sumCuotas)],
      ['TOTAL INGRESOS', y => Math.round(y.ingresoTotal)],
      ['Nomina Total', y => Math.round(y.nomina.totalAnual)],
      ['Gastos de Operacion', y => Math.round(y.gastosOp)],
      ['TOTAL EGRESOS', y => Math.round(y.egresoTotal)],
      ['Subtotal Operativo', y => Math.round(y.subtotal)],
      ['Comision Operadora', y => -Math.round(y.operadora)],
      ['Renta Activo Inmobiliario', y => -Math.round(y.rentaInmueble)],
      ['EBITDA', y => Math.round(y.ebitda)],
      ['Flujo Acumulado', y => Math.round(y.cashAcumulado)],
      ['Utilidad por Accion', y => Math.round(y.utilidadPorAccion)]
    ];
    let csv = BOM + 'Concepto,' + years.join(',') + '\n';
    fields.forEach(([l, fn]) => { csv += `"${l}", ${corrida.map(fn).join(',')} \n`; });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `LyL_Corrida_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast('CSV exportado', 'success');
  }

  // ============================================================
  // 20. NÓMINA — ACCIONES DE TABLA
  // ============================================================
  function addPuesto() {
    if (!state.nominas.puestos) state.nominas.puestos = [];
    state.nominas.puestos.push({
      nombre: 'Nuevo Puesto', sector: 'General',
      sueldo: 15000, count: 1, esHonorarios: false
    });
    scheduleUpdate();
    toast('Puesto añadido', 'success');
  }

  function removePuesto(idx) {
    if (!state.nominas.puestos) return;
    state.nominas.puestos.splice(idx, 1);
    scheduleUpdate();
    toast('Puesto eliminado');
  }

  function toggleHonorarios(idx) {
    if (!state.nominas.puestos?.[idx]) return;
    state.nominas.puestos[idx].esHonorarios = !state.nominas.puestos[idx].esHonorarios;
    scheduleUpdate();
  }

  // ============================================================
  // 21. UTILS + INIT
  // ============================================================
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('app-layout')?.classList.toggle('sidebar-collapsed', !sidebarOpen);
  }
  function toast(msg, type = '') {
    const c = document.getElementById('toast-container'); if (!c) return;
    const el = document.createElement('div'); el.className = `toast ${type} `; el.textContent = msg;
    c.appendChild(el); setTimeout(() => el.remove(), 3000);
  }
  function debounce(fn, d) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); }; }

  function init() {
    state = patchState(loadState());
    document.querySelectorAll('.nav-item[data-view]').forEach(el =>
      el.addEventListener('click', () => navigate(el.dataset.view)));

    // ── Formateo automático $ y comas en todos los inputs numéricos ──
    // Al hacer focus: muestra el número puro para editar
    // Al salir (blur): reformatea con $ y comas
    document.addEventListener('focus', e => {
      const el = e.target;
      if (!el.matches('input.form-input, input.cell-input')) return;
      const v = parseFloat(String(el.value).replace(/[$,\s]/g, ''));
      if (!isNaN(v) && el.type !== 'checkbox') el.value = Math.round(v);
    }, true);
    document.addEventListener('blur', e => {
      const el = e.target;
      if (!el.matches('input.form-input, input.cell-input')) return;
      if (el.dataset.puestoField === 'count' || el.dataset.direjField === 'puesto' ||
        el.dataset.puestoField === 'nombre' || el.dataset.puestoField === 'sector' ||
        el.dataset.direjField === 'nombre' || el.type === 'checkbox') return;
      const v = parseFloat(String(el.value).replace(/[$,\s]/g, ''));
      if (!isNaN(v)) el.value = MXN.format(Math.round(v));
    }, true);

    navigate('dashboard');
  }

  function recalcular() { softRefresh(); toast('Proyección actualizada', 'success'); }

  function logout() {
    sessionStorage.removeItem('lil_auth');
    const portal = document.getElementById('login-portal');
    if (portal) {
      portal.style.display = '';
      portal.classList.remove('lp-exit');
    }
  }

  function exportExcel() {
    // Load SheetJS dynamically if not already loaded
    function doExport() {
      const XLSX = window.XLSX;
      const corrida = calcCorrida();
      const mat = calcMatricula();
      const fecha = new Date().toLocaleDateString('es-MX');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Corrida Anual
      const header = ['Concepto', ...corrida.map(y => `${y.ano} -${y.ano + 1} `)];
      const rows = [
        header,
        ['Matrícula Total', ...corrida.map(y => y.totalAlumnos)],
        ['INGRESOS'],
        ['Inscripciones Netas', ...corrida.map(y => Math.round(y.sumInscripciones - y.descInscripcion))],
        ['Total Colegiaturas', ...corrida.map(y => Math.round(y.sumColegiaturas))],
        ['Cuotas Escolares', ...corrida.map(y => Math.round(y.sumCuotas))],
        ['Apoyos Económicos', ...corrida.map(y => -Math.round(y.apoyosEcon))],
        ['Becas SEP/Maestros', ...corrida.map(y => -Math.round(y.becas))],
        ['TOTAL INGRESOS', ...corrida.map(y => Math.round(y.ingresoTotal))],
        ['EGRESOS'],
        ['Nómina Total', ...corrida.map(y => -Math.round(y.nomina.totalAnual))],
        ['Gastos de Operación', ...corrida.map(y => -Math.round(y.gastosOp))],
        ['TOTAL EGRESOS', ...corrida.map(y => -Math.round(y.egresoTotal))],
        ['RESULTADO OPERATIVO', ...corrida.map(y => Math.round(y.subtotal))],
        ['Comisión Operadora', ...corrida.map(y => -Math.round(y.operadora))],
        ['Renta Inmueble', ...corrida.map(y => -Math.round(y.rentaInmueble))],
        ['EBITDA', ...corrida.map(y => Math.round(y.ebitda))],
        ['Flujo Acumulado', ...corrida.map(y => Math.round(y.cashAcumulado))],
        ['Utilidad/Acción', ...corrida.map(y => Math.round(y.utilidadPorAccion))]
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Corrida Anual');

      // Sheet 2: Matrícula
      const matHeader = ['Grado', ...corrida.map(y => `${y.ano} `)];
      const matRows = [matHeader, ...GRADES.map(g => [g.label, ...mat.map(yr => yr[g.key] || 0)])];
      const ws2 = XLSX.utils.aoa_to_sheet(matRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Matrícula');

      // Sheet 3: KPIs
      const y1 = corrida[0], yn = corrida[corrida.length - 1];
      const capital = state.variables.capitalRequerido || 0;
      const kpiRows = [
        ['KPI', 'Valor'],
        ['Fecha de generación', fecha],
        ['Capital Requerido', capital],
        ['Matrícula Año 1', y1.totalAlumnos],
        ['Ingresos Año 1', Math.round(y1.ingresoTotal)],
        ['EBITDA Año 1', Math.round(y1.ebitda)],
        [`Matrícula Año ${corrida.length} `, yn.totalAlumnos],
        [`EBITDA Año ${corrida.length} `, Math.round(yn.ebitda)],
        ['Flujo Acumulado Final', Math.round(yn.cashAcumulado)],
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(kpiRows);
      XLSX.utils.book_append_sheet(wb, ws3, 'KPIs');

      XLSX.writeFile(wb, `LyL_Modelo_Financiero_${new Date().getFullYear()}.xlsx`);
      toast('Excel generado exitosamente', 'success');
    }

    if (window.XLSX) { doExport(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = doExport;
    s.onerror = () => toast('No se pudo cargar SheetJS — verifica conexión', 'error');
    document.head.appendChild(s);
  }


  function addIngreso() {
    if (!state.ingresosAdicionales) state.ingresosAdicionales = [];
    state.ingresosAdicionales.push({ nombre: 'Nuevo ingreso', montoAnual: 50000, esRecurrente: false, cicloInicio: 1 });
    saveState();
    navigate('ingresosadicionales');
  }
  function removeIngreso(idx) {
    (state.ingresosAdicionales || []).splice(idx, 1);
    saveState();
    navigate('ingresosadicionales');
  }
  function updateIngreso(idx, campo, valor) {
    if (!state.ingresosAdicionales || !state.ingresosAdicionales[idx]) return;
    const prev = state.ingresosAdicionales[idx][campo];
    state.ingresosAdicionales[idx][campo] = valor;
    logChange(`ingresoAdicional[${idx}].${campo} `, prev, valor);
    saveState();
  }

  function setTasaDescuento(tasa) {
    tasa = Math.max(0.01, Math.min(0.50, parseFloat(tasa) || 0.12));
    if (!state.variables) state.variables = {};
    state.variables.tasaDescuento = tasa;
    saveState();
    if (currentView === 'tirvanp') {
      const body = document.getElementById('content-body');
      if (body) body.innerHTML = renderTIRVPN();
    }
  }

  function setSelectorTipo(tipo) {
    if (!state.selectorColegiatura) state.selectorColegiatura = {};
    state.selectorColegiatura.tipo = tipo;
    saveState();
    softRefresh();
  }

  function aplicarTipoColegiatura() {
    const sel = state.selectorColegiatura || { tipo: 'newland', descuentoMedias: 0.15, descuentoBajas: 0.30 };
    const nwl = state.colegiaturasNewland || DEFAULTS.colegiaturasNewland;
    const tipo = sel.tipo || 'newland';
    let computed;
    if (tipo === 'media') {
      const d = sel.descuentoMedias ?? 0.15;
      computed = Object.fromEntries(TUITION_KEYS.map(k => [k, Math.round(nwl[k] * (1 - d))]));
    } else if (tipo === 'baja') {
      const d = sel.descuentoBajas ?? 0.30;
      computed = Object.fromEntries(TUITION_KEYS.map(k => [k, Math.round(nwl[k] * (1 - d))]));
    } else {
      computed = { ...nwl };
    }
    state.colegiaturas = computed;
    saveState();
    softRefresh();
    const labels = { newland: 'Newland', media: 'Medias', baja: 'Bajas' };
    toast(`Colegiaturas tipo ${labels[tipo]} aplicadas`, 'success');
  }

  function setHorizonte(n) {
    n = Math.max(1, Math.min(10, parseInt(n) || 7));
    state.horizonte = n;
    saveState();
    // Re-render the current view (proyeccion) to update slider + table + charts
    const body = document.getElementById('content-body');
    if (body && currentView === 'proyeccion') {
      body.innerHTML = renderProyeccion();
      requestAnimationFrame(() => initCharts(calcCorrida()));
    }
  }

  return {
    init, navigate, resetState, exportCSV, toggleSidebar, recalcular,
    addPuesto, removePuesto, toggleHonorarios,
    generarPDF: _generarPDF, logout, setHorizonte,
    saveCurrentScenario, loadScenario, deleteScenario, exportExcel, setTasaDescuento,
    addIngreso, removeIngreso, updateIngreso, clearHistorial,
    exportarSalariosExcel, exportarSalariosPDF,
    setSelectorTipo, aplicarTipoColegiatura,
    openQuickSave, closeQuickSave, quickSave
  };

})();

document.addEventListener('DOMContentLoaded', App.init);

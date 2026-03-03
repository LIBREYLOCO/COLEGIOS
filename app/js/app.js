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

  const YEARS = 7;
  const ANO_INICIO = 2026;

  // ── Parámetros Legales Nómina México 2025 ──────────────────────
  const NOM_UMA = 113.14;   // UMA diaria
  const NOM_SMG = 278.80;   // Salario mínimo general diario (actualizado 2025)
  const NOM_DIAS_MES = 30.4;
  const NOM_FI = 1.0493;   // Factor de integración (15d aguinaldo + 25% prima vac)

  // Tabla ISR mensual (Art. 96 LISR — 11 tramos verificados en modelo PDF)
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

  // ============================================================
  // 2. DEFAULT STATE
  // ============================================================
  const DEFAULTS = {
    variables: {
      anoInicio: 2026,
      terreno: 40000,
      capitalRequerido: 250000000,
      inflacion: 0.05,
      aumentoColegiatura: 0.06,
      porcentajeModelo: 0.30,
      porcentajeOperadora: 0.12,
      rentaInmuebleBase: 15000000,
      numAcciones: 100,
      numTickets: 500,
      // ── New enrollment variables ──
      tasaDesercion: 0.03,    // % alumnos que no continúan al siguiente grado
      tasaCaptacion: 0.05     // crecimiento anual de nuevos ingresos externos
    },

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

    // ── Proyección dinámica: deserción y entrada por nivel y por año (YEARS-1 valores) ──
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
        { nombre: 'Marca', sector: 'Dir Ejecutiva', sueldo: 25000, count: 1, esHonorarios: false },
        { nombre: 'DIRECCION EJEC.', sector: 'Dir Ejecutiva', sueldo: 72424, count: 1, esHonorarios: false },
        { nombre: 'D.O.', sector: 'Dir Ejecutiva', sueldo: 35000, count: 1, esHonorarios: false },
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
      capacidadNominaRef: 400,      // alumnos = 100% de la nómina (igual que gastos op.)
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
      totalCampus: 1,       // número de campus que comparten este costo
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
   * Computes enrollment for all 16 grades across all YEARS.
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
   * Modelo matrícula — dos tipos de grado:
   *
   * GRADOS DE ENTRADA (mat, p1, s1, b1) — reciben alumnos nuevos del exterior:
   *   grade[t] = base_año0 × (1 + crec)^t
   *   → Siempre crecen. mat arranca en 15, p1 en 30.
   *
   * GRADOS CASCADE (todos los demás) — alumnos que avanzan del grado anterior:
   *   grade[t] = prev_grade[t-1] × reinscripcion × (1 + crec)
   *   → reinscripcion retiene, crec agrega nuevo ingreso lateral.
   *
   * Grados inactivos (gradosActivos[key] === false) → 0 en todos los años.
   */
  function calcMatricula() {
    const rein = state.tasaReinscripcion ?? 0.85;
    const crec = state.tasaCrecimientoNuevoIngreso ?? 0.05;
    const activos = state.gradosActivos || {};
    const result = [];

    // Año 0 — base editada por el usuario
    const year0 = {};
    GRADES.forEach(g => {
      year0[g.key] = activos[g.key] === false
        ? 0 : Math.max(0, Math.round(state.matriculaInicial[g.key] || 0));
    });
    result.push({ ...year0 });

    for (let t = 1; t < YEARS; t++) {
      const prev = result[t - 1];
      const cur = {};

      GRADES.forEach((g, i) => {
        if (activos[g.key] === false) { cur[g.key] = 0; return; }

        let val;
        if (ENTRY_GRADES.has(g.key)) {
          // Entrada: crece desde base año 0
          val = year0[g.key] * Math.pow(1 + crec, t);
        } else {
          // Cascade: grado anterior × reinscripción × (1 + crecimiento)
          val = prev[GRADES[i - 1].key] * rein * (1 + crec);
        }

        val = Math.max(0, Math.round(val));

        // Tope por grado (105%)
        const cap = state.capacidadMaxima ? (state.capacidadMaxima[g.key] || Infinity) : Infinity;
        if (val > cap * 1.05) val = Math.round(cap * 1.05);

        cur[g.key] = val;
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

  /** Retención ISR mensual del empleado (Art. 96 LISR) */
  function calcISR(sueldoMensual) {
    const row = ISR_TABLA.find(r => sueldoMensual >= r.li && sueldoMensual <= r.ls) || ISR_TABLA[ISR_TABLA.length - 1];
    return row.cuota + Math.max(0, sueldoMensual - row.li) * row.tasa;
  }

  /** Multiplica todos los costos calculados por el número de personas */
  function multiplyByCnt(c, n) {
    if (n <= 1) return { ...c, count: 1 };
    return {
      ...c, count: n,
      imss: c.imss * n, infonavit: c.infonavit * n, isn: c.isn * n,
      provisiones: c.provisiones * n, isrEmpleado: c.isrEmpleado * n,
      costoTotal: c.costoTotal * n
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
    if (p.esHonorarios) {
      const s = {
        count, sueldo, sd: 0, sdi: 0, imss: 0, infonavit: 0, isn: 0,
        provisiones: 0, isrEmpleado: calcISR(sueldo), costoTotal: sueldo
      };
      return multiplyByCnt(s, count);
    }
    const sd = sueldo / NOM_DIAS_MES;
    const sdi = sd * NOM_FI;
    const sdiMensual = sdi * NOM_DIAS_MES;

    // IMSS Patronal — cuota fija por TRABAJADOR × count (no confundir con sueldo total)
    const cuotaFijaEM = 0.2040 * NOM_SMG * NOM_DIAS_MES;          // Cuota fija EM por trabajador
    const excedenteEM = 0.011 * Math.max(0, sdi - 3 * NOM_UMA) * NOM_DIAS_MES; // Excedente 3 UMA
    const invalidezVida = 0.0175 * sdiMensual;                        // Invalidez y vida
    const guarderias = 0.01 * sdiMensual;                        // Guarderías y PS
    const retiro = 0.02 * sdiMensual;                        // Retiro
    const cesantia = 0.0315 * sdiMensual;                        // Cesantía y vejez
    const imss = cuotaFijaEM + excedenteEM + invalidezVida + guarderias + retiro + cesantia;

    const infonavit = 0.05 * sdiMensual;                         // Infonavit 5%
    const isn = sueldo * 0.03;                                // ISN 3%
    const provisiones = (NOM_FI - 1) * sueldo;                       // Aguinaldo + prima vac via FI

    const single = {
      count, sueldo, sd, sdi, imss, infonavit, isn, provisiones,
      isrEmpleado: calcISR(sueldo),
      costoTotal: sueldo + imss + infonavit + isn + provisiones
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
   * Costo mensual de nómina para el yearIdx dado.
   * factorNomina = min(1, totalAlumnos / capacidadNominaRef)  — misma lógica que gastos op.
   * Si totalAlumnos no se pasa (ej. vista de Resumen sin corrida), se asume factor = 1.
   */
  function calcNomina(yearIdx, totalAlumnos) {
    const inf = Math.pow(1 + state.variables.inflacion, yearIdx);
    const puestos = state.nominas.puestos || [];
    const puestosBase = puestos.reduce((s, p) => s + calcCostoPuesto(p).costoTotal, 0);

    // Factor por matrícula (igual que gastos controlados)
    const capNomina = state.nominas.capacidadNominaRef || 400;
    const factorNomina = totalAlumnos != null ? Math.min(1, totalAlumnos / capNomina) : 1;

    // Si hay puestos definidos, su total ya incluye IMSS/ISN/etc — inflacionar directamente
    const base = (puestosBase > 0 ? puestosBase : state.nominas.nominaCampusBase) * inf * factorNomina;
    const asim = state.nominas.asimilados;
    const fondo = state.nominas.fondoFiniquitos;
    const transicion = state.nominas.nominaTransicion[yearIdx] || 0;

    // Cuando se usan puestos, IMSS/ISN ya están embebidos en "base"
    const usaPuestos = puestosBase > 0;
    const honor = usaPuestos ? 0 : (state.nominas.honorarios || 0);
    const sal = usaPuestos ? base : (base + honor);
    const imss = usaPuestos ? 0 : sal * state.nominas.imssRate;
    const infonavit = usaPuestos ? 0 : sal * state.nominas.infonavitRate;
    const isrNomina = usaPuestos ? 0 : sal * state.nominas.isrNominaRate;
    const impEst = usaPuestos ? 0 : sal * state.nominas.impEstatalRate;
    const aguinaldo = usaPuestos ? 0 : sal * state.nominas.aguinaldoRate;
    const primaVac = usaPuestos ? 0 : sal * state.nominas.primaVacacionalRate;
    const primaAnt = usaPuestos ? 0 : sal * state.nominas.primaAntiguedadRate;

    // Nómina dirección ejecutiva (honorarios corporativos ÷ campus)
    const de = calcDirEjecutiva(yearIdx);

    const totalMensual = sal + asim + imss + infonavit + isrNomina +
      impEst + aguinaldo + primaVac + primaAnt +
      fondo + transicion + de.costoCampus;

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
    const cap = go.capacidadGastoRef || 400;
    const factor = Math.min(1, (totalAlumnos || 0) / cap);

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

    for (let i = 0; i < YEARS; i++) {
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
      const ingresoTotal = (sumInscripciones - descInscripcion) + sumColegiaturas - apoyosEcon - becas - prontoPago + sumCuotas;

      const nomina = calcNomina(i, totalAlumnos);
      const gastosOpDet = calcGastos(i, totalAlumnos);
      const gastosOp = gastosOpDet.total;
      const egresoTotal = nomina.totalAnual + gastosOp;

      const subtotal = ingresoTotal - egresoTotal;
      const operadora = Math.max(0, subtotal) * state.variables.porcentajeOperadora;
      const rentaInmueble = state.variables.rentaInmuebleBase * infFactor;
      const ebitda = subtotal - operadora - rentaInmueble;

      cashAcumulado += ebitda;
      const utilidadPorAccion = ebitda / (state.variables.numAcciones || 1);

      results.push({
        ano, i, infFactor, colFactor,
        gradeEnrollment, levelEnrollment, totalAlumnos,
        sumInscripciones, descInscripcion, sumColegiaturas, sumCuotas,
        apoyosEcon, becas, prontoPago, ingresoTotal,
        nomina, gastosOp, egresoTotal,
        subtotal, operadora, rentaInmueble, ebitda,
        cashAcumulado, utilidadPorAccion
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
      { label: 'Capital Requerido', val: m2M(state.variables.capitalRequerido) + ' MXN', sub: `${N(state.variables.numAcciones)} acciones · ${N(state.variables.numTickets || 500)} tickets`, cls: 'gold', accent: 'positive' },
      { label: 'Ingresos Año 1', val: m2M(y1.ingresoTotal), sub: 'Netos descontando becas', cls: '', accent: 'positive' },
      { label: `Ingresos Año ${YEARS}`, val: m2M(yN.ingresoTotal), sub: `+${P(yN.ingresoTotal / y1.ingresoTotal - 1)} vs Año 1`, cls: '', accent: 'positive' },
      { label: `EBITDA Año ${YEARS}`, val: m2M(yN.ebitda), sub: 'Utilidad operativa neta', cls: 'gold', accent: 'positive' },
      { label: 'Flujo Acumulado 7 Años', val: m2M(yN.cashAcumulado), sub: 'Dinero en bancos al cierre', cls: 'cobalt', accent: 'positive' }
    ];

    return `
    <div class="section-header">
      <div>
        <div class="section-title">Dashboard · Resumen Ejecutivo</div>
        <div class="section-sub">Lógica &amp; Liquidez · Ciclos 1–${YEARS} (${corrida[0].ano}–${corrida[YEARS - 1].ano})</div>
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
      <div class="chart-card"><div class="chart-title">Matrícula por Nivel · Proyección</div><div class="chart-wrap"><canvas id="chart-matricula"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Composición de Ingresos Año 1</div><div class="chart-wrap"><canvas id="chart-pie"></canvas></div></div>
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
          <span class="form-hint">Ciclo 1 = ${ano0 - 1}-${String(ano0).slice(-2)} · La corrida proyecta los ${YEARS} ciclos siguientes</span>
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
      for (let t = 1; t < YEARS; t++) {
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
        <td colspan="${YEARS + 2}">▸ ${lv.key}
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
        <div class="section-sub">Ciclos 1–${YEARS} (${corrida0[0].ano}–${corrida0[YEARS - 1].ano})
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
      <div class="card-title">Proyección de Matrícula · Ciclos 1–${YEARS}
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
              ${allYears.map((y, i) => `<th class="${i === 0 ? 'col-year-0' : ''}">${y}</th>`).join('')}
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
      <div class="card-title">Aranceles por Nivel · Ciclo 1 (${ciclo1})</div>
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

    // factor matrícula del año 1 para el encabezado
    const capNomina = nom.capacidadNominaRef || 400;

    // ── Tabla de puestos ──────────────────────────────────────────
    const puestos = nom.puestos || [];
    const pCosts = puestos.map(calcCostoPuesto);
    const pRows = puestos.map((p, idx) => {
      const c = pCosts[idx];
      const cnt = c.count || 1;
      const honCheck = p.esHonorarios
        ? `<input type="checkbox" checked onchange="App.toggleHonorarios(${idx})">`
        : `<input type="checkbox" onchange="App.toggleHonorarios(${idx})">`;
      const tdC = (v, gold) =>
        `<td style="text-align:right;${gold ? 'color:var(--gold);font-weight:500' : 'opacity:.85'}">${M(v)}</td>`;
      return `<tr>
        <td><input type="text" class="cell-input" value="${p.nombre}" style="width:150px;text-align:left"
          data-puesto-idx="${idx}" data-puesto-field="nombre"></td>
        <td><input type="text" class="cell-input" value="${p.sector}" style="width:95px;text-align:left"
          data-puesto-idx="${idx}" data-puesto-field="sector"></td>
        <td><input type="number" class="cell-input" value="${cnt}" step="1" min="1" style="width:46px;text-align:center"
          data-puesto-idx="${idx}" data-puesto-field="count" title="Número de personas"></td>
        <td><input type="number" class="cell-input" value="${p.sueldo}" step="500" style="width:100px"
          data-puesto-idx="${idx}" data-puesto-field="sueldo" title="Sueldo bruto unitario"></td>
        <td style="text-align:center">${honCheck}</td>
        ${p.esHonorarios
          ? `<td colspan="5" style="text-align:center;opacity:.4;font-size:11px">— exento IMSS/ISN —</td>`
          : `${tdC(c.imss)}${tdC(c.isn)}${tdC(c.infonavit)}`}
        ${tdC(c.provisiones)}
        <td style="text-align:right;color:var(--cobalt);opacity:.85">${M(p.sueldo * cnt)}</td>
        ${tdC(c.costoTotal, true)}
        <td style="text-align:center">
          <button onclick="App.removePuesto(${idx})"
            style="background:none;border:none;color:var(--purple);cursor:pointer;font-size:13px;padding:2px 6px"
            title="Eliminar">✕</button>
        </td>
      </tr>`;
    }).join('');

    const totSueldoBruto = pCosts.reduce((s, c) => s + c.sueldo * (c.count || 1), 0);
    const totIMSS = pCosts.reduce((s, c) => s + c.imss, 0);
    const totISN = pCosts.reduce((s, c) => s + c.isn, 0);
    const totInfo = pCosts.reduce((s, c) => s + c.infonavit, 0);
    const totProv = pCosts.reduce((s, c) => s + c.provisiones, 0);
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
          <th style="text-align:center" title="Número de personas">Cant.</th>
          <th style="text-align:right">Sueldo Unit.</th>
          <th title="Honorarios" style="text-align:center">Hon.</th>
          <th style="text-align:right">IMSS Pat.</th>
          <th style="text-align:right">ISN</th>
          <th style="text-align:right">Infonavit</th>
          <th style="text-align:right">Provisiones</th>
          <th style="text-align:right;color:var(--cobalt)">Sueldo Total</th>
          <th style="text-align:right;color:var(--gold)">Costo Total</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${pRows}
          <tr class="tr-total">
            <td>TOTAL MENSUAL</td>
            <td></td>
            <td style="text-align:center;color:var(--cobalt)">${totPersonas}</td>
            <td></td><td></td>
            <td style="text-align:right">${M(totIMSS)}</td>
            <td style="text-align:right">${M(totISN)}</td>
            <td style="text-align:right">${M(totInfo)}</td>
            <td style="text-align:right">${M(totProv)}</td>
            <td style="text-align:right;color:var(--cobalt);font-weight:500">${M(totSueldoBruto)}</td>
            <td style="text-align:right;color:var(--gold);font-weight:500">${M(totCosto)}</td>
            <td></td>
          </tr>
        </tbody>
      </table></div>
      <div style="margin-top:10px;padding:8px 4px;border-top:1px solid var(--beige);
           font-size:11px;color:var(--oxford);opacity:.6;letter-spacing:.3px">
        Cant. = personas en el puesto · todos los costos se multiplican por Cant.
        · SDI = Sal.Diario × ${NOM_FI} · IMSS: Cuota fija + Excedente + Inv.Vida + Guard. + Retiro + Cesantía
        · Provisiones = ${((NOM_FI - 1) * 100).toFixed(2)}% (aguinaldo+prima vac) · ISN 3% · Infonavit 5% SDI
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
      const cells = Array.from({ length: YEARS }, (_, i) => {
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
          ${sumRowDirect('IMSS Patronal', (i, inf) => totIMSS * inf * annuals[i].factorNomina)}
          ${sumRowDirect('Infonavit (5% SDI)', (i, inf) => totInfo * inf * annuals[i].factorNomina)}
          ${sumRowDirect('ISN (3%)', (i, inf) => totISN * inf * annuals[i].factorNomina)}
          ${sumRowDirect('CRM / Provisiones (ley)', (i, inf) => totProv * inf * annuals[i].factorNomina)}
          ${annuals[0].asim ? sumRow('Asimilados', a => a.asim) : ''}
          ${annuals[0].fondo ? sumRow('Fondo Finiquitos', a => a.fondo) : ''}
          ${annuals[0].transicion ? sumRow('Nómina Transición (legado)', a => a.transicion) : ''}
          <tr style="opacity:.35"><td colspan="${YEARS + 1}"></td></tr>
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
        Capacidad de referencia: <input type="number" class="cell-input" value="${capNomina}" step="50" style="width:55px"
          data-key="capacidadNominaRef" data-nested="nominas"> alumnos = 100% nómina
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
      <div class="section-sub">Controlados · Fijos · Financieros · escalan con matrícula / ${cap} alumnos ref.</div>
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
      <div class="card-title">Capacidad de Referencia</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Alumnos al 100% de gasto <span>(ref.)</span></label>
          <input type="number" class="form-input" value="${cap}" step="10"
            data-key="capacidadGastoRef" data-nested="gastosOperacion">
          <span class="form-hint">Con ${cap} alumnos o más, el gasto controlado es al 100%. Con menos, escala proporcionalmente.</span>
        </div>
      </div>
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
    const corrida = calcCorrida();
    return `
    <div class="section-header">
      <div><div class="section-title">Proyección 7 Años</div>
      <div class="section-sub">Estado de Resultados Consolidado · Ciclos 1–${YEARS} (${corrida[0].ano}–${corrida[YEARS - 1].ano})</div></div>
      <button class="toggle-btn" onclick="App.exportCSV()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3 11v1.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Exportar CSV
      </button>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">Ingresos vs Egresos · 7 Años</div><div class="chart-wrap"><canvas id="chart-ingegr"></canvas></div></div>
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
      { l: 'Utilidad por Acción', fn: y => M(y.utilidadPorAccion), cls: 'num-blue' }
    ];

    const makeRow = r => {
      if (r.head) return `<tr class="tr-sub"><td colspan="${years.length + 1}" style="font-weight:500;letter-spacing:1.2px;font-size:10.5px;text-transform:uppercase;color:var(--text-muted)">${r.head}</td></tr>`;
      if (r.sep) return `<tr style="height:4px;background:var(--bg)"><td colspan="${years.length + 1}"></td></tr>`;
      const tc = r.ebitda ? 'tr-ebitda' : r.result ? 'tr-result' : '';
      return `<tr class="${tc}"><td>${r.l}</td>${corrida.map(y => `<td class="${r.cls || ''}">${r.fn(y)}</td>`).join('')}</tr>`;
    };

    return `
    <div class="card" style="overflow:hidden">
      <div class="card-title">Estado de Resultados · Ciclos 1–${YEARS}</div>
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
      legend: { labels: { color: 'rgba(156,184,212,.70)', font: { size: 10, weight: '300' }, boxWidth: 11, padding: 14 } },
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
    requestAnimationFrame(() => {
      _chartIngEgr(corrida);
      _chartEbitda(corrida);
      _chartMatricula(corrida);
      _chartPie(corrida);
    });
  }

  function _chartIngEgr(corrida) {
    const el = document.getElementById('chart-ingegr'); if (!el) return;
    chartInstances.ingegr = new Chart(el, {
      type: 'bar', data: {
        labels: corrida.map(y => y.ano),
        datasets: [
          { label: 'Ingresos', data: corrida.map(y => y.ingresoTotal), backgroundColor: CC.blueL, borderColor: CC.blueA, borderWidth: 2, borderRadius: 4 },
          { label: 'Egresos', data: corrida.map(y => y.egresoTotal), backgroundColor: 'rgba(107,63,160,.18)', borderColor: CC.red, borderWidth: 2, borderRadius: 4 }
        ]
      }, options: { ...BASE_OPTS }
    });
  }

  function _chartEbitda(corrida) {
    const el = document.getElementById('chart-ebitda'); if (!el) return;
    chartInstances.ebitda = new Chart(el, {
      type: 'bar', data: {
        labels: corrida.map(y => y.ano),
        datasets: [
          { label: 'EBITDA', data: corrida.map(y => y.ebitda), type: 'bar', backgroundColor: CC.goldL, borderColor: CC.goldA, borderWidth: 2, borderRadius: 4 },
          { label: 'Flujo Acumulado', data: corrida.map(y => y.cashAcumulado), type: 'line', borderColor: CC.green, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 4, pointBackgroundColor: CC.green }
        ]
      }, options: { ...BASE_OPTS }
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
  }

  // ============================================================
  // 17. NAVIGATION
  // ============================================================
  const VIEW_TITLES = {
    dashboard: 'Dashboard', variables: 'Variables Iniciales', matricula: 'Matriz de Alumnos',
    referencias: 'Valores de Referencia', cuotas: 'Cuotas Escolares',
    inscripciones: 'Inscripciones y Re-inscripciones',
    nominas: 'Nóminas', gastos: 'Gastos de Operación',
    corrida: 'Corrida Anual', proyeccion: 'Proyección 7 Años'
  };
  const RENDERERS = {
    dashboard: renderDashboard, variables: renderVariables, matricula: renderMatricula,
    referencias: renderReferencias, cuotas: renderCuotas, inscripciones: renderInscripciones,
    nominas: renderNominas, gastos: renderGastos, corrida: renderCorrida, proyeccion: renderProyeccion
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
    fields.forEach(([l, fn]) => { csv += `"${l}",${corrida.map(fn).join(',')}\n`; });
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
    if (!confirm(`¿Eliminar "${state.nominas.puestos[idx]?.nombre}"?`)) return;
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
    const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg;
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

  return {
    init, navigate, resetState, exportCSV, toggleSidebar, recalcular,
    addPuesto, removePuesto, toggleHonorarios
  };

})();

document.addEventListener('DOMContentLoaded', App.init);

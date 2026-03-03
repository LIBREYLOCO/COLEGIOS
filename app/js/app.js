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
    { key:'mat', label:'Maternal',             level:'Maternal',      levelKey:'maternalK1' },
    { key:'k1',  label:'Kínder 1',             level:'Kínder',        levelKey:'maternalK1' },
    { key:'k2',  label:'Kínder 2',             level:'Kínder',        levelKey:'kinder23' },
    { key:'k3',  label:'Kínder 3',             level:'Kínder',        levelKey:'kinder23' },
    { key:'p1',  label:'1ro de Primaria',      level:'Primaria',      levelKey:'primaria' },
    { key:'p2',  label:'2do de Primaria',      level:'Primaria',      levelKey:'primaria' },
    { key:'p3',  label:'3ro de Primaria',      level:'Primaria',      levelKey:'primaria' },
    { key:'p4',  label:'4to de Primaria',      level:'Primaria',      levelKey:'primaria' },
    { key:'p5',  label:'5to de Primaria',      level:'Primaria',      levelKey:'primaria' },
    { key:'p6',  label:'6to de Primaria',      level:'Primaria',      levelKey:'primaria' },
    { key:'s1',  label:'1ro de Secundaria',    level:'Secundaria',    levelKey:'secundaria' },
    { key:'s2',  label:'2do de Secundaria',    level:'Secundaria',    levelKey:'secundaria' },
    { key:'s3',  label:'3ro de Secundaria',    level:'Secundaria',    levelKey:'secundaria' },
    { key:'b1',  label:'1ro de Bachillerato',  level:'Bachillerato',  levelKey:'bachillerato' },
    { key:'b2',  label:'2do de Bachillerato',  level:'Bachillerato',  levelKey:'bachillerato' },
    { key:'b3',  label:'3ro de Bachillerato',  level:'Bachillerato',  levelKey:'bachillerato' }
  ];

  // Groups of consecutive grade-keys per level (for cascade entry-point logic)
  const LEVELS = [
    { key:'Maternal',     grades:['mat'],                     tuitionKey:'maternalK1' },
    { key:'Kínder',       grades:['k1','k2','k3'],            tuitionKey:'maternalK1' },  // K1 same tuition as Maternal
    { key:'Primaria',     grades:['p1','p2','p3','p4','p5','p6'], tuitionKey:'primaria' },
    { key:'Secundaria',   grades:['s1','s2','s3'],            tuitionKey:'secundaria' },
    { key:'Bachillerato', grades:['b1','b2','b3'],            tuitionKey:'bachillerato' }
  ];

  // Entry grades per level (get students exclusively from entradaPorNivel, no cascade feed)
  // Exception: k1 is NOT an entry grade — it cascades from mat + Kínder entrada
  const ENTRY_GRADES = new Set(['mat','p1','s1','b1']);

  // Revenue aggregation buckets  (5 tuition tiers)
  const TUITION_KEYS   = ['maternalK1','kinder23','primaria','secundaria','bachillerato'];
  const TUITION_LABELS = ['Maternal / Kínder 1','Kínder 2–3','Primaria','Secundaria','Bachillerato'];

  // Grade key → tuition bucket
  const G2T = {};
  GRADES.forEach(g => { G2T[g.key] = g.levelKey; });
  // Override K1 tuition to maternalK1 (same level price)
  G2T['k1'] = 'maternalK1';

  const YEARS     = 7;
  const ANO_INICIO = 2026;

  // ============================================================
  // 2. DEFAULT STATE
  // ============================================================
  const DEFAULTS = {
    variables: {
      terreno:              40000,
      capitalRequerido:     250000000,
      inflacion:            0.05,
      aumentoColegiatura:   0.06,
      porcentajeModelo:     0.23,
      porcentajeOperadora:  0.12,
      rentaInmuebleBase:    15000000,
      numAcciones:          250,
      costoAccion:          1000000,
      // ── New enrollment variables ──
      tasaDesercion:        0.03,    // % alumnos que no continúan al siguiente grado
      tasaCaptacion:        0.05     // crecimiento anual de nuevos ingresos externos
    },

    // ── Matrícula inicial por grado (Año 0 = 2026) ──
    // Distribución: 15 Maternal + 31 K1 + 36 K2 + 36 K3 + 54×6 Primaria + 62×2+61 Sec + 45+44×2 Bach
    // Total = 759 alumnos
    matriculaInicial: {
      mat: 15,                                            // Maternal: fijo 15 (tradicional)
      k1:  13, k2: 11, k3: 10,                          // Kinder: cascade desde Maternal
      p1:  30, p2: 26, p3: 22, p4: 19, p5: 16, p6: 14, // 1°Prim fijo 30 → cascade
      s1:  25, s2: 21, s3: 18,
      b1:  20, b2: 17, b3: 14
    },

    // ── Nuevos ingresos EXTERNOS por grado (alumnos que entran desde fuera, por año) ──
    nuevosIngresos: {
      mat: 15,         // Maternal: todos son nuevos cada año
      k1:   5, k2: 1, k3: 1,    // K1: algunos de otra escuela; K2-K3: transferencias
      p1:  10, p2: 2, p3: 2, p4: 2, p5: 2, p6: 2,
      s1:   8, s2: 2, s3: 1,
      b1:   8, b2: 2, b3: 1
    },

    // ── Deserción diferenciada por nivel (flat, legacy) ──
    desercionPorNivel: {
      Maternal:     0.05,
      'Kínder':     0.04,
      Primaria:     0.03,
      Secundaria:   0.04,
      Bachillerato: 0.05
    },

    // ── Proyección dinámica: deserción y entrada por nivel y por año (YEARS-1 valores) ──
    // entradaPorNivel[nivel][t] = alumnos que entran al grado inicial del nivel en el Año t+1
    // Para Kínder, este valor se SUMA al cascade mat→k1 (k1 no es grado de entrada independiente)
    entradaPorNivel: {
      'Maternal':     [18, 20, 22, 23, 24, 25],
      'Kínder':       [25, 27, 29, 31, 33, 35],
      'Primaria':     [62, 64, 66, 68, 70, 72],
      'Secundaria':   [65, 67, 69, 70, 72, 73],
      'Bachillerato': [48, 50, 52, 54, 56, 58]
    },
    // desercionAnual[nivel][t] = % de alumnos que no continúan al año t+1
    desercionAnual: {
      'Maternal':     [0.05, 0.05, 0.04, 0.04, 0.03, 0.03],
      'Kínder':       [0.04, 0.04, 0.04, 0.03, 0.03, 0.03],
      'Primaria':     [0.03, 0.03, 0.03, 0.03, 0.02, 0.02],
      'Secundaria':   [0.04, 0.04, 0.03, 0.03, 0.03, 0.02],
      'Bachillerato': [0.05, 0.05, 0.04, 0.04, 0.04, 0.03]
    },

    // ── Capacidad máxima por grado ──
    capacidadMaxima: {
      mat: 25,
      k1: 40, k2: 40, k3: 40,
      p1: 70, p2: 70, p3: 70, p4: 70, p5: 70, p6: 70,
      s1: 80, s2: 80, s3: 80,
      b1: 80, b2: 80, b3: 80
    },

    topeTotalAlumnos: 1155,

    // ── Modelo simplificado de matrícula ──
    tasaReinscripcion:            0.85,  // % de alumnos que se reinscriben
    tasaCrecimientoNuevoIngreso:  0.05,  // % crecimiento anual sobre reinscritos

    // ── Grados activos (false = excluir de proyección) ──
    gradosActivos: {
      mat:true,
      k1:true, k2:true, k3:true,
      p1:true, p2:true, p3:true, p4:true, p5:true, p6:true,
      s1:true, s2:true, s3:true,
      b1:true, b2:true, b3:true
    },

    // ── Aranceles (ciclo 2025–26) ──
    colegiaturas: {
      maternalK1:   5900,
      kinder23:     8200,
      primaria:    11200,
      secundaria:  12400,
      bachillerato:13100
    },
    inscripciones: {
      maternalK1:  10000,
      kinder23:    12150,
      primaria:    16500,
      secundaria:  18800,
      bachillerato:19500
    },
    cuotas: {
      maternalK1:  9232,
      kinder23:    7165,
      primaria:    7630,
      secundaria:  8001,
      bachillerato:5934
    },
    descuentos: {
      inscripcionPct:      0.1557,
      apoyosEconomicosPct: 0.0786,
      becasSepPct:         0.0500
    },

    // ── Nóminas ──
    nominas: {
      nominaCampusBase:   1509500,
      honorarios:         0,
      asimilados:         120000,
      fondoFiniquitos:    50000,
      nominaTransicion:   [2035159, 1257241, 572379, 0, 0, 0, 0],
      imssRate:           0.1890,
      infonavitRate:      0.0500,
      isrNominaRate:      0.1056,
      impEstatalRate:     0.0300,
      aguinaldoRate:      0.0417,
      primaVacacionalRate:0.0041,
      primaAntiguedadRate:0.0303
    },

    // ── Gastos de Operación ──
    gastosOperacion: {
      baseAnual:  14290066,
      transicion: [1464731, -229640, 0, 0, 0, 0, 0]
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
      const s = localStorage.getItem('lyl_state_v3');
      if (s) return JSON.parse(s);
    } catch(e) {}
    return deepCopy(DEFAULTS);
  }

  function saveState() {
    try { localStorage.setItem('lyl_state_v3', JSON.stringify(state)); } catch(e) {}
    const b = document.getElementById('save-badge');
    if (b) b.textContent = '● Guardado ' + new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
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
          merge(typeof t[k] === 'object' ? t[k] : (t[k]={}), src[k]);
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
    const rein    = state.tasaReinscripcion           ?? 0.85;
    const crec    = state.tasaCrecimientoNuevoIngreso ?? 0.05;
    const activos = state.gradosActivos || {};
    const result  = [];

    // Año 0 — base editada por el usuario
    const year0 = {};
    GRADES.forEach(g => {
      year0[g.key] = activos[g.key] === false
        ? 0 : Math.max(0, Math.round(state.matriculaInicial[g.key] || 0));
    });
    result.push({ ...year0 });

    for (let t = 1; t < YEARS; t++) {
      const prev = result[t - 1];
      const cur  = {};

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
      const total   = Object.values(cur).reduce((s, v) => s + v, 0);
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

  function calcNomina(yearIdx) {
    const inf   = Math.pow(1 + state.variables.inflacion, yearIdx);
    const base  = state.nominas.nominaCampusBase * inf;
    const asim  = state.nominas.asimilados;
    const honor = state.nominas.honorarios || 0;
    const fondo = state.nominas.fondoFiniquitos;
    const sal   = base + honor;

    const imss      = sal * state.nominas.imssRate;
    const infonavit = sal * state.nominas.infonavitRate;
    const isrNomina = sal * state.nominas.isrNominaRate;
    const impEst    = sal * state.nominas.impEstatalRate;
    const aguinaldo = sal * state.nominas.aguinaldoRate;
    const primaVac  = sal * state.nominas.primaVacacionalRate;
    const primaAnt  = sal * state.nominas.primaAntiguedadRate;
    const transicion= state.nominas.nominaTransicion[yearIdx] || 0;

    const totalMensual = sal + asim + imss + infonavit + isrNomina +
                         impEst + aguinaldo + primaVac + primaAnt +
                         fondo + transicion;

    return { base, honor, asim, fondo, transicion, imss, infonavit,
             isrNomina, impEst, aguinaldo, primaVac, primaAnt,
             totalMensual, totalAnual: totalMensual * 12 };
  }

  function calcGastos(yearIdx) {
    const inf   = Math.pow(1 + state.variables.inflacion, yearIdx + 1);
    const base  = state.gastosOperacion.baseAnual * inf;
    const trans = state.gastosOperacion.transicion[yearIdx] || 0;
    return base + trans;
  }

  function calcCorrida() {
    const matricula = calcMatricula();
    const results   = [];
    let cashAcumulado = 0;

    for (let i = 0; i < YEARS; i++) {
      const ano       = ANO_INICIO + i;
      const infFactor = Math.pow(1 + state.variables.inflacion, i);
      const colFactor = Math.pow(1 + state.variables.aumentoColegiatura, i);

      const gradeEnrollment  = matricula[i];
      const levelEnrollment  = aggregateToTuitionBuckets(gradeEnrollment);
      const totalAlumnos     = Object.values(gradeEnrollment).reduce((s,v)=>s+v, 0);

      let sumInscripciones = 0;
      let sumColegiaturas  = 0;
      let sumCuotas        = 0;

      TUITION_KEYS.forEach(lk => {
        const n = levelEnrollment[lk] || 0;
        sumInscripciones += n * (state.inscripciones[lk] || 0) * colFactor;
        sumColegiaturas  += n * (state.colegiaturas[lk]  || 0) * colFactor * 10;
        sumCuotas        += n * (state.cuotas[lk]        || 0) * colFactor;
      });

      const descInscripcion = sumInscripciones * state.descuentos.inscripcionPct;
      const apoyosEcon      = sumColegiaturas  * state.descuentos.apoyosEconomicosPct;
      const becas           = sumColegiaturas  * state.descuentos.becasSepPct;
      const ingresoTotal    = (sumInscripciones - descInscripcion) + sumColegiaturas - apoyosEcon - becas + sumCuotas;

      const nomina    = calcNomina(i);
      const gastosOp  = calcGastos(i);
      const egresoTotal = nomina.totalAnual + gastosOp;

      const subtotal      = ingresoTotal - egresoTotal;
      const operadora     = Math.max(0, subtotal) * state.variables.porcentajeOperadora;
      const rentaInmueble = state.variables.rentaInmuebleBase * infFactor;
      const ebitda        = subtotal - operadora - rentaInmueble;

      cashAcumulado += ebitda;
      const utilidadPorAccion = ebitda / (state.variables.numAcciones || 1);

      results.push({
        ano, i, infFactor, colFactor,
        gradeEnrollment, levelEnrollment, totalAlumnos,
        sumInscripciones, descInscripcion, sumColegiaturas, sumCuotas,
        apoyosEcon, becas, ingresoTotal,
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
  const MXN = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:0,maximumFractionDigits:0});
  const NUM  = new Intl.NumberFormat('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0});
  const PCT  = new Intl.NumberFormat('es-MX',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:2});

  function M(n)   { return MXN.format(n); }
  function N(n)   { return NUM.format(Math.round(n)); }
  function P(n)   { return PCT.format(n); }
  function m2M(n) { return (n/1e6).toFixed(2)+' M'; }

  function pctInput(val, key, nested) {
    return `<input type="number" class="form-input" value="${(val*100).toFixed(2)}"
      step="0.01" data-key="${key}" ${nested?`data-nested="${nested}"`:''}> <span class="form-hint">%</span>`;
  }
  function numInput(val, key, nested, step='1') {
    return `<input type="number" class="form-input" value="${val}"
      step="${step}" data-key="${key}" ${nested?`data-nested="${nested}"`:''}>`;
  }

  // ============================================================
  // 7. VIEW — DASHBOARD
  // ============================================================
  function renderDashboard() {
    const corrida = calcCorrida();
    const y1 = corrida[0], yN = corrida[corrida.length-1];

    const kpis = [
      { label:'Matrícula Año 1',       val:N(y1.totalAlumnos)+' alumnos',  sub:`Capacidad ${N(calcTopeTotal())} · ${P(y1.totalAlumnos/calcTopeTotal())}`, cls:'', accent:'accent' },
      { label:'Capital Requerido',      val:m2M(state.variables.capitalRequerido)+' MXN', sub:`${N(state.variables.numAcciones)} acciones · ${M(state.variables.costoAccion)} c/u`, cls:'gold', accent:'positive' },
      { label:'Ingresos Año 1',         val:m2M(y1.ingresoTotal),           sub:'Netos descontando becas', cls:'', accent:'positive' },
      { label:`Ingresos Año ${YEARS}`,  val:m2M(yN.ingresoTotal),           sub:`+${P(yN.ingresoTotal/y1.ingresoTotal-1)} vs Año 1`, cls:'', accent:'positive' },
      { label:`EBITDA Año ${YEARS}`,    val:m2M(yN.ebitda),                 sub:'Utilidad operativa neta', cls:'gold', accent:'positive' },
      { label:'Flujo Acumulado 7 Años', val:m2M(yN.cashAcumulado),          sub:'Dinero en bancos al cierre', cls:'cobalt', accent:'positive' }
    ];

    return `
    <div class="section-header">
      <div>
        <div class="section-title">Dashboard · Resumen Ejecutivo</div>
        <div class="section-sub">Lógica &amp; Liquidez · ${ANO_INICIO}–${ANO_INICIO+YEARS-1}</div>
      </div>
      <div class="badge badge-oxford">México · Ciclo escolar Sept–Ago</div>
    </div>

    <div class="kpi-grid">
      ${kpis.map(k=>`
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
    return `
    <div class="section-header">
      <div><div class="section-title">Variables Iniciales</div>
      <div class="section-sub">Parámetros macroeconómicos, inmobiliarios y de captación</div></div>
    </div>
    <div class="info-note">Cualquier cambio recalcula automáticamente todos los módulos y se guarda en el navegador.</div>

    <div class="card">
      <div class="card-title">Datos Inmobiliarios</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Tamaño del Terreno <span>(m²)</span></label>${numInput(v.terreno,'terreno','variables','100')}</div>
        <div class="form-group"><label class="form-label">Capital Requerido <span>(MXN)</span></label>${numInput(v.capitalRequerido,'capitalRequerido','variables','1000000')}</div>
        <div class="form-group"><label class="form-label">Renta Anual del Activo <span>(MXN, Año 0)</span></label>${numInput(v.rentaInmuebleBase,'rentaInmuebleBase','variables','100000')}<span class="form-hint">Crece con inflación año a año</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Parámetros Económicos</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Inflación Operacional <span>(%/año)</span></label>${pctInput(v.inflacion,'inflacion','variables')}<span class="form-hint">Afecta nóminas, gastos, renta del activo</span></div>
        <div class="form-group"><label class="form-label">Aumento Anual Colegiaturas <span>(%/año)</span></label>${pctInput(v.aumentoColegiatura,'aumentoColegiatura','variables')}</div>
        <div class="form-group"><label class="form-label">Comisión Operadora <span>(%)</span></label>${pctInput(v.porcentajeOperadora,'porcentajeOperadora','variables')}</div>
        <div class="form-group"><label class="form-label">Utilidad del Modelo <span>(%)</span></label>${pctInput(v.porcentajeModelo,'porcentajeModelo','variables')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Variables de Matrícula</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Tasa de Deserción Global <span>(%/año por grado)</span></label>
          ${pctInput(v.tasaDesercion,'tasaDesercion','variables')}
          <span class="form-hint">Alumnos que NO pasan al siguiente grado. Se puede ajustar por nivel en Matriz de Alumnos.</span>
        </div>
        <div class="form-group">
          <label class="form-label">Tasa de Crecimiento de Captación <span>(%/año)</span></label>
          ${pctInput(v.tasaCaptacion,'tasaCaptacion','variables')}
          <span class="form-hint">Crecimiento anual de los alumnos nuevos que ingresan desde afuera.</span>
        </div>
        <div class="form-group">
          <label class="form-label">Capacidad Total Instalada <span>(suma por grado)</span></label>
          <div style="padding:9px 2px;border-bottom:2px solid var(--beige);color:var(--gold);font-weight:400;font-size:15px;font-variant-numeric:tabular-nums">${N(calcTopeTotal())}</div>
          <span class="form-hint">Se calcula automáticamente como la suma de las capacidades por grado (Matriz de Alumnos).</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Estructura Accionaria</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Número de Acciones</label>${numInput(v.numAcciones,'numAcciones','variables','1')}</div>
        <div class="form-group"><label class="form-label">Costo por Acción <span>(MXN)</span></label>${numInput(v.costoAccion,'costoAccion','variables','100000')}</div>
        <div class="form-group"><label class="form-label">Capital Total Accionario</label>
          <div style="padding:8px 0;border-bottom:1px solid var(--beige);color:var(--gold);font-weight:300;font-size:13px;">
            ${M(v.numAcciones * v.costoAccion)}</div>
        </div>
      </div>
    </div>`;
  }

  // ============================================================
  // 9. VIEW — MATRIZ DE ALUMNOS INTELIGENTE
  // ============================================================
  function renderMatricula() {
    const matricula = calcMatricula();
    const allYears  = Array.from({length:YEARS}, (_,i) => ANO_INICIO+i);

    // ── Detect any overpopulation cells ──
    let hasOverpop = false;
    GRADES.forEach(g => {
      const cap = state.capacidadMaxima[g.key] || Infinity;
      for (let t = 1; t < YEARS; t++) {
        if ((matricula[t][g.key] || 0) >= cap * 1.05) { hasOverpop = true; }
      }
    });

    const rein    = state.tasaReinscripcion           ?? 0.85;
    const crec    = state.tasaCrecimientoNuevoIngreso ?? 0.05;
    const activos = state.gradosActivos || {};
    const topeEsc = calcTopeTotal();

    // ── Totales por año (sólo grados activos) ──
    const grandTotals = matricula.map(yr =>
      GRADES.filter(g => activos[g.key] !== false).reduce((s,g) => s + (yr[g.key]||0), 0));

    // ── NI = suma grados ENTRADA activos · Reinscritos = suma grados CASCADE activos ──
    const niRow = matricula.map(yr =>
      GRADES.filter(g => ENTRY_GRADES.has(g.key) && activos[g.key] !== false)
            .reduce((s,g) => s + (yr[g.key]||0), 0));
    const reinscritosRow = matricula.map(yr =>
      GRADES.filter(g => !ENTRY_GRADES.has(g.key) && activos[g.key] !== false)
            .reduce((s,g) => s + (yr[g.key]||0), 0));

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
        const cap    = state.capacidadMaxima[g.key] || Infinity;

        const yearCells = matricula.map((yr, t) => {
          const n = yr[g.key] || 0;
          if (t === 0) {
            return `<td class="col-year-0" style="${!activo?'opacity:.3':''}">
              <input type="number" class="cell-input" value="${n}" step="1"
                data-mat-grade="${g.key}" style="width:56px" ${!activo?'disabled':''}></td>`;
          }
          if (!activo) return `<td style="opacity:.3;color:var(--text-faint)">—</td>`;
          const isOverpop = n >= cap * 1.05;
          const isHigh    = !isOverpop && n > (state.matriculaInicial[g.key] || 0) && esEntrada;
          const cls = isOverpop ? 'num-negative overpop-cell' : isHigh ? 'enroll-high' : '';
          const icon = isOverpop ? ' <span class="overpop-icon" title="Sobrepoblación">⚠</span>' : '';
          return `<td class="${cls}">${N(n)}${icon}</td>`;
        }).join('');

        const esEntrada = ENTRY_GRADES.has(g.key);
        tableBody += `<tr style="${!activo?'opacity:.55':''}">
          <td style="padding-left:6px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" data-toggle-grade="${g.key}" ${activo?'checked':''}
                style="accent-color:var(--cobalt);cursor:pointer;width:13px;height:13px;flex-shrink:0">
              <span>${g.label}</span>
              ${esEntrada && activo ? '<span style="font-size:9px;color:var(--cobalt);opacity:.8;margin-left:2px">↑</span>' : ''}
            </label>
          </td>
          <td><input type="number" class="cell-input" value="${cap === Infinity ? 0 : cap}" step="5" min="0"
            data-key="${g.key}" data-cap-grade="true"
            style="width:56px;text-align:right;font-size:11px;color:var(--text-muted)"
            ${!activo?'disabled':''}></td>
          ${yearCells}
        </tr>`;
      });

      // Subtotal nivel — sólo grados activos
      const levelTotals = matricula.map(yr =>
        grades.filter(g => activos[g.key] !== false).reduce((s,g) => s+(yr[g.key]||0), 0));
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
      ${grandTotals.map(t => `<td>${P(t/topeEsc)}</td>`).join('')}
    </tr>`;

    return `
    <div class="section-header">
      <div>
        <div class="section-title">Matriz de Alumnos</div>
        <div class="section-sub">${ANO_INICIO}–${ANO_INICIO+YEARS-1}
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
          ${pctInput(rein,'tasaReinscripcion')}
          <span class="form-hint">Ej. 85% → de 20 alumnos, 17 se reinscriben.</span>
        </div>
        <div class="form-group">
          <label class="form-label">% Crecimiento <span>(nuevo ingreso sobre reinscritos)</span></label>
          ${pctInput(crec,'tasaCrecimientoNuevoIngreso')}
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
      <div class="card-title">Proyección de Matrícula · ${ANO_INICIO}–${ANO_INICIO+YEARS-1}
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
              ${allYears.map((y,i)=>`<th class="${i===0?'col-year-0':''}">${y}</th>`).join('')}
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
    const ins = state.inscripciones;
    const cuotas = state.cuotas;
    const desc = state.descuentos;

    const rows = TUITION_KEYS.map((lk, i) => `
      <tr>
        <td>${TUITION_LABELS[i]}</td>
        <td><input type="number" class="cell-input" value="${ins[lk]}"   data-ref-type="inscripciones" data-ref-grade="${lk}"></td>
        <td><input type="number" class="cell-input" value="${c[lk]}"     data-ref-type="colegiaturas"  data-ref-grade="${lk}"></td>
        <td>${M(c[lk] * (1+state.variables.aumentoColegiatura))}</td>
        <td><input type="number" class="cell-input" value="${cuotas[lk]}" data-ref-type="cuotas"       data-ref-grade="${lk}"></td>
        <td>${M(ins[lk] * (1-desc.inscripcionPct))}</td>
      </tr>`).join('');

    return `
    <div class="section-header"><div>
      <div class="section-title">Valores de Referencia</div>
      <div class="section-sub">Colegiaturas, inscripciones y cuotas por nivel académico · Ciclo 2025–26</div>
    </div></div>

    <div class="card">
      <div class="card-title">Aranceles por Nivel</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nivel</th>
            <th>Inscripción (MXN)</th>
            <th>Colegiatura/mes (MXN)</th>
            <th>Colegiatura Año 2 (+${P(state.variables.aumentoColegiatura)})</th>
            <th>Cuotas Anuales (MXN)</th>
            <th>Inscripción Neta*</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="form-hint mt-8">* Inscripción neta = bruta × (1 − ${P(desc.inscripcionPct)} descuento promedio)</div>
    </div>

    <div class="card">
      <div class="card-title">Descuentos y Apoyos</div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Descuento prom. Inscripciones</label>${pctInput(desc.inscripcionPct,'inscripcionPct','descuentos')}<span class="form-hint">Becas, cortesías, maestros</span></div>
        <div class="form-group"><label class="form-label">Apoyos Económicos</label>${pctInput(desc.apoyosEconomicosPct,'apoyosEconomicosPct','descuentos')}<span class="form-hint">% sobre total colegiaturas</span></div>
        <div class="form-group"><label class="form-label">Becas SEP + Maestros + Socios</label>${pctInput(desc.becasSepPct,'becasSepPct','descuentos')}<span class="form-hint">% sobre total colegiaturas</span></div>
      </div>
    </div>`;
  }

  // ============================================================
  // 11. VIEW — CUOTAS ESCOLARES
  // ============================================================
  function renderCuotas() {
    const corrida = calcCorrida();
    const years = Array.from({length:YEARS},(_,i)=>ANO_INICIO+i);

    const rows = TUITION_KEYS.map((lk, i) => {
      const cells = corrida.map(yr => {
        const n = yr.levelEnrollment[lk] || 0;
        return `<td>${M(n * (state.cuotas[lk]||0) * yr.colFactor)}</td>`;
      }).join('');
      return `<tr><td>${TUITION_LABELS[i]}</td>${cells}</tr>`;
    }).join('');

    const totales = `<tr class="tr-total"><td>TOTAL CUOTAS</td>${corrida.map(yr=>`<td>${M(yr.sumCuotas)}</td>`).join('')}</tr>`;

    return `
    <div class="section-header"><div>
      <div class="section-title">Cuotas Escolares</div>
      <div class="section-sub">Ingresos anuales por cuotas (material didáctico, uniformes, seguros)</div>
    </div></div>

    <div class="card">
      <div class="card-title">Cuota Anual por Nivel <span class="form-hint">(MXN/alumno/año)</span></div>
      <div class="form-grid" style="margin-bottom:18px">
        ${TUITION_KEYS.map((lk,i)=>`
          <div class="form-group">
            <label class="form-label">${TUITION_LABELS[i]}</label>
            <input type="number" class="form-input" value="${state.cuotas[lk]}" step="10"
              data-ref-type="cuotas" data-ref-grade="${lk}">
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Proyección de Ingresos por Cuotas (MXN)</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nivel</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead>
          <tbody>${rows}${totales}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 12. VIEW — NÓMINAS
  // ============================================================
  function renderNominas() {
    const nom = state.nominas;
    const nomY1 = calcNomina(0);
    const years = Array.from({length:YEARS},(_,i)=>ANO_INICIO+i);
    const annuals = Array.from({length:YEARS},(_,i)=>calcNomina(i));

    const obligations = [
      ['IMSS Cuota Patronal (~18.9% s/nómina)',       nomY1.imss],
      ['Infonavit (5% s/nómina)',                     nomY1.infonavit],
      ['ISR Nómina – Retención (~10.6%)',              nomY1.isrNomina],
      ['Impuesto Estatal s/Nómina (ISN ~3%)',          nomY1.impEst],
      ['Aguinaldo (15 días/360)',                      nomY1.aguinaldo],
      ['Prima Vacacional (~0.41%)',                    nomY1.primaVac],
      ['Prima de Antigüedad (~3.03%)',                 nomY1.primaAnt]
    ].map(([l,v])=>`<div class="obligation-row"><span class="obligation-name">${l}</span><span class="obligation-amount">${M(v)}/mes</span></div>`).join('');

    const nRows = [
      ['Nómina Campus (base)',        d=>M(d.base)],
      ['Asimilados',                  d=>M(d.asim)],
      ['Honorarios',                  d=>M(d.honor)],
      ['IMSS',                        d=>M(d.imss)],
      ['Infonavit',                   d=>M(d.infonavit)],
      ['ISR Nómina',                  d=>M(d.isrNomina)],
      ['Impuesto Estatal Nómina',     d=>M(d.impEst)],
      ['Aguinaldo',                   d=>M(d.aguinaldo)],
      ['Prima Vacacional',            d=>M(d.primaVac)],
      ['Prima de Antigüedad',         d=>M(d.primaAnt)],
      ['Fondo Finiquitos',            d=>M(d.fondo)],
      ['Nómina Transición (legado)',  d=>M(d.transicion)]
    ].map(([l,fn])=>`<tr><td>${l}</td>${annuals.map(a=>`<td>${fn(a)}</td>`).join('')}</tr>`).join('');

    const totalRow = `<tr class="tr-total"><td>TOTAL ANUAL</td>${annuals.map(a=>`<td>${M(a.totalAnual)}</td>`).join('')}</tr>`;

    const transInputs = nom.nominaTransicion.map((v,i)=>`
      <div class="form-group">
        <label class="form-label">Año ${i+1} (${ANO_INICIO+i}) <span>MXN/mes</span></label>
        <input type="number" class="form-input" value="${v}" step="10000"
          data-key="nominaTransicion" data-transicion-idx="${i}" data-nested="nominas">
      </div>`).join('');

    return `
    <div class="section-header"><div>
      <div class="section-title">Nóminas</div>
      <div class="section-sub">Sueldos y obligaciones patronales · Normativa México 2025</div>
    </div></div>

    <div class="info-note">Cálculos de prestaciones de ley: IMSS, Infonavit, ISN, aguinaldo, prima vacacional, prima de antigüedad y fondo de finiquitos.</div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Nómina Base (Mensual)</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Nómina Campus <span>(MXN/mes)</span></label><input type="number" class="form-input" value="${nom.nominaCampusBase}" step="1000" data-key="nominaCampusBase" data-nested="nominas"></div>
          <div class="form-group"><label class="form-label">Asimilados <span>(MXN/mes)</span></label><input type="number" class="form-input" value="${nom.asimilados}" step="1000" data-key="asimilados" data-nested="nominas"></div>
          <div class="form-group"><label class="form-label">Honorarios <span>(MXN/mes)</span></label><input type="number" class="form-input" value="${nom.honorarios}" step="1000" data-key="honorarios" data-nested="nominas"></div>
          <div class="form-group"><label class="form-label">Fondo Finiquitos <span>(MXN/mes)</span></label><input type="number" class="form-input" value="${nom.fondoFiniquitos}" step="1000" data-key="fondoFiniquitos" data-nested="nominas"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Obligaciones Patronales · Año 1 (Mensual)</div>
        ${obligations}
        <div class="divider"></div>
        <div class="payroll-item total"><span class="payroll-item-label">TOTAL MENSUAL</span><span class="payroll-item-value">${M(nomY1.totalMensual)}</span></div>
        <div class="payroll-item total"><span class="payroll-item-label">TOTAL ANUAL</span><span class="payroll-item-value">${M(nomY1.totalAnual)}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Tasas de Obligaciones Patronales</div>
      <div class="rates-grid">
        ${[['IMSS','imssRate'],['Infonavit','infonavitRate'],['ISR Nómina','isrNominaRate'],['Imp. Estatal','impEstatalRate'],['Aguinaldo','aguinaldoRate'],['Prima Vacacional','primaVacacionalRate'],['Prima Antigüedad','primaAntiguedadRate']].map(([l,k])=>`
          <div class="form-group"><label class="form-label">${l}</label>${pctInput(nom[k],k,'nominas')}</div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Nómina de Transición (Legado · Mensual)</div>
      <div class="form-hint mb-8">Nómina del colegio existente absorbida durante los primeros años.</div>
      <div class="form-grid">${transInputs}</div>
    </div>

    <div class="card">
      <div class="card-title">Proyección Nómina Total Anual</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Concepto</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead>
          <tbody>${nRows}${totalRow}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 13. VIEW — GASTOS DE OPERACIÓN
  // ============================================================
  function renderGastos() {
    const go = state.gastosOperacion;
    const years = Array.from({length:YEARS},(_,i)=>ANO_INICIO+i);
    const annuals = Array.from({length:YEARS},(_,i)=>calcGastos(i));

    const transInputs = go.transicion.map((v,i)=>`
      <div class="form-group">
        <label class="form-label">Año ${i+1} (${ANO_INICIO+i}) <span>ajuste MXN</span></label>
        <input type="number" class="form-input" value="${v}" step="10000"
          data-key="transicion" data-go-idx="${i}" data-nested="gastosOperacion">
      </div>`).join('');

    const gastosCat = [
      {l:'Arrendamiento / Renta',p:.28},{l:'Servicios (agua, luz, telefonía)',p:.12},
      {l:'Mantenimiento preventivo/correctivo',p:.10},{l:'Seguros institucionales',p:.08},
      {l:'Capacitación y desarrollo',p:.07},{l:'Materiales y suministros',p:.10},
      {l:'Eventos y captación',p:.08},{l:'Impresos y papelería',p:.06},
      {l:'Otros controlados',p:.11}
    ];

    const gastosRows = gastosCat.map(f=>`
      <tr><td>${f.l}</td><td>${P(f.p)}</td>${annuals.map(a=>`<td>${M(a*f.p)}</td>`).join('')}</tr>`).join('');
    const totalRow = `<tr class="tr-total"><td>TOTAL OPERACIÓN</td><td>100%</td>${annuals.map(a=>`<td>${M(a)}</td>`).join('')}</tr>`;

    return `
    <div class="section-header"><div>
      <div class="section-title">Gastos de Operación</div>
      <div class="section-sub">Costos fijos y controlados del campus</div>
    </div></div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Base Anual de Gastos</div>
        <div class="form-group">
          <label class="form-label">Gasto Operación Base Año 0 <span>(MXN/año)</span></label>
          <input type="number" class="form-input" value="${go.baseAnual}" step="100000" data-key="baseAnual" data-nested="gastosOperacion">
          <span class="form-hint">Crece +${P(state.variables.inflacion)}/año</span>
        </div>
        <div class="divider"></div>
        ${years.map((y,i)=>`<div class="payroll-item"><span class="payroll-item-label">${y}</span><span class="payroll-item-value">${M(annuals[i])}</span></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">Ajuste de Transición (Gastos Legacy)</div>
        <div class="form-hint mb-8">Ajuste ± sobre la base para migración de contratos y legacy costs.</div>
        <div class="form-grid">${transInputs}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Desglose Estimado por Categoría</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Categoría</th><th>%</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead>
          <tbody>${gastosRows}${totalRow}</tbody>
        </table>
      </div>
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
      const breakdown = TUITION_KEYS.map((lk,i)=>{
        const n   = yr.levelEnrollment[lk] || 0;
        const ins = (state.inscripciones[lk]||0) * yr.colFactor * (1-state.descuentos.inscripcionPct);
        const col = (state.colegiaturas[lk]||0)  * yr.colFactor * 10;
        const cuota = (state.cuotas[lk]||0)      * yr.colFactor;
        return `<tr>
          <td>${TUITION_LABELS[i]}</td>
          <td>${N(n)}</td>
          <td>${M((state.inscripciones[lk]||0)*yr.colFactor)}</td>
          <td>${M(n*ins)}</td>
          <td>${M((state.colegiaturas[lk]||0)*yr.colFactor)}</td>
          <td>${M(n*col)}</td>
          <td>${M(n*cuota)}</td>
          <td class="num-gold">${M(n*(ins+col+cuota))}</td>
        </tr>`;
      }).join('');

      html += `
      <div class="card" style="margin-bottom:22px">
        <div class="corrida-year-header">
          <span class="corrida-year-num">${yr.ano}</span>
          <span class="corrida-year-label">· ${N(yr.totalAlumnos)} alumnos · ${P(yr.totalAlumnos/calcTopeTotal())} capacidad</span>
          <span class="badge ${yr.ebitda>=0?'badge-green':'badge-red'}" style="margin-left:auto">EBITDA ${M(yr.ebitda)}</span>
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
              <tr class="tr-total"><td>TOTAL</td><td>${N(yr.totalAlumnos)}</td><td>—</td><td>${M(yr.sumInscripciones)}</td><td>—</td><td>${M(yr.sumColegiaturas)}</td><td>${M(yr.sumCuotas)}</td><td>${M(yr.ingresoTotal+yr.apoyosEcon+yr.becas+yr.descInscripcion)}</td></tr>
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
      <div class="section-sub">Estado de Resultados Consolidado ${ANO_INICIO}–${ANO_INICIO+YEARS-1}</div></div>
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
    const years = corrida.map(y=>y.ano);
    const rows = [
      { l:'Matrícula Total (alumnos)',     fn:y=>N(y.totalAlumnos), cls:'' },
      { sep:true },
      { head:'INGRESOS' },
      { l:'Inscripciones Netas',           fn:y=>M(y.sumInscripciones-y.descInscripcion) },
      { l:'Total Colegiaturas',            fn:y=>M(y.sumColegiaturas) },
      { l:'Cuotas Escolares',              fn:y=>M(y.sumCuotas) },
      { l:'Apoyos Económicos',             fn:y=>M(-y.apoyosEcon), cls:'num-negative' },
      { l:'Becas SEP / Maestros',          fn:y=>M(-y.becas),      cls:'num-negative' },
      { l:'TOTAL INGRESOS',                fn:y=>M(y.ingresoTotal), result:true },
      { sep:true },
      { head:'EGRESOS' },
      { l:'Nómina Total',                  fn:y=>M(y.nomina.totalAnual), cls:'num-negative' },
      { l:'Gastos de Operación',           fn:y=>M(y.gastosOp),          cls:'num-negative' },
      { l:'TOTAL EGRESOS',                 fn:y=>M(y.egresoTotal),        result:true },
      { sep:true },
      { l:'RESULTADO OPERATIVO',           fn:y=>M(y.subtotal),  ebitda:true },
      { l:'Comisión Operadora',            fn:y=>M(-y.operadora), cls:'num-negative' },
      { l:'Renta del Activo Inmobiliario', fn:y=>M(-y.rentaInmueble), cls:'num-negative' },
      { l:'EBITDA',                        fn:y=>M(y.ebitda), ebitda:true },
      { sep:true },
      { l:'Flujo Acumulado (Bancos)',       fn:y=>M(y.cashAcumulado), cls:'num-gold' },
      { l:'Utilidad por Acción',           fn:y=>M(y.utilidadPorAccion), cls:'num-blue' }
    ];

    const makeRow = r => {
      if (r.head) return `<tr class="tr-sub"><td colspan="${years.length+1}" style="font-weight:500;letter-spacing:1.2px;font-size:10.5px;text-transform:uppercase;color:var(--text-muted)">${r.head}</td></tr>`;
      if (r.sep)  return `<tr style="height:4px;background:var(--bg)"><td colspan="${years.length+1}"></td></tr>`;
      const tc = r.ebitda ? 'tr-ebitda' : r.result ? 'tr-result' : '';
      return `<tr class="${tc}"><td>${r.l}</td>${corrida.map(y=>`<td class="${r.cls||''}">${r.fn(y)}</td>`).join('')}</tr>`;
    };

    return `
    <div class="card" style="overflow:hidden">
      <div class="card-title">Estado de Resultados · ${ANO_INICIO}–${ANO_INICIO+YEARS-1}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Concepto</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(makeRow).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ============================================================
  // 16. CHARTS
  // ============================================================
  function destroyCharts() {
    Object.values(chartInstances).forEach(c => { if(c) c.destroy(); });
    chartInstances = {};
  }

  const CC = {
    blue:    '#4A9FFF',  blueA:  'rgba(74,159,255,.75)',  blueL: 'rgba(74,159,255,.14)',
    gold:    '#E5BC35',  goldA:  'rgba(229,188,53,.85)',   goldL: 'rgba(229,188,53,.14)',
    cobalt:  '#2A70CC',
    green:   'rgba(229,188,53,.90)',
    red:     'rgba(168,127,216,.85)',
    grades:  ['rgba(74,159,255,.80)','rgba(229,188,53,.80)','rgba(168,127,216,.75)','rgba(42,112,204,.70)','rgba(229,188,53,.50)']
  };

  const BASE_OPTS = {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{ labels:{ color:'rgba(156,184,212,.70)', font:{size:10,weight:'300'}, boxWidth:11, padding:14 }},
      tooltip:{
        backgroundColor:'rgba(8,21,40,.97)', borderColor:'rgba(255,255,255,.12)', borderWidth:1,
        titleColor:'rgba(220,233,245,.95)', bodyColor:'rgba(154,184,212,.90)', padding:9,
        callbacks:{ label: ctx => {
          const v = ctx.raw;
          return typeof v==='number' && Math.abs(v)>1000
            ? ` ${ctx.dataset.label}: ${MXN.format(v)}`
            : ` ${ctx.dataset.label}: ${v}`;
        }}
      }
    },
    scales:{
      x:{ ticks:{color:'rgba(94,130,164,.70)',font:{size:9.5}}, grid:{color:'rgba(255,255,255,.06)'} },
      y:{ ticks:{color:'rgba(94,130,164,.70)',font:{size:9.5},
        callback: v => Math.abs(v)>=1e6 ? (v/1e6).toFixed(0)+' M' : NUM.format(v)
      }, grid:{color:'rgba(255,255,255,.06)'} }
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
    const el = document.getElementById('chart-ingegr'); if(!el) return;
    chartInstances.ingegr = new Chart(el, { type:'bar', data:{
      labels: corrida.map(y=>y.ano),
      datasets:[
        { label:'Ingresos', data:corrida.map(y=>y.ingresoTotal), backgroundColor:CC.blueL, borderColor:CC.blueA, borderWidth:2, borderRadius:4 },
        { label:'Egresos',  data:corrida.map(y=>y.egresoTotal),  backgroundColor:'rgba(107,63,160,.18)', borderColor:CC.red, borderWidth:2, borderRadius:4 }
      ]}, options:{...BASE_OPTS} });
  }

  function _chartEbitda(corrida) {
    const el = document.getElementById('chart-ebitda'); if(!el) return;
    chartInstances.ebitda = new Chart(el, { type:'bar', data:{
      labels: corrida.map(y=>y.ano),
      datasets:[
        { label:'EBITDA', data:corrida.map(y=>y.ebitda), type:'bar', backgroundColor:CC.goldL, borderColor:CC.goldA, borderWidth:2, borderRadius:4 },
        { label:'Flujo Acumulado', data:corrida.map(y=>y.cashAcumulado), type:'line', borderColor:CC.green, backgroundColor:'transparent', borderWidth:2, pointRadius:4, pointBackgroundColor:CC.green }
      ]}, options:{...BASE_OPTS} });
  }

  function _chartMatricula(corrida) {
    const el = document.getElementById('chart-matricula'); if(!el) return;
    chartInstances.matricula = new Chart(el, { type:'bar', data:{
      labels: corrida.map(y=>y.ano),
      datasets: LEVELS.map((lv,i) => ({
        label: lv.key,
        data: corrida.map(yr => lv.grades.reduce((s,g)=>s+(yr.gradeEnrollment[g]||0),0)),
        backgroundColor: CC.grades[i], borderWidth:0, borderRadius:2, stack:'m'
      }))}, options:{...BASE_OPTS, scales:{
        x:{...BASE_OPTS.scales.x, stacked:true},
        y:{...BASE_OPTS.scales.y, stacked:true, ticks:{...BASE_OPTS.scales.y.ticks, callback:v=>N(v)}}
      }} });
  }

  function _chartPie(corrida) {
    const el = document.getElementById('chart-pie'); if(!el) return;
    const yr = corrida[0];
    chartInstances.pie = new Chart(el, { type:'doughnut', data:{
      labels:['Inscripciones','Colegiaturas','Cuotas'],
      datasets:[{ data:[yr.sumInscripciones-yr.descInscripcion, yr.sumColegiaturas-yr.apoyosEcon-yr.becas, yr.sumCuotas],
        backgroundColor:[CC.blueA, CC.goldA, CC.cobalt], borderColor:'#FFFFFF', borderWidth:3 }]
    }, options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'right', labels:{color:'rgba(0,33,71,.65)',font:{size:10},padding:12,boxWidth:12} },
        tooltip:{ ...BASE_OPTS.plugins.tooltip, callbacks:{ label: ctx => {
          const t = ctx.dataset.data.reduce((a,b)=>a+b,0);
          return ` ${ctx.label}: ${M(ctx.raw)} (${(ctx.raw/t*100).toFixed(1)}%)`;
        }}}
      }
    }});
  }

  // ============================================================
  // 17. NAVIGATION
  // ============================================================
  const VIEW_TITLES = {
    dashboard:'Dashboard', variables:'Variables Iniciales', matricula:'Matriz de Alumnos',
    referencias:'Valores de Referencia', cuotas:'Cuotas Escolares', nominas:'Nóminas',
    gastos:'Gastos de Operación', corrida:'Corrida Anual', proyeccion:'Proyección 7 Años'
  };
  const RENDERERS = {
    dashboard:renderDashboard, variables:renderVariables, matricula:renderMatricula,
    referencias:renderReferencias, cuotas:renderCuotas, nominas:renderNominas,
    gastos:renderGastos, corrida:renderCorrida, proyeccion:renderProyeccion
  };

  function navigate(view) {
    if (!RENDERERS[view]) view = 'dashboard';
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view===view));
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
      el.addEventListener('input',  debounce(handleInput, 450));
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
    const raw = parseFloat(el.value);
    if (isNaN(raw)) return;

    // Enrollment matrix — initial per grade
    if (el.dataset.matGrade) { state.matriculaInicial[el.dataset.matGrade] = raw; return scheduleUpdate(); }

    // Nuevos ingresos per grade (legacy)
    if (el.dataset.nuevosGrade) { state.nuevosIngresos[el.dataset.nuevosGrade] = raw; return scheduleUpdate(); }

    // Deserción por nivel (legacy flat)
    if (el.dataset.desNivel) { state.desercionPorNivel[el.dataset.key] = raw/100; return scheduleUpdate(); }

    // Capacity per grade
    if (el.dataset.capGrade) { state.capacidadMaxima[el.dataset.key] = raw; return scheduleUpdate(); }

    // ── NEW: per-level per-year entrada ──
    if (el.dataset.entradaNivel !== undefined) {
      const nivel = el.dataset.entradaNivel;
      const idx   = +el.dataset.yrIdx;
      if (!state.entradaPorNivel[nivel]) state.entradaPorNivel[nivel] = [];
      state.entradaPorNivel[nivel][idx] = raw;
      return scheduleUpdate();
    }

    // ── NEW: per-level per-year deserción anual ──
    if (el.dataset.desercionAnual !== undefined) {
      const nivel = el.dataset.desercionAnual;
      const idx   = +el.dataset.yrIdx;
      if (!state.desercionAnual[nivel]) state.desercionAnual[nivel] = [];
      state.desercionAnual[nivel][idx] = raw / 100;
      return scheduleUpdate();
    }

    // Transition arrays
    if (el.dataset.key==='nominaTransicion' && el.dataset.transicionIdx!==undefined)
      { state.nominas.nominaTransicion[+el.dataset.transicionIdx]=raw; return scheduleUpdate(); }
    if (el.dataset.key==='transicion' && el.dataset.goIdx!==undefined)
      { state.gastosOperacion.transicion[+el.dataset.goIdx]=raw; return scheduleUpdate(); }

    // Ref tables
    if (el.dataset.refType && el.dataset.refGrade)
      { state[el.dataset.refType][el.dataset.refGrade]=raw; return scheduleUpdate(); }

    // Generic (key + optional nested)
    const key = el.dataset.key; if (!key) return;
    const nested = el.dataset.nested;
    const PCT_KEYS = ['Rate','Pct','inflacion','aumentoColegiatura','porcentajeModelo',
      'porcentajeOperadora','tasaDesercion','tasaCaptacion',
      'tasaReinscripcion','tasaCrecimientoNuevoIngreso'];
    const isPct = PCT_KEYS.some(p => key.endsWith(p) || key===p);
    const val = isPct ? raw/100 : raw;

    if (nested) { if(!state[nested]) state[nested]={}; state[nested][key]=val; }
    else { state[key]=val; }
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
    const years = corrida.map(y=>y.ano);
    const BOM = '\uFEFF';
    const fields = [
      ['Año',                        y=>y.ano],
      ['Total Alumnos',              y=>Math.round(y.totalAlumnos)],
      ['Inscripciones Brutas',       y=>Math.round(y.sumInscripciones)],
      ['Desc. Inscripciones',        y=>-Math.round(y.descInscripcion)],
      ['Colegiaturas Brutas',        y=>Math.round(y.sumColegiaturas)],
      ['Apoyos Economicos',          y=>-Math.round(y.apoyosEcon)],
      ['Becas SEP/Maestros',         y=>-Math.round(y.becas)],
      ['Cuotas Escolares',           y=>Math.round(y.sumCuotas)],
      ['TOTAL INGRESOS',             y=>Math.round(y.ingresoTotal)],
      ['Nomina Total',               y=>Math.round(y.nomina.totalAnual)],
      ['Gastos de Operacion',        y=>Math.round(y.gastosOp)],
      ['TOTAL EGRESOS',              y=>Math.round(y.egresoTotal)],
      ['Subtotal Operativo',         y=>Math.round(y.subtotal)],
      ['Comision Operadora',         y=>-Math.round(y.operadora)],
      ['Renta Activo Inmobiliario',  y=>-Math.round(y.rentaInmueble)],
      ['EBITDA',                     y=>Math.round(y.ebitda)],
      ['Flujo Acumulado',            y=>Math.round(y.cashAcumulado)],
      ['Utilidad por Accion',        y=>Math.round(y.utilidadPorAccion)]
    ];
    let csv = BOM + 'Concepto,' + years.join(',') + '\n';
    fields.forEach(([l,fn]) => { csv += `"${l}",${corrida.map(fn).join(',')}\n`; });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `LyL_Corrida_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast('CSV exportado', 'success');
  }

  // ============================================================
  // 20. UTILS + INIT
  // ============================================================
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('app-layout')?.classList.toggle('sidebar-collapsed', !sidebarOpen);
  }
  function toast(msg, type='') {
    const c = document.getElementById('toast-container'); if(!c) return;
    const el = document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg;
    c.appendChild(el); setTimeout(()=>el.remove(), 3000);
  }
  function debounce(fn, d) { let t; return function(...a) { clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),d); }; }

  function init() {
    state = patchState(loadState());
    document.querySelectorAll('.nav-item[data-view]').forEach(el =>
      el.addEventListener('click', () => navigate(el.dataset.view)));
    navigate('dashboard');
  }

  function recalcular() { softRefresh(); toast('Proyección actualizada', 'success'); }

  return { init, navigate, resetState, exportCSV, toggleSidebar, recalcular };

})();

document.addEventListener('DOMContentLoaded', App.init);

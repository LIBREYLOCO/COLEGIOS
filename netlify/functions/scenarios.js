// Netlify Function — almacenamiento de escenarios guardados en Netlify Blobs
// Reemplaza localStorage para que los escenarios estén disponibles desde cualquier máquina.
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'lil-scenarios';
const KEY = 'all';
const MAX_SCENARIOS = 20;

exports.handler = async function (event) {
  let store;
  try {
    store = getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch (e) {
    return err(500, 'Blobs no disponible: ' + e.message);
  }

  try {
    if (event.httpMethod === 'GET') {
      const list = (await store.get(KEY, { type: 'json' })) || [];
      return ok({ scenarios: list });
    }

    if (event.httpMethod === 'POST') {
      const body = parseJSON(event.body);
      if (!body || !body.scenario) return err(400, 'Falta scenario');
      const sc = sanitizeScenario(body.scenario);
      if (!sc) return err(400, 'Escenario inválido');
      const list = (await store.get(KEY, { type: 'json' })) || [];
      const updated = [sc, ...list].slice(0, MAX_SCENARIOS);
      await store.setJSON(KEY, updated);
      return ok({ scenarios: updated });
    }

    if (event.httpMethod === 'DELETE') {
      const body = parseJSON(event.body) || {};
      const ts = Number(body.ts);
      if (!ts) return err(400, 'Falta ts');
      const list = (await store.get(KEY, { type: 'json' })) || [];
      const updated = list.filter(s => Number(s.ts) !== ts);
      await store.setJSON(KEY, updated);
      return ok({ scenarios: updated });
    }

    if (event.httpMethod === 'PUT') {
      const body = parseJSON(event.body) || {};
      const list = Array.isArray(body.scenarios) ? body.scenarios : null;
      if (!list) return err(400, 'Falta scenarios[]');
      const sanitized = list.map(sanitizeScenario).filter(Boolean).slice(0, MAX_SCENARIOS);
      await store.setJSON(KEY, sanitized);
      return ok({ scenarios: sanitized });
    }

    return err(405, 'Método no permitido');
  } catch (e) {
    return err(500, e.message || 'Error interno');
  }
};

function sanitizeScenario(sc) {
  if (!sc || typeof sc !== 'object') return null;
  if (!sc.name || !sc.state) return null;
  return {
    name: String(sc.name).slice(0, 200),
    ts: Number(sc.ts) || Date.now(),
    state: sc.state
  };
}

function parseJSON(s) { try { return JSON.parse(s); } catch { return null; } }

function ok(obj) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(obj)
  };
}

function err(status, message) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message })
  };
}

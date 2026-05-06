// Netlify Function v2 (ESM) — almacenamiento de escenarios en Netlify Blobs
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'lil-scenarios';
const KEY = 'all';
const MAX_SCENARIOS = 20;

export default async (req) => {
  let store;
  try {
    store = getStore({ name: STORE_NAME });
  } catch (e) {
    return json(500, { error: 'Blobs init falló: ' + e.message, where: 'getStore' });
  }

  try {
    if (req.method === 'GET') {
      const list = (await store.get(KEY, { type: 'json' })) || [];
      return json(200, { scenarios: list });
    }

    if (req.method === 'POST') {
      const body = await safeJson(req);
      if (!body || !body.scenario) return json(400, { error: 'Falta scenario' });
      const sc = sanitizeScenario(body.scenario);
      if (!sc) return json(400, { error: 'Escenario inválido' });
      const list = (await store.get(KEY, { type: 'json' })) || [];
      const updated = [sc, ...list].slice(0, MAX_SCENARIOS);
      await store.setJSON(KEY, updated);
      return json(200, { scenarios: updated });
    }

    if (req.method === 'DELETE') {
      const body = (await safeJson(req)) || {};
      const ts = Number(body.ts);
      if (!ts) return json(400, { error: 'Falta ts' });
      const list = (await store.get(KEY, { type: 'json' })) || [];
      const updated = list.filter((s) => Number(s.ts) !== ts);
      await store.setJSON(KEY, updated);
      return json(200, { scenarios: updated });
    }

    if (req.method === 'PUT') {
      const body = (await safeJson(req)) || {};
      const list = Array.isArray(body.scenarios) ? body.scenarios : null;
      if (!list) return json(400, { error: 'Falta scenarios[]' });
      const sanitized = list.map(sanitizeScenario).filter(Boolean).slice(0, MAX_SCENARIOS);
      await store.setJSON(KEY, sanitized);
      return json(200, { scenarios: sanitized });
    }

    return json(405, { error: 'Método no permitido' });
  } catch (e) {
    return json(500, {
      error: e.message || 'Error interno',
      where: 'handler',
      stack: (e.stack || '').slice(0, 600)
    });
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

async function safeJson(req) {
  try { return await req.json(); } catch { return null; }
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Netlify Function — proxy seguro para Claude API
// La API key vive en variables de entorno de Netlify, nunca en el cliente
const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key no configurada en Netlify' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const { data } = body;
  if (!data) return { statusCode: 400, body: JSON.stringify({ error: 'Falta campo data' }) };

  const prompt = buildPrompt(data);

  const payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          const text = parsed.content?.[0]?.text || 'Sin respuesta del modelo.';
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ analysis: text })
          });
        } catch {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Error parseando respuesta de Claude' }) });
        }
      });
    });
    req.on('error', err => {
      resolve({ statusCode: 502, body: JSON.stringify({ error: err.message }) });
    });
    req.write(payload);
    req.end();
  });
};

function buildPrompt(d) {
  return `Eres un asesor financiero especialista en modelos de colegios privados en México.
Analiza el siguiente análisis de sensibilidad financiera y entrega un diagnóstico ejecutivo CONCRETO en español.

MODELO FINANCIERO — DATOS CLAVE:
- EBITDA base Año 1: ${d.ebitdaBase}
- EBITDA base Año 7: ${d.ebitdaBaseYr7}
- Flujo acumulado 7 años: ${d.cashAcumulado}
- Matrícula Año 1: ${d.matricula} alumnos
- Margen EBITDA Año 1: ${d.margen}

ANÁLISIS TORNADO (impacto de ±20% en cada parámetro):
${d.tornado.map(t => `• ${t.label}: rango [${t.loFmt} a ${t.hiFmt}], spread ${t.spreadFmt}`).join('\n')}

Parámetro MÁS sensible: ${d.tornado[0]?.label}
Parámetro MENOS sensible: ${d.tornado[d.tornado.length - 1]?.label}

INSTRUCCIONES:
1. Interpreta qué tan robusto o frágil es el modelo en 2-3 oraciones.
2. Indica cuál es el riesgo principal y qué variable hay que monitorear con más cuidado.
3. Da una recomendación práctica y accionable para el operador del colegio.
4. Cierra con una frase de evaluación global (positiva, neutral o de alerta).

Usa lenguaje directo, sin bullet points ni encabezados. Máximo 200 palabras. Tono ejecutivo, no académico.`;
}

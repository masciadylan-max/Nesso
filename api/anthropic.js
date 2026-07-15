// Vercel serverless function — proxy vers l'API Anthropic
// La clé API est injectée côté serveur depuis les variables d'environnement Vercel.
// Garde-fous anti-abus : seuls les modèles utilisés par l'app sont autorisés,
// les tokens de sortie sont plafonnés, et le débit est limité par IP.

const MODELES_AUTORISES = new Set(['claude-sonnet-4-5', 'claude-sonnet-4-6', 'claude-haiku-4-5']);
const MAX_TOKENS_PLAFOND = 1500;

// Rate limit en mémoire : 20 requêtes / minute / IP.
// Chaque instance serverless a sa propre Map — barrière de premier niveau,
// pas absolue (un rate limit partagé nécessiterait un store type Vercel KV).
const RATE_LIMIT = 20;
const FENETRE_MS = 60000;
const hits = new Map();

const estLimite = (ip) => {
  const now = Date.now();
  const recents = (hits.get(ip) || []).filter(t => now - t < FENETRE_MS);
  recents.push(now);
  hits.set(ip, recents);
  if (hits.size > 5000) hits.clear(); // borne mémoire
  return recents.length > RATE_LIMIT;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'Clé API non configurée sur le serveur.' } });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'inconnue';
  if (estLimite(ip)) return res.status(429).json({ error: { message: 'Trop de requêtes. Patientez une minute.' } });

  const body = req.body || {};
  if (!MODELES_AUTORISES.has(body.model)) {
    return res.status(400).json({ error: { message: 'Modèle non autorisé.' } });
  }
  body.max_tokens = Math.min(parseInt(body.max_tokens) || MAX_TOKENS_PLAFOND, MAX_TOKENS_PLAFOND);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}

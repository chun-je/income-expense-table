// Vercel 서버 함수: 가계부 데이터를 Upstash Redis(Vercel Marketplace)에 저장해 기기 간 공유
// 필요한 환경 변수
//   KV_REST_API_URL, KV_REST_API_TOKEN  (Upstash for Redis 연결 시 자동 생성)
//   APP_PASSWORD                         (직접 추가: 앱 잠금 해제 비밀번호)
const crypto = require('crypto');

// Marketplace 연결 시 접두어를 붙였을 수도 있어 이름 끝부분으로도 찾음 (예: STORAGE_KV_REST_API_URL)
const envBy = (...suffixes) => {
  for (const sfx of suffixes) if (process.env[sfx]) return process.env[sfx];
  for (const sfx of suffixes) { const k = Object.keys(process.env).find(n => n.endsWith(sfx) && !n.includes('READ_ONLY')); if (k) return process.env[k]; }
  return '';
};
const URL_ = envBy('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const TOKEN = envBy('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
const PASS = process.env.APP_PASSWORD;
const KEY = 'income-expense:state';

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function authorized(key) {
  if (!PASS || typeof key !== 'string' || !key) return false;
  const a = crypto.createHash('sha256').update(key).digest();
  const b = crypto.createHash('sha256').update(PASS).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const configured = !!(URL_ && TOKEN && PASS);

  if (req.query && req.query.ping !== undefined) {
    return res.status(200).json({ app: 'income-expense', configured, has: { dbUrl: !!URL_, dbToken: !!TOKEN, password: !!PASS } });
  }
  if (!configured) return res.status(503).json({ error: 'not_configured' });

  if (!authorized(req.headers['x-app-key'])) {
    await new Promise(r => setTimeout(r, 500)); // 비밀번호 대입 속도 늦추기
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const raw = await redis(['GET', KEY]);
    const cur = raw ? JSON.parse(raw) : null;
    const serverAt = cur ? cur.at : 0;

    if (req.method === 'GET') {
      return res.status(200).json({ data: cur ? cur.data : null, at: serverAt });
    }

    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      // 다른 기기가 먼저 저장했다면 최신 데이터를 돌려주고 합치게 함
      if ((body && body.baseAt || 0) !== serverAt) {
        return res.status(409).json({ data: cur ? cur.data : null, at: serverAt });
      }
      if (!body || !body.data || !Array.isArray(body.data.cats) || !Array.isArray(body.data.entries)) {
        return res.status(400).json({ error: 'bad_data' });
      }
      const at = Math.max(Date.now(), serverAt + 1);
      await redis(['SET', KEY, JSON.stringify({ at, data: body.data })]);
      return res.status(200).json({ at });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'storage_error' });
  }
};

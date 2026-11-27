// 서울 열린데이터광장 따릉이 대여소 목록 API만 중계하는 프록시.
// 열린 프록시로 악용되지 않도록 호스트·포트·경로·범위를 모두 검증한다.

const ALLOWED_HOSTNAME = 'openapi.seoul.go.kr';
const ALLOWED_PORT = '8088';
// {인증키}/json/bikeList/{시작}/{끝}/ 경로만 허용 (포트 8088은 target.port로 따로 검사)
const ALLOWED_PATH = /^\/[A-Za-z0-9%._~-]+\/json\/bikeList\/(\d{1,4})\/(\d{1,4})\/$/;
// 대여소 목록은 1~2000번대까지만 사용한다.
const MAX_INDEX = 3000;

/**
 * 프록시가 중계해도 되는 URL인지 검사한다.
 * @param {unknown} raw 검증할 url 파라미터 값
 * @returns {string|null} 검증을 통과한 URL 문자열, 통과하지 못하면 null
 */
function parseAllowedUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 512) return null;

  let target;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
  // startsWith 대신 hostname을 정확히 비교한다. (openapi.seoul.go.kr.evil.com 같은 우회 차단)
  if (target.hostname !== ALLOWED_HOSTNAME) return null;
  if (target.port !== ALLOWED_PORT) return null;
  if (target.username || target.password) return null;
  if (target.search || target.hash) return null;

  const match = target.pathname.match(ALLOWED_PATH);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 1 || end < start || end > MAX_INDEX) return null;

  return target.toString();
}

export default async function handler(req, res) {

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 프리플라이트 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const target = parseAllowedUrl(req.query.url);

  if (!target) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    // 검증한 URL만 호출하고, 리다이렉트로 다른 호스트에 넘어가지 않게 한다.
    const response = await fetch(target, { redirect: 'error' });

    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream error' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[proxy] upstream request failed:', error);
    return res.status(502).json({ error: 'Proxy error' });
  }
}

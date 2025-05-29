export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith('http://openapi.seoul.go.kr')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', detail: error.message });
  }
}
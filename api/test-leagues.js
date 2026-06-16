export default async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY não configurada' });
  }

  const response = await fetch(
    'https://v3.football.api-sports.io/leagues?search=World Cup',
    {
      headers: {
        'x-apisports-key': key
      }
    }
  );

  const data = await response.json();

  return res.status(200).json(data);
}

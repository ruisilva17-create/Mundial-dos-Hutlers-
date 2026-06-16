export default async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;

  const response = await fetch(
    'https://v3.football.api-sports.io/fixtures?date=2026-06-16',
    {
      headers: {
        'x-apisports-key': key
      }
    }
  );

  const data = await response.json();
  return res.status(200).json(data);
}

export default async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;

  const r = await fetch(
    'https://v3.football.api-sports.io/fixtures?date=2026-06-16',
    {
      headers: {
        'x-apisports-key': key
      }
    }
  );

  const data = await r.json();

  const worldCupFixtures = (data.response || []).filter(f =>
    String(f.league?.name || '').toLowerCase().includes('world cup')
  );

  res.status(200).json({
    totalResults: data.results,
    worldCupCount: worldCupFixtures.length,
    fixtures: worldCupFixtures.map(f => ({
      fixtureId: f.fixture?.id,
      leagueId: f.league?.id,
      leagueName: f.league?.name,
      season: f.league?.season,
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      status: f.fixture?.status?.long
    }))
  });
}

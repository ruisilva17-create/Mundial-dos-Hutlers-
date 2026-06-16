const SUPABASE_URL = 'https://tzdjugjaomfyircjvhxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZGp1Z2phb21meWlyY2p2aHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTkzMjIsImV4cCI6MjA5NjgzNTMyMn0.DyoEAilo99tdZVVgbNFZ0xMgVRUq8EVFa1Bj4MTu-tM';

const TEAM_ALIASES = {
  'usa':'estados unidos',
  'united states':'estados unidos',
  'united states of america':'estados unidos',
  'south korea':'coreia do sul',
  'korea republic':'coreia do sul',
  'czech republic':'chequia',
  'czechia':'chequia',
  'bosnia & herzegovina':'bosnia e herzegovina',
  'bosnia and herzegovina':'bosnia e herzegovina',
  'ivory coast':'costa do marfim',
  "côte d’ivoire":'costa do marfim',
  "cote d'ivoire":'costa do marfim',
  'dr congo':'rd congo',
  'netherlands':'paises baixos',
  'new zealand':'nova zelandia',
  'south africa':'africa do sul',
  'saudi arabia':'arabia saudita',
  'cape verde':'cabo verde',
  'new caledonia':'nova caledonia',
  'curacao':'curacau',
  'curaçao':'curacau',
  'mexico':'mexico',
  'méxico':'mexico',
  'brazil':'brasil',
  'germany':'alemanha',
  'spain':'espanha',
  'france':'franca',
  'frança':'franca',
  'england':'inglaterra',
  'switzerland':'suica',
  'suíça':'suica',
  'qatar':'catar',
  'morocco':'marrocos',
  'japan':'japao',
  'japão':'japao',
  'iran':'irao',
  'irão':'irao',
  'iraq':'iraque',
  'uzbekistan':'uzbequistao',
  'uzbequistão':'uzbequistao',
  'turkey':'turquia',
  'croatia':'croacia',
  'croácia':'croacia',
  'belgium':'belgica',
  'bélgica':'belgica',
  'austria':'austria',
  'áustria':'austria',
  'algeria':'argelia',
  'argélia':'argelia',
  'tunisia':'tunisia',
  'tunísia':'tunisia',
  'panama':'panama',
  'panamá':'panama'
};

function normalizeName(value){
  return String(value || '')
    .replace(/^[A-Z]{2}\s+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function canonicalTeam(value){
  const n = normalizeName(value);
  return TEAM_ALIASES[n] || n;
}

function sameDay(a, b){
  if(!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear()
    && da.getUTCMonth() === db.getUTCMonth()
    && da.getUTCDate() === db.getUTCDate();
}

async function supabaseFetch(path, options = {}){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try{ data = text ? JSON.parse(text) : null; }catch(e){ data = text; }

  if(!res.ok){
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  return data;
}

async function apiFootball(path){
  const key = process.env.API_FOOTBALL_KEY;
  if(!key) throw new Error('API_FOOTBALL_KEY não está configurada no Vercel.');

  const res = await fetch(`https://v3.football.api-sports.io/${path}`, {
    headers: { 'x-apisports-key': key }
  });

  const data = await res.json();
  if(!res.ok || data.errors?.length){
    throw new Error(JSON.stringify(data.errors || data));
  }

  return data.response || [];
}

async function getWorldCupFixtures(){
  // FIFA World Cup costuma ser league=1 na API-Football.
  // Se a API ainda não tiver jogos de 2026, isto devolve vazio.
  return await apiFootball('fixtures?league=1&season=2026');
}

function findApiFixtureForMatch(match, fixtures){
  if(match.api_fixture_id){
    return fixtures.find(f => Number(f.fixture?.id) === Number(match.api_fixture_id));
  }

  const home = canonicalTeam(match.home_team);
  const away = canonicalTeam(match.away_team);

  return fixtures.find(fx => {
    const apiHome = canonicalTeam(fx.teams?.home?.name);
    const apiAway = canonicalTeam(fx.teams?.away?.name);
    const dateOk = sameDay(match.kickoff, fx.fixture?.date);

    return dateOk && (
      (apiHome === home && apiAway === away) ||
      (apiHome === away && apiAway === home)
    );
  });
}

export default async function handler(req, res){
  if(!['GET','POST'].includes(req.method)){
  return res.status(405).json({ error: 'Usa GET ou POST.' });
}

  try{
    const matches = await supabaseFetch('matches?select=*');
    const fixtures = await getWorldCupFixtures();

    let updated = 0;
    let linked = 0;
    let unmatched = 0;

    for(const match of matches){
      const fx = findApiFixtureForMatch(match, fixtures);
      if(!fx){
        unmatched++;
        continue;
      }

      const fixtureId = fx.fixture?.id;
      const homeGoals = fx.goals?.home;
      const awayGoals = fx.goals?.away;

      const patch = {};
      if(fixtureId && Number(match.api_fixture_id) !== Number(fixtureId)){
        patch.api_fixture_id = fixtureId;
        linked++;
      }

      if(homeGoals !== null && awayGoals !== null && homeGoals !== undefined && awayGoals !== undefined){
        if(match.home_score !== homeGoals || match.away_score !== awayGoals){
          patch.home_score = homeGoals;
          patch.away_score = awayGoals;
          updated++;
        }
      }

      if(Object.keys(patch).length){
        await supabaseFetch(`matches?id=eq.${match.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch)
        });
      }
    }

    return res.status(200).json({
      ok: true,
      updated,
      linked,
      unmatched,
      apiFixtures: fixtures.length
    });
  }catch(error){
    return res.status(500).json({ error: error.message });
  }
}

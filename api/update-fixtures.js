import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const API_KEY = process.env.API_FOOTBALL_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function isPlaceholder(name){
  const n = String(name || '').toLowerCase();
  return (
    n.includes('tbd') ||
    n.includes('group') ||
    n.includes('winner') ||
    n.includes('runner') ||
    n.includes('runners-up')
  );
}

function sameKickoff(a,b){
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(da - db) <= 2 * 60 * 60 * 1000;
}

async function apiFootball(path){
  const res = await fetch(`https://v3.football.api-sports.io/${path}`, {
    headers: { 'x-apisports-key': API_KEY }
  });

  const data = await res.json();
  return data.response || [];
}

export default async function handler(req, res){
  try{
    if(!API_KEY) throw new Error('API_FOOTBALL_KEY em falta.');
    if(!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Variáveis Supabase em falta.');

    const { data: matches, error } = await sb
      .from('matches')
      .select('*')
      .order('kickoff', { ascending:true });

    if(error) throw error;

    const placeholders = (matches || []).filter(m =>
      isPlaceholder(m.home_team) ||
      isPlaceholder(m.away_team) ||
      !m.api_fixture_id
    );

    if(!placeholders.length){
      return res.status(200).json({
        ok:true,
        message:'Sem jogos placeholder para atualizar.',
        updated:0
      });
    }

    const dates = [...new Set(
      placeholders
        .filter(m => m.kickoff)
        .map(m => new Date(m.kickoff).toISOString().slice(0,10))
    )];

    let apiFixtures = [];

    for(const date of dates){
      const fixtures = await apiFootball(`fixtures?league=1&season=2026&date=${date}`);
      apiFixtures.push(...fixtures);
    }

    let updated = 0;
    const details = [];

    for(const match of placeholders){
      const found = apiFixtures.find(f =>
        f.fixture?.date &&
        match.kickoff &&
        sameKickoff(f.fixture.date, match.kickoff)
      );

      if(!found) continue;

      const home = found.teams?.home?.name;
      const away = found.teams?.away?.name;
      const fixtureId = found.fixture?.id;

      if(!home || !away || !fixtureId) continue;

      const update = {
        home_team: home,
        away_team: away,
        api_fixture_id: fixtureId
      };

      const { error:updateError } = await sb
        .from('matches')
        .update(update)
        .eq('id', match.id);

      if(updateError) throw updateError;

      updated++;
      details.push({
        id: match.id,
        from: `${match.home_team} vs ${match.away_team}`,
        to: `${home} vs ${away}`,
        fixtureId
      });
    }

    return res.status(200).json({
      ok:true,
      checked:placeholders.length,
      apiFixtures:apiFixtures.length,
      updated,
      details
    });

  }catch(err){
    return res.status(500).json({
      ok:false,
      error:err.message
    });
  }
}

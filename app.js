const SUPABASE_URL = 'https://tzdjugjaomfyircjvhxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZGp1Z2phb21meWlyY2p2aHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTkzMjIsImV4cCI6MjA5NjgzNTMyMn0.DyoEAilo99tdZVVgbNFZ0xMgVRUq8EVFa1Bj4MTu-tM';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ALLOWED_PLAYERS = ['Rui','Walter','Bruno','Luís','Barbosa','Dani','Artur','Edu','Ronfe'];
const ADMIN_NAME = 'Rui';
let me = JSON.parse(localStorage.getItem('mdh_me') || 'null');
const $ = id => document.getElementById(id);

$('name').innerHTML = ALLOWED_PLAYERS.map(n => `<option value="${n}">${n}</option>`).join('');

async function sha(text){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function isAdmin(){ return me && me.name === ADMIN_NAME; }
function normName(name){ return ALLOWED_PLAYERS.find(n => n.toLowerCase() === name.toLowerCase()); }

async function login(){
  const name = normName($('name').value.trim());
  const pin = $('pin').value.trim();
  if(!name || !/^\d{4}$/.test(pin)) return alert('Escolhe o nome e escreve um PIN de 4 dígitos.');
  const pinHash = await sha(pin);
  const existing = await db.from('players').select('*').eq('name', name).maybeSingle();
  if(existing.error) return alert(existing.error.message);
  if(existing.data){
    if(existing.data.pin !== pinHash) return alert('PIN errado.');
    me = existing.data;
  } else {
    const created = await db.from('players').insert({name, pin: pinHash}).select().single();
    if(created.error) return alert(created.error.message);
    me = created.data;
  }
  localStorage.setItem('mdh_me', JSON.stringify(me));
  showApp();
}
function logout(){ localStorage.removeItem('mdh_me'); location.reload(); }

function score(pred, match){
  if(match.home_score === null || match.home_score === undefined || match.away_score === null || match.away_score === undefined) return 0;
  let pts = 0;
  if(pred.home_prediction === match.home_score && pred.away_prediction === match.away_score) pts += 5;
  else if(Math.sign(pred.home_prediction - pred.away_prediction) === Math.sign(match.home_score - match.away_score)) pts += 3;
  if(pred.home_prediction === match.home_score) pts += 1;
  if(pred.away_prediction === match.away_score) pts += 1;
  return pts;
}
function fmt(dt){ return dt ? new Date(dt).toLocaleString('pt-PT',{dateStyle:'short', timeStyle:'short'}) : 'sem hora'; }

async function addMatch(){
  if(!isAdmin()) return alert('Só o Rui pode adicionar jogos.');
  const home_team=$('homeTeam').value.trim(), away_team=$('awayTeam').value.trim(), dt=$('kickoff').value;
  if(!home_team || !away_team) return alert('Faltam equipas.');
  const r = await db.from('matches').insert({home_team, away_team, kickoff: dt ? new Date(dt).toISOString() : null});
  if(r.error) return alert(r.error.message);
  $('homeTeam').value=$('awayTeam').value=$('kickoff').value='';
  load();
}
async function savePrediction(matchId){
  const a = Number($('hp_'+matchId).value), b = Number($('ap_'+matchId).value);
  if(Number.isNaN(a)||Number.isNaN(b)||a<0||b<0) return alert('Resultado inválido.');
  const r = await db.from('predictions').upsert({player_id:me.id, match_id:matchId, home_prediction:a, away_prediction:b},{onConflict:'player_id,match_id'});
  if(r.error) return alert(r.error.message);
  load();
}
async function saveResult(matchId){
  if(!isAdmin()) return alert('Só o Rui pode lançar resultados.');
  const a=$('hr_'+matchId).value, b=$('ar_'+matchId).value;
  const r = await db.from('matches').update({home_score:a===''?null:Number(a), away_score:b===''?null:Number(b)}).eq('id', matchId);
  if(r.error) return alert(r.error.message);
  load();
}

async function load(){
  const [pRes,mRes,prRes] = await Promise.all([
    db.from('players').select('*').order('created_at'),
    db.from('matches').select('*').order('kickoff',{ascending:true, nullsFirst:false}),
    db.from('predictions').select('*')
  ]);
  if(pRes.error||mRes.error||prRes.error) return alert((pRes.error||mRes.error||prRes.error).message);
  const players=pRes.data||[], matches=mRes.data||[], preds=prRes.data||[];
  $('players').innerHTML = ALLOWED_PLAYERS.map(n => `<span class="pill">${n}${players.some(p=>p.name===n)?' ✓':''}</span>`).join('');
  $('matches').innerHTML = matches.length ? matches.map(m => {
    const mine = preds.find(p => p.match_id===m.id && p.player_id===me.id) || {};
    const locked = m.kickoff && new Date(m.kickoff) <= new Date();
    const all = preds.filter(p => p.match_id===m.id).map(p => `${players.find(x=>x.id===p.player_id)?.name||'?'}: ${p.home_prediction}-${p.away_prediction}`).join(' · ');
    return `<div class="game"><h3>${m.home_team} vs ${m.away_team}</h3><p class="muted">${fmt(m.kickoff)}</p><div class="row"><input id="hp_${m.id}" type="number" min="0" value="${mine.home_prediction ?? ''}" placeholder="${m.home_team}"><input id="ap_${m.id}" type="number" min="0" value="${mine.away_prediction ?? ''}" placeholder="${m.away_team}"><button ${locked?'disabled':''} onclick="savePrediction('${m.id}')">${locked?'Bloqueado':'Guardar aposta'}</button></div><p class="small">Apostas: ${all || 'ainda sem apostas'}</p>${isAdmin()?`<div class="row"><input id="hr_${m.id}" type="number" min="0" value="${m.home_score ?? ''}" placeholder="Resultado ${m.home_team}"><input id="ar_${m.id}" type="number" min="0" value="${m.away_score ?? ''}" placeholder="Resultado ${m.away_team}"><button onclick="saveResult('${m.id}')">Guardar resultado</button></div>`:''}</div>`;
  }).join('') : '<p class="muted">Ainda não há jogos. O Rui pode adicionar jogos.</p>';
  const totals = ALLOWED_PLAYERS.map(name => {
    const player = players.find(p=>p.name===name);
    const points = player ? preds.filter(pr=>pr.player_id===player.id).reduce((s,pr)=>s+score(pr, matches.find(m=>m.id===pr.match_id)||{}),0) : 0;
    return {name, points};
  }).sort((a,b)=>b.points-a.points || a.name.localeCompare(b.name));
  $('ranking').innerHTML = totals.map(x=>`<li><strong>${x.name}</strong> — ${x.points} pts</li>`).join('');
}
function showApp(){
  $('login').classList.add('hidden'); $('app').classList.remove('hidden'); $('who').textContent='Olá, '+me.name+(isAdmin()?' · Admin':'');
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin()));
  load(); setInterval(load,15000);
}
if(me) showApp();

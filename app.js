const SUPABASE_URL = 'https://tzdjugjaomfyircjvhxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZGp1Z2phb21meWlyY2p2aHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTkzMjIsImV4cCI6MjA5NjgzNTMyMn0.DyoEAilo99tdZVVgbNFZ0xMgVRUq8EVFa1Bj4MTu-tM';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let state = { player:null, players:[], matches:[], predictions:[], groups:[], groupPreds:[], bonusPreds:[], bonusResults:null };
let activeTab = 'ranking';
let activeMatchDateKey = null;
function switchTab(tab){
  activeTab = tab;
  document.querySelectorAll('[data-tab-panel]').forEach(el=>el.classList.toggle('hidden', el.dataset.tabPanel !== tab));
  document.querySelectorAll('[data-tab-btn]').forEach(el=>el.classList.toggle('active', el.dataset.tabBtn === tab));
}

// Apostas dos grupos fecham em 13/06/2026 às 12:00, hora de Portugal continental.
const GROUP_PREDICTIONS_DEADLINE = new Date('2026-06-13T13:30:00+01:00');
const BONUS_PREDICTIONS_DEADLINE = new Date('2026-06-13T13:30:00+01:00');
const OTHER_GROUPS_DEADLINE = new Date('2026-06-14T16:00:00+01:00');
const $ = id => document.getElementById(id);
const teamNameMap = {
  USA:'Estados Unidos', 'United States':'Estados Unidos',
  Mexico:'México', Canada:'Canadá',
  Brazil:'Brasil', Argentina:'Argentina', Uruguay:'Uruguai', Paraguay:'Paraguai', Colombia:'Colômbia', Ecuador:'Equador',
  Spain:'Espanha', France:'França', Germany:'Alemanha', Italy:'Itália', England:'Inglaterra', Croatia:'Croácia', Belgium:'Bélgica', Netherlands:'Países Baixos', Switzerland:'Suíça', Sweden:'Suécia', Norway:'Noruega', Scotland:'Escócia', Czechia:'Chéquia', 'Czech Republic':'Chéquia', Turkey:'Turquia', Ukraine:'Ucrânia', Austria:'Áustria',
  Portugal:'Portugal',
  Morocco:'Marrocos', Senegal:'Senegal', Ghana:'Gana', Egypt:'Egito', Algeria:'Argélia', Angola:'Angola', Cameroon:'Camarões', 'South Africa':'África do Sul', 'Ivory Coast':'Costa do Marfim', 'Côte d’Ivoire':'Costa do Marfim', 'DR Congo':'RD Congo',
  Japan:'Japão', 'South Korea':'Coreia do Sul', Qatar:'Catar', Iran:'Irão', Iraq:'Iraque', 'Saudi Arabia':'Arábia Saudita', Uzbekistan:'Uzbequistão', Jordan:'Jordânia',
  Australia:'Austrália', 'New Zealand':'Nova Zelândia',
  Haiti:'Haiti', Panama:'Panamá', Honduras:'Honduras', 'Costa Rica':'Costa Rica', 'El Salvador':'El Salvador', Curaçao:'Curaçau', 'New Caledonia':'Nova Caledónia',
  'Bosnia & Herzegovina':'Bósnia e Herzegovina', 'Bosnia and Herzegovina':'Bósnia e Herzegovina',
  Tunisia:'Tunísia', 'Cape Verde':'Cabo Verde'
};
const flagMap = {
  Portugal:'🇵🇹', Brasil:'🇧🇷', Argentina:'🇦🇷', Espanha:'🇪🇸', França:'🇫🇷', Alemanha:'🇩🇪', Itália:'🇮🇹', Inglaterra:'🏴', México:'🇲🇽', 'África do Sul':'🇿🇦', 'Coreia do Sul':'🇰🇷', Chéquia:'🇨🇿', Canadá:'🇨🇦', 'Bósnia e Herzegovina':'🇧🇦', 'Estados Unidos':'🇺🇸', Uruguai:'🇺🇾', Paraguai:'🇵🇾', Colômbia:'🇨🇴', Equador:'🇪🇨', Japão:'🇯🇵', Marrocos:'🇲🇦', Croácia:'🇭🇷', Bélgica:'🇧🇪', 'Países Baixos':'🇳🇱', Suíça:'🇨🇭', Dinamarca:'🇩🇰', Suécia:'🇸🇪', Noruega:'🇳🇴', Polónia:'🇵🇱', Sérvia:'🇷🇸', Senegal:'🇸🇳', Gana:'🇬🇭', Nigéria:'🇳🇬', Egito:'🇪🇬', Catar:'🇶🇦', Austrália:'🇦🇺', 'Arábia Saudita':'🇸🇦', Haiti:'🇭🇹', Escócia:'🏴', Turquia:'🇹🇷', Ucrânia:'🇺🇦', Áustria:'🇦🇹', Argélia:'🇩🇿', Angola:'🇦🇴', Camarões:'🇨🇲', 'Costa do Marfim':'🇨🇮', 'RD Congo':'🇨🇩', Irão:'🇮🇷', Iraque:'🇮🇶', Uzbequistão:'🇺🇿', Jordânia:'🇯🇴', 'Nova Zelândia':'🇳🇿', Panamá:'🇵🇦', Honduras:'🇭🇳', 'Costa Rica':'🇨🇷', 'El Salvador':'🇸🇻', Curaçau:'🇨🇼', 'Nova Caledónia':'🇳🇨', Tunísia:'🇹🇳', 'Cabo Verde':'🇨🇻'
};
const cleanTeam = team => (team || '').replace(/^[A-Z]{2}\s+/, '').trim();
const teamPt = team => {
  const cleaned = cleanTeam(team);
  return teamNameMap[cleaned] || cleaned;
};
const f = team => { const name = teamPt(team); return `${flagMap[name]||''} ${name}`.trim(); };

function outcome(h,a){ if(h===null||a===null||h===undefined||a===undefined) return null; return h>a?'home':h<a?'away':'draw'; }
function matchPoints(pred, match){ if(match.home_score===null||match.away_score===null||pred.home_prediction===null||pred.away_prediction===null) return 0; if(pred.home_prediction===match.home_score && pred.away_prediction===match.away_score) return 5; return outcome(pred.home_prediction,pred.away_prediction)===outcome(match.home_score,match.away_score)?3:0; }
function groupPoints(gp, group){ if(!group.final_order || !gp.predicted_order) return 0; return gp.predicted_order.reduce((sum,t,i)=>sum+(group.final_order[i]===t?3:0),0); }
function bonusPoints(bp){ const r=state.bonusResults||{}; let pts=0; if(bp?.champion && r.champion && bp.champion.trim().toLowerCase()===r.champion.trim().toLowerCase()) pts+=10; if(bp?.runner_up && r.runner_up && bp.runner_up.trim().toLowerCase()===r.runner_up.trim().toLowerCase()) pts+=5; if(bp?.top_scorer && r.top_scorer && bp.top_scorer.trim().toLowerCase()===r.top_scorer.trim().toLowerCase()) pts+=5; return pts; }
async function loadAll(){
  const [players,matches,preds,groups,gpreds,bpreds,bres] = await Promise.all([
    sb.from('players').select('*').order('id'), sb.from('matches').select('*').order('kickoff',{ascending:true}), sb.from('predictions').select('*'), sb.from('groups').select('*').order('name'), sb.from('group_predictions').select('*'), sb.from('bonus_predictions').select('*'), sb.from('bonus_results').select('*').eq('id',1).single()
  ]);
  state.players=players.data||[]; state.matches=matches.data||[]; state.predictions=preds.data||[]; state.groups=groups.data||[]; state.groupPreds=gpreds.data||[]; state.bonusPreds=bpreds.data||[]; state.bonusResults=bres.data||{};
  renderPlayers(); if(state.player){ state.player = state.players.find(p=>p.id===state.player.id)||state.player; renderApp(); }
}
function renderPlayers(){ $('playerSelect').innerHTML = state.players.map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); }
async function login(){ const p=state.players.find(x=>String(x.id)===$('playerSelect').value); if(!p || p.pin !== $('pinInput').value){ alert('Nome ou PIN errado.'); return; } state.player=p; localStorage.setItem('playerId',p.id); $('login').classList.add('hidden'); $('app').classList.remove('hidden'); renderApp(); }

function injectBetterPredictionStyles(){
  if(document.getElementById('better-prediction-styles')) return;
  const style = document.createElement('style');
  style.id = 'better-prediction-styles';
  style.textContent = `
    .table-wrap{overflow-x:auto;margin-top:10px}
    .predictions-table{min-width:620px}
    .predictions-table th,.predictions-table td{vertical-align:top}
    .prediction-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px}
    .prediction-card{border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px;background:rgba(255,255,255,.06)}
    .prediction-player{font-weight:800;margin-bottom:4px}
    .prediction-score{font-size:1.35rem;font-weight:900}
    .prediction-meta{font-size:.82rem;opacity:.85;margin-top:3px}
    .match-subtabs{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 18px}
    .match-subtab{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:inherit;font-weight:800;cursor:pointer}
    .match-subtab.active{background:#2563eb;border-color:#60a5fa}
    .match-panel.hidden{display:none}
    .date-header{margin:22px 0 10px;padding:10px 12px;border-radius:12px;background:rgba(37,99,235,.16);border:1px solid rgba(96,165,250,.28);text-transform:capitalize}
    .fixture-status{display:inline-block;margin-top:8px;padding:5px 9px;border-radius:999px;font-size:.78rem;font-weight:800}
    .fixture-status.ok{background:rgba(34,197,94,.16);color:#bbf7d0;border:1px solid rgba(34,197,94,.38)}
    .fixture-status.pending{background:rgba(250,204,21,.14);color:#fde68a;border:1px solid rgba(250,204,21,.36)}
    .fixture-status.missing{background:rgba(239,68,68,.13);color:#fecaca;border:1px solid rgba(239,68,68,.34)}
    .match.has-result{border-color:rgba(34,197,94,.32)}
    .match.needs-api{border-color:rgba(239,68,68,.30)}
    .bonus-reveal,.live-results-box,.stats-day{margin-top:18px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px;background:rgba(255,255,255,.05)}
    .bonus-table,.stats-table,.match-prediction-table{min-width:640px}
    .live-results-status{margin-top:8px;font-size:.9rem;opacity:.9}
    .stat-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:12px 0}
    .stat-card{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px;background:rgba(255,255,255,.06)}
    .stat-card b{display:block;font-size:1.2rem}
  `;
  document.head.appendChild(style);
}


function bonusAreLocked(){ return Date.now() >= BONUS_PREDICTIONS_DEADLINE.getTime(); }
function normalizeGroupName(name){ return String(name||'').trim().toUpperCase(); }
function groupDeadline(group){
  const n = normalizeGroupName(group?.name);
  return ['GRUPO A','GRUPO B','GRUPO C','GRUPO D','GRUPO E','A','B','C','D','E'].includes(n)
    ? GROUP_PREDICTIONS_DEADLINE
    : OTHER_GROUPS_DEADLINE;
}
function groupIsLocked(group){ return Date.now() >= groupDeadline(group).getTime(); }

function ensureExtraUi(){
  if(!document.querySelector('[data-tab-btn="stats"]')){
    const btn = document.createElement('button');
    btn.dataset.tabBtn = 'stats';
    btn.innerHTML = '📊 Estatísticas';
    btn.onclick = () => switchTab('stats');
    const adminBtn = document.querySelector('[data-tab-btn="admin"]');
    if(adminBtn) adminBtn.parentElement.insertBefore(btn, adminBtn);
  }
  if(!$('stats')){
    const panel = document.createElement('section');
    panel.id = 'stats';
    panel.dataset.tabPanel = 'stats';
    panel.className = 'hidden';
    const container = $('ranking')?.parentElement || $('app') || document.body;
    container.appendChild(panel);
  }
}

function ensureLiveResultsAdminBox(){
  if(!state.player?.is_admin) return;
  const adminPanel = $('admin') || $('adminGroups')?.parentElement || $('adminBonus')?.parentElement;
  if(!adminPanel || document.getElementById('liveResultsBox')) return;
  const box = document.createElement('div');
  box.id = 'liveResultsBox';
  box.className = 'live-results-box';
  box.innerHTML = `
    <h3>🔄 Resultados automáticos</h3>
    <p class="hint">Vai buscar resultados à API-Football e atualiza os jogos que conseguir associar.</p>
    <button id="updateLiveResultsBtn" onclick="updateLiveResultsNow()">Atualizar resultados agora</button>
    <div id="liveResultsStatus" class="live-results-status"></div>
  `;
  adminPanel.prepend(box);
}

async function updateLiveResultsNow(){
  const btn = $('updateLiveResultsBtn');
  const status = $('liveResultsStatus');
  if(btn) btn.disabled = true;
  if(status) status.textContent = 'A atualizar resultados...';
  try{
    const res = await fetch('/api/update-results', { method:'POST' });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Erro ao atualizar resultados.');
    if(status) status.textContent = `Feito. Jogos atualizados: ${data.updated || 0}. Jogos associados à API: ${data.linked || 0}. Jogos sem associação: ${data.unmatched || 0}.`;
    await loadAll();
    alert(`Resultados atualizados. Jogos atualizados: ${data.updated || 0}`);
  }catch(err){
    if(status) status.textContent = err.message;
    alert(err.message);
  }finally{
    if(btn) btn.disabled = false;
  }
}

function dayKeyFromKickoff(kickoff){
  return kickoff ? new Date(kickoff).toLocaleDateString('pt-PT') : 'Sem data';
}
function renderStats(){
  if(!$('stats')) return;
  const completed = state.matches.filter(m=>m.home_score!==null && m.away_score!==null && m.kickoff);
  if(!completed.length){
    $('stats').innerHTML = '<h2>📊 Estatísticas</h2><p class="hint">Ainda não há jogos com resultado.</p>';
    return;
  }
  const byDay = {};
  completed.forEach(m=>{
    const k = dayKeyFromKickoff(m.kickoff);
    byDay[k] = byDay[k] || [];
    byDay[k].push(m);
  });
  const totalRows = state.players.map(p=>{
    let pts=0, exact=0, outcomeOnly=0, failed=0, bets=0;
    completed.forEach(m=>{
      const pr = state.predictions.find(x=>x.player_id===p.id && x.match_id===m.id);
      if(!pr) return;
      bets++;
      const mp = matchPoints(pr,m);
      pts += mp;
      if(mp===5) exact++;
      else if(mp===3) outcomeOnly++;
      else failed++;
    });
    const pct = bets ? Math.round(((exact + outcomeOnly) / bets) * 100) : 0;
    const avg = bets ? (pts / bets).toFixed(1) : '0.0';
    return {name:p.name, pts, exact, outcomeOnly, failed, bets, pct, avg};
  }).sort((a,b)=>b.pts-a.pts || b.exact-a.exact || a.name.localeCompare(b.name));
  const leaderPts = totalRows[0]?.pts || 0;
  $('stats').innerHTML = `<h2>📊 Estatísticas</h2>
    <div class="stat-cards">
      <div class="stat-card"><span>Líder</span><b>${totalRows[0]?.name || '-'}</b><span>${totalRows[0]?.pts || 0} pts</span></div>
      <div class="stat-card"><span>Mais exatos</span><b>${[...totalRows].sort((a,b)=>b.exact-a.exact)[0]?.name || '-'}</b><span>${[...totalRows].sort((a,b)=>b.exact-a.exact)[0]?.exact || 0}</span></div>
      <div class="stat-card"><span>Melhor % acerto</span><b>${[...totalRows].sort((a,b)=>b.pct-a.pct || b.bets-a.bets)[0]?.name || '-'}</b><span>${[...totalRows].sort((a,b)=>b.pct-a.pct || b.bets-a.bets)[0]?.pct || 0}%</span></div>
      <div class="stat-card"><span>Jogos concluídos</span><b>${completed.length}</b></div>
    </div>
    <div class="table-wrap"><table class="table stats-table">
      <tr><th>#</th><th>Jogador</th><th>Pontos</th><th>% acerto</th><th>Média/jogo</th><th>Dif. líder</th><th>Exatos</th><th>Venc./Empate</th><th>Falhou</th><th>Apostas</th></tr>
      ${totalRows.map((r,i)=>`<tr><td>${i+1}.º</td><td><b>${r.name}</b></td><td><b>${r.pts}</b></td><td>${r.pct}%</td><td>${r.avg}</td><td>${leaderPts-r.pts===0?'—':`-${leaderPts-r.pts}`}</td><td>${r.exact}</td><td>${r.outcomeOnly}</td><td>${r.failed}</td><td>${r.bets}/${completed.length}</td></tr>`).join('')}
    </table></div>
    ${Object.entries(byDay).map(([date,matches])=>{
      const rows = state.players.map(p=>{
        let pts=0, exact=0, outcomeOnly=0, failed=0, bets=0;
        matches.forEach(m=>{
          const pr=state.predictions.find(x=>x.player_id===p.id && x.match_id===m.id);
          if(!pr) return;
          bets++;
          const mp=matchPoints(pr,m);
          pts+=mp;
          if(mp===5) exact++;
          else if(mp===3) outcomeOnly++;
          else failed++;
        });
        const pct = bets ? Math.round(((exact + outcomeOnly) / bets) * 100) : 0;
        const avg = bets ? (pts / bets).toFixed(1) : '0.0';
        return {name:p.name,pts,exact,outcomeOnly,failed,bets,pct,avg};
      }).sort((a,b)=>b.pts-a.pts || b.exact-a.exact || a.name.localeCompare(b.name));
      const dayLeaderPts = rows[0]?.pts || 0;
      return `<div class="stats-day"><h3>${date}</h3><div class="table-wrap"><table class="table stats-table">
        <tr><th>Jogador</th><th>Pontos</th><th>%</th><th>Média</th><th>Dif.</th><th>Exatos</th><th>Venc./Empate</th><th>Falhou</th><th>Apostas</th></tr>
        ${rows.map(r=>`<tr><td><b>${r.name}</b></td><td><b>${r.pts}</b></td><td>${r.pct}%</td><td>${r.avg}</td><td>${dayLeaderPts-r.pts===0?'—':`-${dayLeaderPts-r.pts}`}</td><td>${r.exact}</td><td>${r.outcomeOnly}</td><td>${r.failed}</td><td>${r.bets}/${matches.length}</td></tr>`).join('')}
      </table></div></div>`;
    }).join('')}`;
}
function escHtml(v){
  return String(v ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function isPlaceholderTeam(name){
  const n = String(name || '').toLowerCase();
  return n.includes('tbd') || n.includes('group') || n.includes('winner') || n.includes('runner');
}

function allKnownTeams(){
  const teams = new Set();

  state.groups.forEach(g => (g.teams || []).forEach(t => {
    if(t && !isPlaceholderTeam(t)) teams.add(t);
  }));

  state.matches.forEach(m => {
    if(m.home_team && !isPlaceholderTeam(m.home_team)) teams.add(m.home_team);
    if(m.away_team && !isPlaceholderTeam(m.away_team)) teams.add(m.away_team);
  });

  return [...teams].sort((a,b)=>f(a).localeCompare(f(b)));
}

function renderKnockoutAdminBox(){
  if(!state.player?.is_admin) return;

  const adminPanel = $('admin') || $('adminGroups')?.parentElement || $('adminBonus')?.parentElement;
  if(!adminPanel) return;

  let box = $('knockoutAdminBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'knockoutAdminBox';
    box.className = 'live-results-box';
    adminPanel.prepend(box);
  }

  const teams = allKnownTeams();

  const matches = state.matches
    .filter(m => isPlaceholderTeam(m.home_team) || isPlaceholderTeam(m.away_team))
    .sort((a,b)=>new Date(a.kickoff || 0) - new Date(b.kickoff || 0));

  box.innerHTML = `
    <h3>🏆 Atualizar eliminatórias manualmente</h3>
    <p class="hint">Substitui TBD / Group winner / runners-up pelas equipas reais.</p>

    <datalist id="knockoutTeamOptions">
      ${teams.map(t=>`<option value="${escHtml(t)}">${escHtml(f(t))}</option>`).join('')}
    </datalist>

    ${matches.length ? matches.map(m=>`
      <div class="match">
        <div class="teams">${escHtml(f(m.home_team))} vs ${escHtml(f(m.away_team))}</div>
        <div class="small">${m.kickoff ? new Date(m.kickoff).toLocaleString('pt-PT') : ''}</div>

        <label>Equipa casa
          <input id="ko-home-${m.id}" list="knockoutTeamOptions" value="${escHtml(m.home_team || '')}">
        </label>

        <label>Equipa fora
          <input id="ko-away-${m.id}" list="knockoutTeamOptions" value="${escHtml(m.away_team || '')}">
        </label>

        <button onclick="saveKnockoutMatch(${m.id})">Guardar equipas</button>
      </div>
    `).join('') : '<p class="hint">Não há jogos por atualizar.</p>'}
  `;
}

async function saveKnockoutMatch(matchId){
  const home = $(`ko-home-${matchId}`)?.value.trim();
  const away = $(`ko-away-${matchId}`)?.value.trim();

  if(!home || !away){
    alert('Preenche as duas equipas.');
    return;
  }

  if(home === away){
    alert('As duas equipas não podem ser iguais.');
    return;
  }

  const { error } = await sb
    .from('matches')
    .update({
      home_team: home,
      away_team: away,
      api_fixture_id: null
    })
    .eq('id', matchId);

  if(error){
    alert('Erro ao guardar: ' + error.message);
    return;
  }

  await loadAll();
  alert('Jogo atualizado.');
}
function renderApp(){ injectBetterPredictionStyles(); ensureExtraUi();  $('who').textContent = state.player.name; $('adminBadge').classList.toggle('hidden',!state.player.is_admin); $('adminTabBtn').classList.toggle('hidden',!state.player.is_admin); $('adminBonus').classList.toggle('hidden',!state.player.is_admin); $('adminGroups').classList.toggle('hidden',!state.player.is_admin); if(!state.player.is_admin && activeTab==='admin') activeTab='ranking'; renderRanking(); renderBonus(); renderGroups(); renderMatches(); renderStats(); ensureLiveResultsAdminBox(); renderKnockoutAdminBox(); switchTab(activeTab); }
function playerBreakdown(playerId){
  let matchPts = 0;
  let groupPts = 0;
  let bonusPts = 0;
  const playerPreds = state.predictions.filter(x=>x.player_id===playerId);
  playerPreds.forEach(pr=>{
    const m = state.matches.find(mm=>mm.id===pr.match_id);
    if(m) matchPts += matchPoints(pr,m);
  });
  state.groupPreds.filter(x=>x.player_id===playerId).forEach(gp=>{
    const g = state.groups.find(gg=>gg.id===gp.group_id);
    if(g) groupPts += groupPoints(gp,g);
  });
  bonusPts = bonusPoints(state.bonusPreds.find(x=>x.player_id===playerId));
  const now = Date.now();
  const openMatches = state.matches.filter(m=>!m.kickoff || new Date(m.kickoff).getTime() > now);
  const betMatchIds = new Set(playerPreds.map(p=>p.match_id));
  const missingOpen = openMatches.filter(m=>!betMatchIds.has(m.id));
  return {
    matchPts,
    groupPts,
    bonusPts,
    total: matchPts + groupPts + bonusPts,
    matchBets: new Set(playerPreds.map(p=>p.match_id)).size,
    totalMatches: state.matches.length,
    missingOpenCount: missingOpen.length,
    missingOpen
  };
}

function mvpDaJornadaHtml(){
  const resultedMatches = state.matches
    .filter(m => m.home_score !== null && m.away_score !== null && m.kickoff)
    .sort((a,b) => new Date(b.kickoff) - new Date(a.kickoff));

  if(!resultedMatches.length){
    return `<div class="summary-card"><h3>🏆 MVP da Jornada</h3><p class="hint">Ainda não há jogos com resultado.</p></div>`;
  }

  const latestDate = new Date(resultedMatches[0].kickoff).toLocaleDateString('pt-PT');
  const dayMatches = resultedMatches.filter(m => new Date(m.kickoff).toLocaleDateString('pt-PT') === latestDate);

  const rows = state.players.map(p => {
    let pts = 0;
    let exact = 0;
    let outcomeOnly = 0;

    dayMatches.forEach(m => {
      const pr = state.predictions.find(x => x.player_id === p.id && x.match_id === m.id);
      if(!pr) return;
      const mp = matchPoints(pr, m);
      pts += mp;
      if(mp === 5) exact += 1;
      else if(mp === 3) outcomeOnly += 1;
    });

    return { name:p.name, pts, exact, outcomeOnly };
  }).sort((a,b) => b.pts - a.pts || b.exact - a.exact || a.name.localeCompare(b.name));

  const winners = rows.filter(r => r.pts > 0).slice(0,3);
  const medal = i => i===0 ? '🥇' : i===1 ? '🥈' : '🥉';
  const matchesLabel = dayMatches.length === 1 ? '1 jogo' : `${dayMatches.length} jogos`;

  if(!winners.length){
    return `<div class="summary-card"><h3>🏆 MVP da Jornada</h3><p class="hint">${latestDate} · ${matchesLabel} com resultado, mas ninguém pontuou ainda.</p></div>`;
  }

  return `<div class="summary-card"><h3>🏆 MVP da Jornada</h3><p class="hint">${latestDate} · ${matchesLabel} com resultado</p><div class="mvp-list">${winners.map((r,i)=>`<div class="mvp-row"><b>${medal(i)} ${r.name}</b><span>${r.pts} pts · ${r.exact} exato(s) · ${r.outcomeOnly} vencedor/empate</span></div>`).join('')}</div></div>`;
}

function renderRanking(){
  const rows=state.players.map(p=>{
    const bd = playerBreakdown(p.id);
    return {name:p.name, id:p.id, pts:bd.total, bd};
  }).sort((a,b)=>b.pts-a.pts || a.name.localeCompare(b.name));
  const me = rows.find(r=>r.id===state.player.id);
  const summary = me ? `<div class="summary-card"><h3>O teu resumo</h3><div class="summary-grid"><div><b>${me.bd.matchBets}/${me.bd.totalMatches}</b><span>jogos apostados</span></div><div><b>${me.bd.missingOpenCount}</b><span>jogos por apostar</span></div><div><b>${me.bd.matchPts}</b><span>pts jogos</span></div><div><b>${me.bd.groupPts}</b><span>pts grupos</span></div><div><b>${me.bd.bonusPts}</b><span>pts bónus</span></div><div><b>${me.pts}</b><span>total</span></div></div>${me.bd.missingOpenCount ? `<p class="hint"><b>Próximos por apostar:</b> ${me.bd.missingOpen.slice(0,5).map(m=>`${f(m.home_team)} vs ${f(m.away_team)}`).join(' · ')}${me.bd.missingOpenCount>5?' · ...':''}</p>` : '<p class="hint">Não tens jogos em aberto por apostar.</p>'}</div>` : '';
  const medal = i => i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.º`;
  const top3 = rows.slice(0,3).map((r,i)=>`<div class="podium-card podium-${i+1}"><div class="podium-medal">${medal(i)}</div><div><b>${r.name}</b><span>${r.pts} pts</span></div></div>`).join('');
  const podium = rows.length ? `<div class="podium">${top3}</div>` : '';
  const mvp = mvpDaJornadaHtml();
  $('ranking').innerHTML=summary + mvp + podium + `<table class="table"><tr><th>#</th><th>Nome</th><th>Jogos apostados</th><th>Pts jogos</th><th>Grupos</th><th>Bónus</th><th>Total</th></tr>${rows.map((r,i)=>`<tr class="${i<3?'top-row top-'+(i+1):''}"><td>${medal(i)}</td><td>${r.name}</td><td>${r.bd.matchBets}/${r.bd.totalMatches}</td><td>${r.bd.matchPts}</td><td>${r.bd.groupPts}</td><td>${r.bd.bonusPts}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table>`;
}
function renderBonus(){
  const bp=state.bonusPreds.find(x=>x.player_id===state.player.id)||{};
  const locked = bonusAreLocked();
  const deadlineText = BONUS_PREDICTIONS_DEADLINE.toLocaleString('pt-PT', { dateStyle:'short', timeStyle:'short' });
  $('championInput').value=bp.champion||'';
  $('runnerInput').value=bp.runner_up||'';
  $('scorerInput').value=bp.top_scorer||'';
  ['championInput','runnerInput','scorerInput'].forEach(id=>{ if($(id)) $(id).disabled = locked; });
  if($('saveBonusBtn')){
    $('saveBonusBtn').disabled = locked;
    $('saveBonusBtn').textContent = locked ? 'Bónus bloqueados' : 'Guardar bónus';
  }
  let note = document.getElementById('bonus-lock-note');
  if(!note && $('championInput')){
    note = document.createElement('p');
    note.id = 'bonus-lock-note';
    $('championInput').parentElement?.parentElement?.before(note);
  }
  if(note){
    note.textContent = locked ? `🔒 Apostas bónus bloqueadas desde ${deadlineText}.` : `⏳ Podes alterar as apostas bónus até ${deadlineText}.`;
  }
  const oldReveal = document.getElementById('bonusRevealBox');
  if(oldReveal) oldReveal.remove();
  if(locked && $('scorerInput')){
    const reveal = document.createElement('div');
    reveal.id = 'bonusRevealBox';
    reveal.className = 'bonus-reveal';
    const preds = [...state.bonusPreds].sort((a,b)=>{
      const pa = state.players.find(p=>p.id===a.player_id)?.name || '';
      const pb = state.players.find(p=>p.id===b.player_id)?.name || '';
      return pa.localeCompare(pb);
    });
    reveal.innerHTML = `<h3>👀 Apostas bónus dos jogadores</h3>${preds.length ? `<div class="table-wrap"><table class="table bonus-table">
      <tr><th>Jogador</th><th>Campeão</th><th>Finalista vencido</th><th>Melhor marcador</th><th>Pontos</th></tr>
      ${preds.map(x=>{
        const pl = state.players.find(p=>p.id===x.player_id);
        return `<tr><td><b>${pl?.name || 'Jogador'}</b></td><td>${x.champion || '-'}</td><td>${x.runner_up || '-'}</td><td>${x.top_scorer || '-'}</td><td><b>${bonusPoints(x)}</b></td></tr>`;
      }).join('')}
    </table></div>` : '<p class="hint">Ainda sem apostas bónus.</p>'}`;
    $('scorerInput').parentElement?.parentElement?.after(reveal);
  }
  if(state.player.is_admin){
    $('realChampion').value=state.bonusResults.champion||'';
    $('realRunner').value=state.bonusResults.runner_up||'';
    $('realScorer').value=state.bonusResults.top_scorer||'';
  }
}
async function saveBonus(){
  if(bonusAreLocked()){
    alert('As apostas bónus já estão bloqueadas.');
    return;
  }
  await sb.from('bonus_predictions').upsert({player_id:state.player.id, champion:$('championInput').value, runner_up:$('runnerInput').value, top_scorer:$('scorerInput').value, updated_at:new Date().toISOString()},{onConflict:'player_id'});
  await loadAll();
  alert('Bónus guardado.');
}
async function saveBonusResults(){ await sb.from('bonus_results').upsert({id:1, champion:$('realChampion').value, runner_up:$('realRunner').value, top_scorer:$('realScorer').value, updated_at:new Date().toISOString()}); await loadAll(); alert('Resultados bónus guardados.'); }
function groupsAreLocked(){ return Date.now() >= GROUP_PREDICTIONS_DEADLINE.getTime(); }
function orderSelect(id, teams, selected, disabled=false){ return `<select id="${id}" ${disabled?'disabled':''}>${teams.map(t=>`<option value="${t}" ${t===selected?'selected':''}>${f(t)}</option>`).join('')}</select>`; }
function renderGroups(){
  if(!state.groups.length){ $('groups').innerHTML='<p class="hint">Ainda não há grupos criados.</p>'; $('groupResults').innerHTML=''; return; }
  $('groups').innerHTML = state.groups.map(g=>{
    const locked = groupIsLocked(g);
    const deadlineText = groupDeadline(g).toLocaleString('pt-PT', { dateStyle:'short', timeStyle:'short' });
    const lockNotice = locked ? `<p class="locked-note">🔒 ${g.name} bloqueado desde ${deadlineText}.</p>` : `<p class="open-note">⏳ Podes alterar ${g.name} até ${deadlineText}.</p>`;
    const gp=state.groupPreds.find(x=>x.player_id===state.player.id && x.group_id===g.id);
    const arr=gp?.predicted_order||g.teams;
    const allPreds = state.groupPreds.filter(x=>x.group_id===g.id);
    const visiblePreds = locked
      ? groupPredictionsTableHtml(g, allPreds)
      : `<p class="hint">${allPreds.length}/${state.players.length||9} participantes já apostaram neste grupo. As apostas dos outros ficam escondidas até ao bloqueio.</p>`;
    return `<div class="groupbox"><h3>${g.name}</h3>${lockNotice}<div class="order">${[0,1,2,3].map(i=>`<label>${i+1}.º ${orderSelect(`gp-${g.id}-${i}`,g.teams,arr[i],locked)}</label>`).join('')}</div>${locked ? '<button disabled>Grupo bloqueado</button>' : `<button onclick="saveGroupPrediction(${g.id})">Guardar ${g.name}</button>`}${visiblePreds}</div>`;
  }).join('');

  if(state.player.is_admin){
    $('groupResults').innerHTML=state.groups.map(g=>{
      const arr=g.final_order||g.teams;
      return `<div class="groupbox"><h3>${g.name}</h3><div class="order">${[0,1,2,3].map(i=>`<label>${i+1}.º ${orderSelect(`gr-${g.id}-${i}`,g.teams,arr[i])}</label>`).join('')}</div><button onclick="saveGroupResult(${g.id})">Guardar classificação final</button></div>`;
    }).join('');
  }
}

function groupPredictionsTableHtml(group, allPreds){
  if(!allPreds.length){
    return '<div class="group-reveal"><p class="hint">Ainda sem apostas.</p></div>';
  }

  const sortedPreds = [...allPreds].sort((a,b)=>{
    const pa = state.players.find(p=>p.id===a.player_id)?.name || '';
    const pb = state.players.find(p=>p.id===b.player_id)?.name || '';
    return pa.localeCompare(pb);
  });

  return `<div class="group-reveal">
    <b>Apostas do grupo</b>
    <div class="table-wrap">
      <table class="table predictions-table">
        <tr>
          <th>Jogador</th>
          <th>1.º</th>
          <th>2.º</th>
          <th>3.º</th>
          <th>4.º</th>
        </tr>
        ${sortedPreds.map(x=>{
          const pl = state.players.find(p=>p.id===x.player_id);
          const order = x.predicted_order || [];
          return `<tr>
            <td><b>${pl?.name || 'Jogador'}</b></td>
            <td>${f(order[0] || '')}</td>
            <td>${f(order[1] || '')}</td>
            <td>${f(order[2] || '')}</td>
            <td>${f(order[3] || '')}</td>
          </tr>`;
        }).join('')}
      </table>
    </div>
  </div>`;
}

async function saveGroupPrediction(groupId){ const g=state.groups.find(x=>x.id===groupId); if(groupIsLocked(g)){ alert('As apostas deste grupo já estão bloqueadas.'); return; } const order=[0,1,2,3].map(i=>$(`gp-${groupId}-${i}`).value); if(new Set(order).size!==4){ alert('Não podes repetir equipas no mesmo grupo.'); return; } await sb.from('group_predictions').upsert({player_id:state.player.id, group_id:groupId, predicted_order:order, updated_at:new Date().toISOString()},{onConflict:'player_id,group_id'}); await loadAll(); alert('Aposta do grupo guardada.'); }
async function saveGroupResult(groupId){ const order=[0,1,2,3].map(i=>$(`gr-${groupId}-${i}`).value); if(new Set(order).size!==4){ alert('Não podes repetir equipas.'); return; } await sb.from('groups').update({final_order:order}).eq('id',groupId); await loadAll(); alert('Classificação final guardada.'); }
function isMatchLocked(m){ return !!m.kickoff && new Date(m.kickoff).getTime() <= Date.now(); }
function matchPredictionsHtml(m, locked){
  const preds = state.predictions.filter(x=>x.match_id===m.id);
  const totalPlayers = state.players.length || 9;

  if(!locked){
    return `<div class="bet-count"><b>${preds.length}/${totalPlayers}</b><span>participantes já apostaram</span></div><p class="hint">As apostas dos outros ficam escondidas até o jogo começar.</p>`;
  }

  if(!preds.length) return '<p class="hint">Apostas: ainda sem apostas.</p>';

  const sortedPreds = [...preds].sort((a,b)=>{
    const pa = state.players.find(p=>p.id===a.player_id)?.name || '';
    const pb = state.players.find(p=>p.id===b.player_id)?.name || '';
    return pa.localeCompare(pb);
  });

  return `<div class="bet-count"><b>${preds.length}/${totalPlayers}</b><span>participantes apostaram</span></div>
    <div class="predictions">
      <b>Apostas dos jogadores</b>
      <div class="prediction-cards">
        ${sortedPreds.map(pr=>{
          const player = state.players.find(p=>p.id===pr.player_id);
          const pts = matchPoints(pr,m);
          const hasResult = m.home_score !== null && m.away_score !== null;
          const status = hasResult ? (pts === 5 ? 'Resultado exato' : pts === 3 ? 'Vencedor/empate certo' : 'Falhou') : 'Aposta registada';
          return `<div class="prediction-card">
            <div class="prediction-player">${player?.name || 'Jogador'}</div>
            <div class="prediction-score">${pr.home_prediction}-${pr.away_prediction}</div>
            <div class="prediction-meta">${hasResult ? `${pts} pts · ${status}` : status}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
function missingPlayersForMatch(matchId){
  const preds = state.predictions.filter(x=>x.match_id===matchId);
  const playerIdsWithBet = new Set(preds.map(p=>p.player_id));
  return state.players.filter(p=>!playerIdsWithBet.has(p.id)).map(p=>p.name);
}
async function copyMissingBets(matchId){
  const match = state.matches.find(m=>m.id===matchId);
  const missing = missingPlayersForMatch(matchId);
  const title = match ? `${f(match.home_team)} vs ${f(match.away_team)}` : 'este jogo';
  const text = missing.length
    ? `Mundial dos Hutlers ⚽\nFaltam apostar no jogo ${title}:\n${missing.map(n=>`- ${n}`).join('\n')}`
    : `Mundial dos Hutlers ⚽\nTodos já apostaram no jogo ${title}.`;
  try{
    await navigator.clipboard.writeText(text);
    alert('Texto copiado. Cola no WhatsApp.');
  }catch(e){
    prompt('Copia este texto para o WhatsApp:', text);
  }
}

function missingBetsSummary(){
  const now = Date.now();
  const next24h = now + (24 * 60 * 60 * 1000);
  return state.matches
    .filter(m=>{
      if(!m.kickoff) return false;
      const kickoff = new Date(m.kickoff).getTime();
      return kickoff > now && kickoff <= next24h;
    })
    .map(m=>({ match:m, missing: missingPlayersForMatch(m.id) }))
    .filter(x=>x.missing.length)
    .sort((a,b)=>new Date(a.match.kickoff || 0) - new Date(b.match.kickoff || 0));
}
function missingBetsSummaryHtml(){
  const items = missingBetsSummary();
  if(!items.length){
    return `<div class="summary-card"><h3>📢 Faltas nas próximas 24h</h3><p class="hint">Todos já apostaram nos jogos das próximas 24 horas, ou não há jogos nesse período.</p></div>`;
  }
  const preview = items.slice(0,5).map(x=>`<div class="missing-line"><b>${f(x.match.home_team)} vs ${f(x.match.away_team)}</b><br><span>${new Date(x.match.kickoff).toLocaleString('pt-PT', { dateStyle:'short', timeStyle:'short' })}</span><br><span>Faltam: ${x.missing.join(', ')}</span></div>`).join('');
  const extra = items.length > 5 ? `<p class="hint">+ ${items.length - 5} jogo(s) com faltas nas próximas 24h.</p>` : '';
  return `<div class="summary-card"><h3>📢 Faltas nas próximas 24h</h3>${preview}${extra}<button class="secondary small-btn" onclick="copyMissingBetsSummary()">Copiar resumo para WhatsApp</button></div>`;
}
async function copyMissingBetsSummary(){
  const items = missingBetsSummary();
  const text = items.length
    ? `Mundial dos Hutlers ⚽\n\nFaltam apostas nos jogos das próximas 24h:\n\n${items.map(x=>`${f(x.match.home_team)} vs ${f(x.match.away_team)}\n${new Date(x.match.kickoff).toLocaleString('pt-PT', { dateStyle:'short', timeStyle:'short' })}\n${x.missing.map(n=>`- ${n}`).join('\n')}`).join('\n\n')}`
    : 'Mundial dos Hutlers ⚽\nTodos já apostaram nos jogos das próximas 24 horas, ou não há jogos nesse período.';
  try{
    await navigator.clipboard.writeText(text);
    alert('Resumo das próximas 24h copiado. Cola no WhatsApp.');
  }catch(e){
    prompt('Copia este texto para o WhatsApp:', text);
  }
}
function fixtureStatusHtml(m){
  if(!state.player?.is_admin) return '';
  const hasResult = m.home_score !== null && m.away_score !== null;
  if(hasResult) return '<div class="fixture-status ok">🟢 Resultado atualizado</div>';
  if(m.api_fixture_id) return '<div class="fixture-status pending">🟡 Fixture associada</div>';
  return '<div class="fixture-status missing">🔴 Fixture não associada</div>';
}
function renderSingleMatch(m){
  const pr=state.predictions.find(x=>x.player_id===state.player.id && x.match_id===m.id)||{};
  const locked=isMatchLocked(m);
  const admin = state.player.is_admin ? `<div class="scoreline adminline"><label>Golos ${f(m.home_team)}<input id="rh-${m.id}" type="number" value="${m.home_score??''}"></label><label>Golos ${f(m.away_team)}<input id="ra-${m.id}" type="number" value="${m.away_score??''}"></label><button onclick="saveResult(${m.id})">Guardar resultado</button><button class="secondary" onclick="clearResult(${m.id})">Limpar resultado</button></div>` : '';
  const betArea = locked
    ? `<div class="locked">Apostas bloqueadas</div><div class="small">A tua aposta: ${pr.id?`<b>${pr.home_prediction}-${pr.away_prediction}</b>`:'sem aposta'}</div>`
    : `<div class="scoreline"><label>${f(m.home_team)}<input id="ph-${m.id}" type="number" value="${pr.home_prediction??''}"></label><label>${f(m.away_team)}<input id="pa-${m.id}" type="number" value="${pr.away_prediction??''}"></label><button onclick="savePrediction(${m.id})">Guardar aposta</button></div>`;
  const fixtureStatus = fixtureStatusHtml(m);
  const matchClass = m.home_score!==null && m.away_score!==null ? 'match has-result' : (!m.api_fixture_id ? 'match needs-api' : 'match');
  return `<div class="${matchClass}"><div class="teams">${f(m.home_team)} vs ${f(m.away_team)}</div><div class="small">${m.kickoff?new Date(m.kickoff).toLocaleString('pt-PT'):''}</div>${m.home_score!==null&&m.away_score!==null?`<div class="small"><b>Resultado:</b> ${m.home_score}-${m.away_score}</div>`:''}${fixtureStatus}${betArea}${matchPredictionsHtml(m,locked)}${admin}</div>`;
}
function renderMatchList(matches){
  if(!matches.length) return '<p class="hint">Sem jogos nesta secção.</p>';
  let lastDateKey = '';
  return matches.map(m=>{
    const d = m.kickoff ? new Date(m.kickoff) : null;
    const dateKey = d ? d.toLocaleDateString('pt-PT', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' }) : 'Sem data';
    const dateHeader = dateKey !== lastDateKey ? `<h3 class="date-header">${dateKey}</h3>` : '';
    lastDateKey = dateKey;
    return `${dateHeader}${renderSingleMatch(m)}`;
  }).join('');
}
function matchStatus(m){
  if(m.home_score !== null && m.away_score !== null) return 'completed';
  const kickoff = m.kickoff ? new Date(m.kickoff).getTime() : null;
  if(kickoff && kickoff <= Date.now()) return 'live';
  return 'future';
}
function switchMatchSubtab(tab){
  document.querySelectorAll('[data-match-panel]').forEach(el=>el.classList.toggle('hidden', el.dataset.matchPanel !== tab));
  document.querySelectorAll('[data-match-tab]').forEach(el=>el.classList.toggle('active', el.dataset.matchTab === tab));
}
function renderMatches(){
  if(!state.matches.length){ $('matches').innerHTML='<p class="hint">Ainda não há jogos.</p>'; return; }
  const missingSummary = state.player?.is_admin ? missingBetsSummaryHtml() : '';
  const future = state.matches.filter(m => matchStatus(m)==='future');
  const live = state.matches.filter(m => matchStatus(m)==='live');
  const completed = state.matches.filter(m => matchStatus(m)==='completed');
  $('matches').innerHTML = missingSummary + `<div class="match-subtabs">
    <button class="match-subtab active" data-match-tab="future" onclick="switchMatchSubtab('future')">📅 Futuros (${future.length})</button>
    <button class="match-subtab" data-match-tab="live" onclick="switchMatchSubtab('live')">🔴 A decorrer (${live.length})</button>
    <button class="match-subtab" data-match-tab="completed" onclick="switchMatchSubtab('completed')">✅ Concluídos (${completed.length})</button>
  </div>
  <div class="match-panel" data-match-panel="future">${renderMatchList(future)}</div>
  <div class="match-panel hidden" data-match-panel="live">${renderMatchList(live)}</div>
  <div class="match-panel hidden" data-match-panel="completed">${renderMatchList(completed)}</div>`;
}
async function savePrediction(matchId){ const m=state.matches.find(x=>x.id===matchId); if(m && isMatchLocked(m)){ alert('Este jogo já começou. As apostas estão bloqueadas.'); return; } const h=$(`ph-${matchId}`).value, a=$(`pa-${matchId}`).value; if(h===''||a===''){ alert('Preenche os dois resultados.'); return; } await sb.from('predictions').upsert({player_id:state.player.id, match_id:matchId, home_prediction:Number(h), away_prediction:Number(a)},{onConflict:'player_id,match_id'}); await loadAll(); alert('Aposta guardada.'); }
async function saveResult(matchId){
  const h = $(`rh-${matchId}`).value;
  const a = $(`ra-${matchId}`).value;
  if(h==='' || a===''){
    alert('Preenche os dois golos ou usa Limpar resultado.');
    return;
  }
  await sb.from('matches').update({home_score:Number(h), away_score:Number(a)}).eq('id',matchId);
  await loadAll();
  alert('Resultado guardado.');
}
async function clearResult(matchId){
  if(!confirm('Queres mesmo limpar o resultado deste jogo?')) return;
  await sb.from('matches').update({home_score:null, away_score:null}).eq('id',matchId);
  await loadAll();
  alert('Resultado limpo.');
}
function switchMatchSubtab(tab){
  activeMatchDateKey = tab;
  document.querySelectorAll('[data-match-panel]').forEach(el=>el.classList.toggle('hidden', el.dataset.matchPanel !== tab));
  document.querySelectorAll('[data-match-tab]').forEach(el=>el.classList.toggle('active', el.dataset.matchTab === tab));
}

function matchDateKey(m){
  return m.kickoff ? new Date(m.kickoff).toISOString().slice(0,10) : 'sem-data';
}

function matchDateLabel(key){
  if(key === 'sem-data') return 'Sem data';
  return new Date(key + 'T12:00:00').toLocaleDateString('pt-PT', {
    weekday:'short',
    day:'2-digit',
    month:'short'
  });
}

function renderMatches(){
  if(!state.matches.length){
    $('matches').innerHTML='<p class="hint">Ainda não há jogos.</p>';
    return;
  }

  const missingSummary = state.player?.is_admin ? missingBetsSummaryHtml() : '';
  const grouped = {};

  state.matches.forEach(m=>{
    const key = matchDateKey(m);
    grouped[key] = grouped[key] || [];
    grouped[key].push(m);
  });

  const keys = Object.keys(grouped).sort((a,b)=>{
    if(a === 'sem-data') return 1;
    if(b === 'sem-data') return -1;
    return new Date(a) - new Date(b);
  });

 const todayKey = new Date().toISOString().slice(0,10);
const activeKey = activeMatchDateKey && keys.includes(activeMatchDateKey)
  ? activeMatchDateKey
  : (keys.includes(todayKey) ? todayKey : keys[0]);

activeMatchDateKey = activeKey;

  $('matches').innerHTML = missingSummary + `
    <div class="match-subtabs">
      ${keys.map(key=>`
        <button class="match-subtab ${key===activeKey?'active':''}" data-match-tab="${key}" onclick="switchMatchSubtab('${key}')">
          📅 ${matchDateLabel(key)} (${grouped[key].length})
        </button>
      `).join('')}
    </div>

    ${keys.map(key=>`
      <div class="match-panel ${key===activeKey?'':'hidden'}" data-match-panel="${key}">
        <h3 class="date-header">${matchDateLabel(key)}</h3>
        ${grouped[key].map(m=>renderSingleMatch(m)).join('')}
      </div>
    `).join('')}
  `;
}

function renderStats(){
  if(!$('stats')) return;

  const completed = state.matches.filter(m=>m.home_score!==null && m.away_score!==null);

  if(!completed.length){
    $('stats').innerHTML = '<h2>📊 Estatísticas</h2><p class="hint">Ainda não há jogos com resultado.</p>';
    return;
  }

  const rows = state.players.map(p=>{
    let pts=0, exact=0, outcomeOnly=0, failed=0, bets=0, missed=0;

    completed.forEach(m=>{
      const pr = state.predictions.find(x=>x.player_id===p.id && x.match_id===m.id);

      if(!pr){
        missed++;
        return;
      }

      bets++;
      const mp = matchPoints(pr,m);
      pts += mp;

      if(mp===5) exact++;
      else if(mp===3) outcomeOnly++;
      else failed++;
    });

    return {
      name:p.name,
      pts,
      exact,
      outcomeOnly,
      failed,
      bets,
      missed,
      accuracy: bets ? Math.round(((exact + outcomeOnly) / bets) * 100) : 0,
      exactPct: bets ? Math.round((exact / bets) * 100) : 0,
      avg: bets ? (pts / bets).toFixed(2) : '0.00',
      efficiency: bets ? Math.round((pts / (bets * 5)) * 100) : 0
    };
  }).sort((a,b)=>b.efficiency-a.efficiency || b.pts-a.pts || b.exact-a.exact);

  const bestExact = [...rows].sort((a,b)=>b.exact-a.exact)[0];
  const bestAccuracy = [...rows].sort((a,b)=>b.accuracy-a.accuracy || b.bets-a.bets)[0];
  const bestAvg = [...rows].sort((a,b)=>Number(b.avg)-Number(a.avg))[0];
  const mostBets = [...rows].sort((a,b)=>b.bets-a.bets)[0];

  $('stats').innerHTML = `
    <h2>📊 Estatísticas</h2>

    <div class="stat-cards">
      <div class="stat-card"><span>👑 Rei dos exatos</span><b>${bestExact?.name || '-'}</b><span>${bestExact?.exact || 0} exatos</span></div>
      <div class="stat-card"><span>🎯 Melhor acerto</span><b>${bestAccuracy?.name || '-'}</b><span>${bestAccuracy?.accuracy || 0}% acerto</span></div>
      <div class="stat-card"><span>📈 Melhor média</span><b>${bestAvg?.name || '-'}</b><span>${bestAvg?.avg || '0.00'} pts/jogo</span></div>
      <div class="stat-card"><span>📝 Mais apostador</span><b>${mostBets?.name || '-'}</b><span>${mostBets?.bets || 0}/${completed.length}</span></div>
    </div>

    <div class="table-wrap">
      <table class="table stats-table">
        <tr>
          <th>#</th>
          <th>Jogador</th>
          <th>Eficiência</th>
          <th>% Acerto</th>
          <th>% Exatos</th>
          <th>Média</th>
          <th>Exatos</th>
          <th>Venc./Empate</th>
          <th>Falhas</th>
          <th>Sem aposta</th>
          <th>Pts</th>
        </tr>
        ${rows.map((r,i)=>`
          <tr>
            <td>${i+1}.º</td>
            <td><b>${r.name}</b></td>
            <td><b>${r.efficiency}%</b></td>
            <td>${r.accuracy}%</td>
            <td>${r.exactPct}%</td>
            <td>${r.avg}</td>
            <td>${r.exact}</td>
            <td>${r.outcomeOnly}</td>
            <td>${r.failed}</td>
            <td>${r.missed}</td>
            <td><b>${r.pts}</b></td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}
$('loginBtn').onclick=login; $('logoutBtn').onclick=()=>{localStorage.removeItem('playerId'); location.reload();}; $('saveBonusBtn').onclick=saveBonus; $('saveBonusResultsBtn').onclick=saveBonusResults;
loadAll().then(()=>{ const id=localStorage.getItem('playerId'); if(id){ const p=state.players.find(x=>String(x.id)===id); if(p){ state.player=p; $('login').classList.add('hidden'); $('app').classList.remove('hidden'); renderApp(); } } });

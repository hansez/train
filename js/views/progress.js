// views/progress.js v2

const ProgressView = (() => {
  let activeExId = null;
  let activeMetric = 'volume';

  const render = () => {
    const sessions = DB.getSessions();
    const exercises = DB.getExercises();
    const bodyweights = DB.getBodyweights().sort((a,b)=>new Date(a.date)-new Date(b.date));

    let html = `<div class="view">`;

    if (!sessions.length) {
      html += `<div class="empty-state" style="padding-top:60px;">
        <div class="empty-title">No Data Yet</div>
        <div class="empty-sub">Complete a session to see progress charts.</div>
      </div></div>`;
      return html;
    }

    // BW chart
    if (bodyweights.length > 1) {
      html += `<div class="section-hd"><span class="section-lbl">Bodyweight</span></div>
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">BODYWEIGHT</div>
            <div class="chart-sub">lbs over time</div>
          </div>
          <div class="chart-wrap"><canvas id="bw-chart" height="120"></canvas></div>
        </div>`;
    }

    // Volume per session
    const sortedSessions = sessions.sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-14);
    if (sortedSessions.length > 1) {
      html += `<div class="section-hd"><span class="section-lbl">Session Volume</span></div>
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">VOLUME PER SESSION</div>
            <div class="chart-sub">total lbs lifted</div>
          </div>
          <div class="chart-wrap"><canvas id="vol-chart" height="120"></canvas></div>
        </div>`;
    }

    // PRs
    const exercisesWithData = exercises.filter(ex =>
      sessions.some(s=>(s.groups||[]).some(g=>(g.exercises||[]).some(e=>e.exerciseId===ex.id)))
    );

    if (exercisesWithData.length) {
      html += `<div class="section-hd"><span class="section-lbl">Personal Records</span></div>`;
      exercisesWithData.forEach(ex => {
        const prs = DB.getPRs(ex.id);
        const t = ex.type||'dynamic_weighted';
        html += `<div class="card"><div class="card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="font-family:var(--display);font-weight:700;font-size:0.95rem;">${ex.name}</div>
            <span class="pr-badge">⭐ PR</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">`;
        if (t==='dynamic_weighted') {
          html += prCell(prs.maxWeight>0?prs.maxWeight+'lbs':'—','MAX WEIGHT')
            + prCell(prs.maxReps>0?prs.maxReps:'—','MAX REPS')
            + prCell(prs.maxVol>0?prs.maxVol.toFixed(0):'—','MAX VOL');
        } else if (t==='dynamic_bodyweight') {
          html += prCell(prs.maxReps>0?prs.maxReps:'—','MAX REPS')+'<div></div><div></div>';
        } else if (t==='static_weighted') {
          html += prCell(prs.maxHold>0?prs.maxHold+'s':'—','MAX HOLD')
            + prCell(prs.maxWeight>0?prs.maxWeight+'lbs':'—','MAX WEIGHT')
            + '<div></div>';
        } else {
          html += prCell(prs.maxHold>0?prs.maxHold+'s':'—','MAX HOLD')+'<div></div><div></div>';
        }
        html += `</div></div></div>`;
      });
    }

    // Per-exercise chart
    if (exercisesWithData.length) {
      html += `<div class="section-hd"><span class="section-lbl">Exercise Progress</span></div>
        <div class="filter-row" id="ex-filter">`;
      exercisesWithData.forEach((ex,i) => {
        html += `<div class="filter-chip ${i===0?'active':''}" onclick="ProgressView.selectEx('${ex.id}',this)">${ex.name}</div>`;
      });
      html += `</div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title" id="ex-chart-title">${exercisesWithData[0]?.name||''}</div>
              <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
                ${['volume','weight','reps','seconds','rpe'].map((m,i)=>`
                  <div class="filter-chip ${i===0?'active':''}" style="padding:4px 10px;font-size:0.62rem;" onclick="ProgressView.selectMetric('${m}',this)">${m}</div>`).join('')}
              </div>
            </div>
          </div>
          <div class="chart-wrap"><canvas id="ex-chart" height="140"></canvas></div>
        </div>`;
      if (!activeExId) activeExId = exercisesWithData[0]?.id||null;
    }

    html += `</div>`;
    return html;
  };

  const prCell = (val, lbl) => `
    <div style="text-align:center;padding:10px;background:var(--bg2);border-radius:var(--radius-sm);">
      <div style="font-family:var(--display);font-size:1.1rem;font-weight:800;">${val}</div>
      <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:3px;">${lbl}</div>
    </div>`;

  const drawChart = (canvasId, labels, data, opts={}) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas||!labels.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const w = canvas.parentElement.clientWidth;
    const h = parseInt(canvas.getAttribute('height'))||120;
    canvas.width = w*dpr; canvas.height = h*dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.scale(dpr,dpr);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim();
    const textMuted = style.getPropertyValue('--text3').trim();
    const borderColor = style.getPropertyValue('--border').trim();

    const pad = {top:10, right:14, bottom:26, left:opts.leftPad||46};
    const cw = w-pad.left-pad.right;
    const ch = h-pad.top-pad.bottom;

    ctx.clearRect(0,0,w,h);
    const vals = data.map(v=>parseFloat(v)||0);
    const minV = opts.minZero ? 0 : Math.min(...vals)*0.9;
    const maxV = Math.max(...vals)*1.1||1;
    const xStep = labels.length>1 ? cw/(labels.length-1) : cw;
    const yScale = v => ch - (v-minV)/(maxV-minV)*ch;

    // Gridlines + Y labels
    ctx.strokeStyle = borderColor; ctx.lineWidth = 0.8;
    for (let i=0;i<=4;i++) {
      const y = pad.top + ch/4*i;
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cw,y); ctx.stroke();
      const v = maxV-(maxV-minV)*(i/4);
      ctx.fillStyle = textMuted; ctx.font = `${10}px monospace`; ctx.textAlign='right';
      ctx.fillText(v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(v<10?1:0), pad.left-4, y+3);
    }

    // X labels
    ctx.fillStyle = textMuted; ctx.font = `${10}px monospace`; ctx.textAlign='center';
    const step = Math.ceil(labels.length/6);
    labels.forEach((lbl,i) => {
      if (i%step!==0&&i!==labels.length-1) return;
      ctx.fillText(lbl.slice(5), pad.left+i*xStep, h-4);
    });

    // Area
    ctx.beginPath();
    vals.forEach((v,i) => {
      const x=pad.left+i*xStep, y=pad.top+yScale(v);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.lineTo(pad.left+(vals.length-1)*xStep, pad.top+ch);
    ctx.lineTo(pad.left, pad.top+ch); ctx.closePath();
    const grad = ctx.createLinearGradient(0,pad.top,0,pad.top+ch);
    grad.addColorStop(0,accent+'44'); grad.addColorStop(1,accent+'00');
    ctx.fillStyle=grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.lineJoin='round';
    vals.forEach((v,i) => {
      const x=pad.left+i*xStep, y=pad.top+yScale(v);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Dots
    vals.forEach((v,i) => {
      ctx.beginPath();
      ctx.arc(pad.left+i*xStep, pad.top+yScale(v), 3.5, 0, Math.PI*2);
      ctx.fillStyle=accent; ctx.fill();
    });
  };

  const drawAll = () => {
    // BW
    const bws = DB.getBodyweights().sort((a,b)=>new Date(a.date)-new Date(b.date));
    if (bws.length>1) drawChart('bw-chart', bws.map(b=>b.date), bws.map(b=>b.weight), {minZero:false,leftPad:46});

    // Session volume
    const sessions = DB.getSessions().sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-14);
    if (sessions.length>1) drawChart('vol-chart', sessions.map(s=>s.date), sessions.map(s=>DB.getSessionTotalVolume(s)), {minZero:true});

    // Exercise
    if (activeExId) drawExChart();
  };

  const drawExChart = () => {
    if (!activeExId) return;
    const pts = DB.getExerciseHistory(activeExId, activeMetric);
    if (pts.length>0) drawChart('ex-chart', pts.map(p=>p.date), pts.map(p=>p.val), {minZero:activeMetric!=='rpe'});
  };

  const selectEx = (id, el) => {
    activeExId = id;
    document.querySelectorAll('#ex-filter .filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    const ex = DB.getExercise(id);
    const t = document.getElementById('ex-chart-title');
    if (t&&ex) t.textContent = ex.name;
    drawExChart();
  };

  const selectMetric = (metric, el) => {
    activeMetric = metric;
    el.closest('.chart-card').querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    drawExChart();
  };

  return { render, drawAll, selectEx, selectMetric };
})();

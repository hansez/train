// views/progress.js — Progress & analytics view

const ProgressView = (() => {
  let activeExercise = null;
  let activeMetric = 'volume';

  const render = () => {
    const exercises = DB.getExercises();
    const sessions = DB.getSessions();
    const bodyweights = DB.getBodyweights().sort((a,b)=>new Date(a.date)-new Date(b.date));

    let html = `<div class="view">`;

    if (!sessions.length) {
      html += `
        <div class="empty-state" style="padding-top:60px;">
          <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
          <div class="empty-title">No Data Yet</div>
          <div class="empty-sub">Complete a session to start seeing progress charts.</div>
        </div>`;
      html += `</div>`;
      return html;
    }

    // ---- Bodyweight chart ----
    if (bodyweights.length > 1) {
      html += `
        <div class="section-header"><span class="section-label">Bodyweight</span></div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">BODYWEIGHT TREND</div>
              <div class="chart-sub">lbs over time</div>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas id="bw-chart" height="120"></canvas>
          </div>
        </div>`;
    }

    // ---- Volume per session ----
    const recentSessions = sessions.sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-12);
    if (recentSessions.length > 1) {
      html += `
        <div class="section-header"><span class="section-label">Training Volume</span></div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">VOLUME PER SESSION</div>
              <div class="chart-sub">total lbs lifted</div>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas id="vol-chart" height="120"></canvas>
          </div>
        </div>`;
    }

    // ---- PRs ----
    const exercisesWithData = exercises.filter(ex => {
      return sessions.some(s => (s.exercises||[]).some(e => e.exerciseId === ex.id));
    });

    if (exercisesWithData.length) {
      html += `<div class="section-header"><span class="section-label">Personal Records</span></div>`;
      exercisesWithData.forEach(ex => {
        const prs = DB.getPRs(ex.id);
        html += `
          <div class="card" style="margin:0 12px 8px;">
            <div class="card-body">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="font-weight:600;font-size:0.9rem;">${ex.name}</div>
                <span class="pr-badge">⭐ PR</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr ${ex.isometric?'1fr':'1fr'};gap:8px;">`;
        if (!ex.isometric) {
          html += `
                <div style="text-align:center;padding:8px;background:var(--bg2);border-radius:var(--radius-sm);">
                  <div style="font-family:var(--mono);font-size:1rem;font-weight:500;">${prs.maxWeight > 0 ? prs.maxWeight : '—'}</div>
                  <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">MAX WEIGHT</div>
                </div>
                <div style="text-align:center;padding:8px;background:var(--bg2);border-radius:var(--radius-sm);">
                  <div style="font-family:var(--mono);font-size:1rem;font-weight:500;">${prs.maxReps > 0 ? prs.maxReps : '—'}</div>
                  <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">MAX REPS</div>
                </div>
                <div style="text-align:center;padding:8px;background:var(--bg2);border-radius:var(--radius-sm);">
                  <div style="font-family:var(--mono);font-size:1rem;font-weight:500;">${prs.maxVolume > 0 ? prs.maxVolume.toFixed(0) : '—'}</div>
                  <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">MAX VOL</div>
                </div>`;
        } else {
          html += `
                <div style="text-align:center;padding:8px;background:var(--bg2);border-radius:var(--radius-sm);">
                  <div style="font-family:var(--mono);font-size:1rem;font-weight:500;">${prs.maxHold > 0 ? prs.maxHold+'s' : '—'}</div>
                  <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">MAX HOLD</div>
                </div>`;
        }
        html += `</div></div></div>`;
      });
    }

    // ---- Per-exercise progress chart ----
    if (exercisesWithData.length) {
      html += `<div class="section-header"><span class="section-label">Exercise Progress</span></div>`;
      html += `<div class="exercise-filter" id="ex-filter">`;
      exercisesWithData.forEach((ex, i) => {
        html += `<div class="filter-chip ${i===0?'active':''}" onclick="ProgressView.selectExercise('${ex.id}',this)">${ex.name}</div>`;
      });
      html += `</div>`;
      html += `
        <div class="chart-card" style="margin-top:4px;">
          <div class="chart-header">
            <div>
              <div class="chart-title" id="ex-chart-title">${exercisesWithData[0]?.name||''}</div>
              <div style="display:flex;gap:6px;margin-top:6px;">
                <div class="filter-chip active" style="padding:3px 8px;" onclick="ProgressView.selectMetric('volume',this)">Volume</div>
                <div class="filter-chip" style="padding:3px 8px;" onclick="ProgressView.selectMetric('weight',this)">Max Weight</div>
                <div class="filter-chip" style="padding:3px 8px;" onclick="ProgressView.selectMetric('rpe',this)">RPE</div>
              </div>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas id="ex-chart" height="140"></canvas>
          </div>
        </div>`;
      activeExercise = exercisesWithData[0]?.id || null;
    }

    html += `</div>`;
    return html;
  };

  const drawChart = (canvasId, labels, datasets, opts = {}) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth - 0;
    const h = parseInt(canvas.getAttribute('height')) || 120;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim();
    const accent2 = style.getPropertyValue('--accent2').trim();
    const textMuted = style.getPropertyValue('--text3').trim();
    const borderColor = style.getPropertyValue('--border').trim();
    const bg2 = style.getPropertyValue('--bg2').trim();

    const pad = { top: 10, right: 12, bottom: 28, left: opts.leftPad || 42 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    if (!labels.length || !datasets.length) return;

    // Determine min/max
    const allVals = datasets.flatMap(d => d.data.map(v => parseFloat(v)||0));
    const minVal = opts.minZero ? 0 : Math.min(...allVals) * 0.92;
    const maxVal = Math.max(...allVals) * 1.08 || 1;

    const xStep = labels.length > 1 ? cw / (labels.length - 1) : cw;
    const yScale = (v) => ch - ((parseFloat(v)||0) - minVal) / (maxVal - minVal) * ch;

    // Grid lines
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();

      const val = maxVal - (maxVal - minVal) * (i / 4);
      ctx.fillStyle = textMuted;
      ctx.font = `${9 * dpr / dpr}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0), pad.left - 4, y + 3);
    }

    // X labels
    ctx.fillStyle = textMuted;
    ctx.font = `${9 * dpr / dpr}px monospace`;
    ctx.textAlign = 'center';
    const step = Math.ceil(labels.length / 6);
    labels.forEach((lbl, i) => {
      if (i % step !== 0 && i !== labels.length - 1) return;
      const x = pad.left + i * xStep;
      ctx.fillText(lbl.slice(5), x, h - 6); // show MM-DD
    });

    // Datasets
    datasets.forEach((ds, di) => {
      const color = di === 0 ? accent : accent2;
      const data = ds.data;

      // Area fill
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = pad.left + i * xStep;
        const y = pad.top + yScale(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(pad.left + (data.length - 1) * xStep, pad.top + ch);
      ctx.lineTo(pad.left, pad.top + ch);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
      grad.addColorStop(0, color + '40');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      data.forEach((v, i) => {
        const x = pad.left + i * xStep;
        const y = pad.top + yScale(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      data.forEach((v, i) => {
        const x = pad.left + i * xStep;
        const y = pad.top + yScale(v);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    });
  };

  const drawCharts = () => {
    // BW chart
    const bws = DB.getBodyweights().sort((a,b)=>new Date(a.date)-new Date(b.date));
    if (bws.length > 1) {
      drawChart('bw-chart', bws.map(b=>b.date), [{data: bws.map(b=>b.weight)}], { minZero: false, leftPad: 42 });
    }

    // Volume per session
    const sessions = DB.getSessions().sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-12);
    if (sessions.length > 1) {
      drawChart('vol-chart',
        sessions.map(s=>s.date),
        [{ data: sessions.map(s=>DB.getSessionVolume(s.id)) }],
        { minZero: true }
      );
    }

    // Exercise chart
    if (activeExercise) drawExerciseChart();
  };

  const drawExerciseChart = () => {
    if (!activeExercise) return;
    const sessions = DB.getSessions().sort((a,b)=>new Date(a.date)-new Date(b.date));
    const points = [];

    sessions.forEach(sess => {
      const exLog = (sess.exercises||[]).find(e => e.exerciseId === activeExercise);
      if (!exLog) return;
      let val = 0;
      if (activeMetric === 'volume') {
        (exLog.sets||[]).forEach(s => { val += (parseFloat(s.weight)||0)*(parseInt(s.reps)||1); });
      } else if (activeMetric === 'weight') {
        (exLog.sets||[]).forEach(s => { const w = parseFloat(s.weight)||parseFloat(s.holdDuration)||0; if (w>val) val=w; });
      } else if (activeMetric === 'rpe') {
        const rpes = (exLog.sets||[]).map(s=>parseFloat(s.rpe)||0).filter(v=>v>0);
        val = rpes.length ? rpes.reduce((a,b)=>a+b,0)/rpes.length : 0;
      }
      if (val > 0) points.push({ date: sess.date, val });
    });

    if (points.length > 0) {
      drawChart('ex-chart',
        points.map(p=>p.date),
        [{ data: points.map(p=>p.val) }],
        { minZero: activeMetric !== 'rpe', leftPad: 48 }
      );
    }
  };

  const selectExercise = (id, el) => {
    activeExercise = id;
    document.querySelectorAll('#ex-filter .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const ex = DB.getExercise(id);
    const titleEl = document.getElementById('ex-chart-title');
    if (titleEl && ex) titleEl.textContent = ex.name;
    drawExerciseChart();
  };

  const selectMetric = (metric, el) => {
    activeMetric = metric;
    el.closest('.chart-header').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    drawExerciseChart();
  };

  return { render, drawCharts, selectExercise, selectMetric };
})();

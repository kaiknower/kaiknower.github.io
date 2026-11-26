(() => {
  const root = document.getElementById('roboevo-project');
  const SVG = 'http://www.w3.org/2000/svg';
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];

  /* ---------- run a callback only while an element is on screen ---------- */
  function whenVisible(el, onChange, threshold = 0.2) {
    if (!('IntersectionObserver' in window)) { onChange(true); return; }
    new IntersectionObserver(es => es.forEach(e => onChange(e.isIntersecting)), { threshold }).observe(el);
  }

  /* ---------- reveal on scroll (content stays visible without JS) ---------- */
  document.documentElement.classList.add('js');
  const reveals = $$('.reveal');
  if (REDUCED || !('IntersectionObserver' in window)) reveals.forEach(r => r.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(r => {
      if (r.getBoundingClientRect().top < innerHeight) r.classList.add('in'); else io.observe(r);
    });
  }

  /* ---------- data: Figure 3 of the main paper ---------- */
  // Success (%) and API cost per round (USD). Costs at the first and last round are printed in the figure;
  // the others are read from the plotted points.
  const ROUNDS = {
    libero: {
      hybrid: [30.4, 46.1, 62.9, 68.3, 82.6, 86.0, 86.8, 88.1, 90.5],
      policy: [11.0, 32.1, 42.8, 52.3, 65.6, 76.4, 76.8, 82.9, 84.1],
      cost: [430.63, 379.67, 316.17, 227.86, 156.88, 150.48, 114.46, 105.39, 98.92], costMax: 500
    },
    robotwin: {
      hybrid: [48.84, 58.62, 68.48, 77.10, 85.26, 87.40],
      policy: [46.0, 51.38, 57.82, 64.34, 75.68, 77.50],
      cost: [719.05, 611.26, 495.47, 366.60, 335.11, 323.84], costMax: 800
    }
  };

  /* ---------- hero: the demo's title card, then a typed round of pseudo-code ---------- */
  (function hero() {
    const film = $('#film');
    const code = $('#ch-code'), panel = $('#codehud'), sub = $('#subline'), hudRound = $('#hud-round');
    // one evolution round, as in Sec. 3 of the main paper
    const K = s => ['t-kw', s], F = s => ['t-fn', s], S = s => ['t-str', s], C = s => ['t-cm', s], P = s => ['', s];
    const LINES = [
      [K('for'), P(' r '), K('in'), P(' '), F('range'), P('(R):                  '), C('# round r')],
      [P('    S, F = '), F('rollout'), P('(policy, tasks)   '), C('# the policy acts')],
      [P('    '), K('for'), P(' f '), K('in'), P(' F:                     '), C('# P2H')],
      [P('        runs = '), F('search'), P('(f, ROUTES)    '), C('# Code, +ICL, +Policy')],
      [P('        harness.'), F('merge'), P('('), F('min'), P('(runs, key=jerk))')],
      [P('    policy = '), F('update'), P('(policy,         '), C('# H2P')],
      [P('        sft=S + harness.verified,')],
      [P('        cpd='), F('pairs'), P('(F), ewc='), K('True'), P(')')],
      [P('    '), F('keep_if_better'), P('(harness, policy) '), C('# select')]
    ];
    const SUBS = { 0: 'The policy acts. Its <em>failures</em> are kept.', 2: 'A <em>coding agent</em> repairs each failure in code, along three routes.',
      4: 'The smoothest verified fix is merged into the harness as a <em>skill</em>.', 5: 'The policy learns the fixes, and from its own <em>failures</em>.',
      8: 'Only updates that help are kept. Then the <em>next round</em> begins.' };
    const D = ROUNDS.libero;
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    function lineHTML(segs, n) {
      let out = '', left = n;
      for (const [cls, s] of segs) {
        if (left <= 0) break;
        const part = esc(s.slice(0, left)); left -= s.length;
        out += cls ? `<span class="${cls}">${part}</span>` : part;
      }
      return out;
    }
    function render(li, n, caret) {
      let html = '';
      for (let i = 0; i <= li && i < LINES.length; i++) {
        const full = LINES[i].reduce((a, [, s]) => a + s.length, 0);
        const shown = i < li ? full : n;
        html += `<span class="ch-line${i === li ? ' cur' : ''}"><span class="ch-n">${i + 1}</span>${lineHTML(LINES[i], shown)}${i === li && caret ? '<span class="caret"></span>' : ''}</span>`;
      }
      code.innerHTML = html;
    }
    let subAt = 0;
    function setSub(html) {
      subAt = performance.now();
      sub.classList.add('swap');
      setTimeout(() => { sub.innerHTML = html; sub.classList.remove('swap'); }, 300);
    }
    function setRound(r) { hudRound.textContent = `Round ${r} · standalone ${D.policy[r].toFixed(1)}%`; }
    if (REDUCED) { film.classList.add('run'); render(LINES.length - 1, 999, false); setRound(8); return; }
    panel.classList.add('wait'); sub.classList.add('wait');
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    (async function loop() {
      await sleep(3300);
      film.classList.add('run');
      await sleep(1100);
      panel.classList.remove('wait'); sub.classList.remove('wait');
      let r = 0;
      for (;;) {
        setRound(r);
        for (let li = 0; li < LINES.length; li++) {
          if (SUBS[li]) setSub(SUBS[li]);
          const full = LINES[li].reduce((a, [, s]) => a + s.length, 0);
          for (let n = 0; n <= full; n++) {
            render(li, n, true);
            const ch = LINES[li].map(([, s]) => s).join('')[n - 1];
            await sleep(ch === ' ' ? 3 : 10);
          }
          // the code types fast; each caption still stays up long enough to read
          await sleep(SUBS[li + 1] ? Math.max(350, 1700 - (performance.now() - subAt)) : 150);
        }
        await sleep(2600);
        r = r === 8 ? 0 : r + 1;
        code.innerHTML = '';
        await sleep(400);
      }
    })();
  })();

  /* ---------- tablists ---------- */
  function setupTablist(list, onChange) {
    const tabs = $$('[role="tab"]', list);
    function activate(next, user) {
      tabs.forEach(tab => {
        const sel = tab === next;
        tab.setAttribute('aria-selected', String(sel));
        tab.tabIndex = sel ? 0 : -1;
        const pid = tab.getAttribute('aria-controls');
        if (pid) root.querySelector('#' + pid).hidden = !sel;
      });
      if (onChange) onChange(next, tabs.indexOf(next), user);
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', e => activate(tab, e.isTrusted));
      tab.addEventListener('keydown', e => {
        let n;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i + tabs.length - 1) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        else return;
        e.preventDefault(); activate(tabs[n], true); tabs[n].focus();
      });
    });
    return { activate: i => activate(tabs[i], false), tabs };
  }
  $$('[role="tablist"]').forEach(list => {
    if (list.classList.contains('stage-list') || list.classList.contains('evo-steps')) return;
    setupTablist(list);
  });

  function pressGroup(group, onChange) {
    const buttons = $$('button', group);
    buttons.forEach(b => b.addEventListener('click', () => {
      buttons.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      onChange(b);
    }));
  }
  function playButton(btn, playing, labels) {
    btn.setAttribute('aria-pressed', String(playing));
    btn.querySelector('.cl').textContent = playing ? labels[0] : labels[1];
  }

  const el = (name, attrs, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };
  const f1 = v => v.toFixed(1);
  const usd = v => '$' + v.toFixed(2);

  /* ---------- 01 · co-evolution loop ---------- */
  (function loopViz() {
    const box = $('#loopviz'); if (!box) return;
    const D = ROUNDS.libero, N = D.policy.length;
    const top = $('#lv-top'), bot = $('#lv-bot'), layer = $('#lv-tokens');
    const Ltop = top.getTotalLength(), Lbot = bot.getTotalLength();
    const rOut = $('#lv-r'), pOut = $('#lv-p'), hOut = $('#lv-h'), cOut = $('#lv-c');
    const pBar = $('#lv-pb'), hBar = $('#lv-hb'), cBar = $('#lv-cb');
    const routes = $$('.lv-routes span', box), store = $$('.lv-store span', box);
    const scrub = $('#lv-scrub'), btn = $('#lv-play');
    const codeEl = $('#lv-code'), editEl = $('#lv-edit');
    // one illustrative edit per round, one for each repair type in the supplementary material
    const EDITS = [
      ['placement', [[' ', 'pick(detect("can"))'], [' ', 'move_to(detect("basket"))'], ['-', 'release()'], ['+', 'move_to(dz=-0.08)'], ['+', 'release()']]],
      ['task grounding', [['-', 'grasp(detect("orange juice"))'], ['+', 'grasp(detect("butter"))'], [' ', 'place(on=detect("basket"))']]],
      ['grasp retention', [[' ', 'grasp(detect("cream cheese"))'], ['+', 'if not vlm_check("held?"):'], ['+', '    grasp(target, dz=-0.02)']]],
      ['contact', [[' ', 'h = detect("drawer handle")'], ['-', 'pull(h, fingers="down")'], ['+', 'pull(h, fingers="level",'], ['+', '     hook_behind=True)']]],
      ['placement', [[' ', 'pick(detect("black bowl"))'], ['-', 'place(on=detect("plate"))'], ['+', 'place(on=center_of("plate"))']]],
      ['collision', [[' ', 'hang(mug, on=detect("rack"))'], ['-', 'retreat(up=0.10)'], ['+', 'retreat(away_from="rack")']]],
      ['time budget', [['-', 'move_to(target, steps=120)'], ['+', 'move_to(target, steps=60)'], [' ', 'place(on=detect("basket"))']]],
      ['policy routing', [['-', 'vla_act("pick up the bowl")'], ['+', 'grasp(detect("bowl"))'], [' ', 'vla_act("put it on the plate")']]],
      ['memory reuse', [[' ', '# lesson: check grasp before lift'], ['+', 'grasp(detect("mug"))'], ['+', 'assert vlm_check("held?")']]]
    ];
    const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    function setEdit(r, pending) {
      const [title, lines] = EDITS[r % EDITS.length];
      editEl.textContent = 'Repair · ' + title;
      codeEl.innerHTML = lines.map(([k, s]) => `<span class="${k === '+' ? 'add' : k === '-' ? 'del' : ''}">${k === ' ' ? '  ' : k + ' '}${escH(s)}</span>`).join('');
      box.classList.toggle('pending', !!pending);
    }
    let round = 0, playing = !REDUCED, visible = false, t0 = null, raf = 0, tokens = [], timers = [];
    function show(r) {
      round = r; scrub.value = r; rOut.textContent = r; setEdit(r, false);
      pOut.textContent = f1(D.policy[r]) + '%'; hOut.textContent = f1(D.hybrid[r]) + '%';
      cOut.textContent = (r === 0 || r === N - 1 ? '' : '≈ ') + usd(D.cost[r]);
      pBar.style.width = D.policy[r] + '%'; hBar.style.width = D.hybrid[r] + '%'; cBar.style.width = (D.cost[r] / 500 * 100) + '%';
    }
    function spawn(path, len, cls, n, start, span) {
      for (let i = 0; i < n; i++) {
        const p0 = path.getPointAtLength(0);
        const c = el('circle', { class: 'tok ' + cls, r: 4.6, cx: p0.x, cy: p0.y }, layer);
        tokens.push({ c, path, len, start: start + i * span / Math.max(n, 1), dur: 900 });
      }
    }
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    // one round: failures travel to the harness, it repairs them, verified data travels back, the round advances
    const PERIOD = 3300;
    function schedule(now) {
      const nFail = Math.max(1, Math.round((100 - D.policy[round]) / 9));
      setEdit(round, true);
      spawn(top, Ltop, 'bad', nFail, now, 650);
      later(() => { routes.forEach((s, i) => later(() => s.classList.add('busy'), i * 120));
        box.classList.remove('typing', 'pending'); void box.offsetWidth; box.classList.add('typing'); }, 1350);
      later(() => { routes.forEach(s => s.classList.remove('busy')); store.forEach(s => s.classList.add('pulse')); }, 1950);
      spawn(bot, Lbot, 'good', nFail, now + 1950, 650);
      later(() => store.forEach(s => s.classList.remove('pulse')), 2700);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (t0 === null) { t0 = now; schedule(now); }
      tokens = tokens.filter(tk => {
        const p = (now - tk.start) / tk.dur;
        if (p < 0) return true;
        if (p >= 1) { tk.c.remove(); return false; }
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const pt = tk.path.getPointAtLength(e * tk.len);
        tk.c.setAttribute('cx', pt.x); tk.c.setAttribute('cy', pt.y); tk.c.classList.add('go');
        return true;
      });
      const hold = round === N - 1 ? 1800 : 0;
      if (now - t0 >= PERIOD + hold) { show(round === N - 1 ? 0 : round + 1); t0 = now; schedule(now); }
    }
    function stopAll() {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
      tokens.forEach(tk => tk.c.remove()); tokens = [];
      routes.forEach(s => s.classList.remove('busy')); store.forEach(s => s.classList.remove('pulse'));
    }
    function run() { stopAll(); if (playing && visible) { t0 = null; raf = requestAnimationFrame(frame); } }
    btn.addEventListener('click', () => { playing = !playing; playButton(btn, playing, ['Pause', 'Play']); run(); });
    scrub.addEventListener('input', () => { playing = false; playButton(btn, false, ['Pause', 'Play']); stopAll(); show(+scrub.value); });
    show(REDUCED ? N - 1 : 0);
    playButton(btn, playing, ['Pause', 'Play']);
    whenVisible(box, v => { visible = v; if (!v) stopAll(); else run(); });
  })();

  /* ---------- 02 · stage stepper + round map ---------- */
  (function method() {
    const list = $('.stage-list'), flow = $('#flow'), btn = $('#st-auto'); if (!list || !flow) return;
    const nodes = $$('.fn', flow);
    let auto = !REDUCED, visible = false, timer = 0, stage = 0;
    function apply(i) {
      stage = i; flow.dataset.stage = String(i + 1);
      nodes.forEach(n => n.classList.remove('on'));
      void flow.offsetWidth;   // restart the node animations
      nodes.forEach(n => n.classList.toggle('on', n.dataset.s.split(' ').includes(String(i + 1))));
    }
    const tl = setupTablist(list, (tab, i, user) => {
      apply(i);
      if (user && auto) { auto = false; playButton(btn, false, ['Pause tour', 'Resume tour']); clearInterval(timer); }
    });
    function tick() { tl.activate((stage + 1) % 4); }
    function run() { clearInterval(timer); if (auto && visible) timer = setInterval(tick, 5200); }
    btn.addEventListener('click', () => { auto = !auto; playButton(btn, auto, ['Pause tour', 'Resume tour']); run(); });
    playButton(btn, auto, ['Pause tour', 'Resume tour']);
    apply(0);
    whenVisible(flow, v => { visible = v; if (v) apply(stage); run(); }, 0.25);
  })();

  /* ---------- 03 · three-route replay from the recorded frames ---------- */
  (function replay() {
    const box = $('#replay'); if (!box) return;
    const MAX = 84, FW = 176, FH = 132, COLS = 10, FPS = 11, HOLD = 22, PRE = 10;
    const scrub = $('#rp-scrub'), out = $('#rp-step'), btn = $('#rp-play');
    let t = -PRE, playing = !REDUCED, visible = false, raf = 0, last = 0;
    const lanes = $$('.rp-lane', box).map(lane => {
      const img = new Image();
      const L = { lane, n: +lane.dataset.n, img, ready: false, ctx: lane.querySelector('canvas').getContext('2d'),
        chips: $$('.rp-chips li', lane).map(li => ({ li, at: +li.dataset.at })) };
      img.onload = () => { L.ready = true; draw(L); };
      img.src = 'assets/anim/route-' + lane.dataset.route + '.jpg';
      return L;
    });
    function draw(L) {
      if (!L.ready) return;
      const i = Math.max(0, Math.min(L.n - 1, Math.round(t)));
      L.ctx.imageSmoothingQuality = 'high';
      L.ctx.drawImage(L.img, (i % COLS) * FW, Math.floor(i / COLS) * FH, FW, FH, 0, 0, L.ctx.canvas.width, L.ctx.canvas.height);
    }
    function render() {
      const s = Math.max(0, Math.min(MAX, Math.round(t)));
      scrub.value = s; out.textContent = s + ' / ' + MAX;
      lanes.forEach(L => {
        draw(L);
        const end = s >= L.n - 1;
        L.lane.classList.toggle('started', t > 0);
        L.lane.classList.toggle('done', end);
        L.chips.forEach((c, k) => {
          const prev = k ? L.chips[k - 1].at : -1;
          c.li.classList.toggle('now', !end && (k === 0 ? s <= 0 : s > prev && s <= c.at));
          c.li.classList.toggle('done', s >= c.at);
        });
      });
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!last) last = now;
      t += (now - last) / 1000 * FPS; last = now;
      if (t > MAX + HOLD) t = -PRE;
      render();
    }
    function run() { cancelAnimationFrame(raf); last = 0; if (playing && visible) raf = requestAnimationFrame(frame); }
    btn.addEventListener('click', () => { playing = !playing; if (playing && t >= MAX) t = -PRE; playButton(btn, playing, ['Pause', 'Play']); run(); });
    scrub.addEventListener('input', () => { playing = false; playButton(btn, false, ['Pause', 'Play']); cancelAnimationFrame(raf); t = +scrub.value; render(); });
    if (REDUCED) t = MAX;
    playButton(btn, playing, ['Pause', 'Play']);
    render();
    whenVisible(box, v => { visible = v; run(); });
  })();

  /* ---------- 04 · harness evolution over five steps ---------- */
  (function evolution() {
    const box = $('#evo'); if (!box) return;
    const grid = $('#evo-grid'), svg = $('#evo-links'), say = $('#evo-say'), btn = $('#evo-play');
    const nodes = {}; $$('.en', grid).forEach(n => { nodes[n.dataset.k] = n; });
    const tags = $$('.rev-tag', grid);
    const COL = { Perception: 'var(--c-per)', Grasping: 'var(--c-gra)', Placing: 'var(--c-pla)', Contact: 'var(--c-con)', Policy: 'var(--c-pol)', Motion: 'var(--c-mot)' };
    // memory entries recorded in the LIBERO-PRO harness (supplementary figure)
    const GEN = { 1: [['Grasping', 'One close, then VLM check'], ['Grasping', 'Seat grasp on depth surface'], ['Motion', 'Clear the approach path'], ['Motion', 'Re-localize before retrying'], ['Contact', 'Keep pushing contact'], ['Motion', 'Prefer short plans']],
      3: [['Motion', 'One object at a time'], ['Contact', 'Pull a visible handle'], ['Contact', 'Short contact stroke'], ['Grasping', 'Grasp axis from shape'], ['Perception', 'Other view if occluded']] };
    const EXP = { 2: [['Perception', 'Observe before moving'], ['Grasping', 'Grasp at a depth point'], ['Placing', 'VLM-check retention'], ['Placing', 'Place on visible support'], ['Motion', 'Small clearance move'], ['Contact', 'Keep push contact'], ['Policy', 'Stage a policy attempt']],
      3: [['Motion', 'One object at a time'], ['Contact', 'Pull a visible handle'], ['Contact', 'Short contact stroke'], ['Grasping', 'Grasp axis from shape'], ['Perception', 'Other view if occluded'], ['Motion', 'Act on the last revision']],
      5: [['Placing', 'Side-entry placement'], ['Motion', 'Re-plan on a stall']] };
    const COUNTS = { skills: [10, 13, 16, 17, 18], gen: [6, 6, 11, 11, 11], exp: [0, 7, 13, 13, 15] };
    const SAY = ['', 'Initial harness: robot APIs and generic code skills, with six general-memory entries.',
      'Specialize: three bound skills are derived from the generic ones, Locate Pixel is revised, and seven experiences are recorded.',
      'Compose: Transfer, Drawer Pull and Surface Stroke build on earlier skills; six new experiences, five of them promoted to general memory.',
      'Refine: Cavity Place is added, and five bound skills are revised so that one argument sets the approach length.',
      'Policy Call: subgoals can now be handed to the policy; two more experiences are recorded.'];
    const LINKS = [['pixel', 'bind'], ['grasp', 'bgrasp'], ['bgrasp', 'transfer'], ['bplace', 'transfer'], ['place', 'bplace'], ['bplace', 'cavity'], ['relmove', 'drawer'], ['relmove', 'stroke'], ['polcont', 'polcall']];
    const stepOf = k => +nodes[k].dataset.step;
    let step = 1, auto = !REDUCED, visible = false, timer = 0;

    function rel(elm) {
      const g = grid.getBoundingClientRect(), r = (elm.querySelector('.en-img, .en-card') || elm).getBoundingClientRect();
      return { l: r.left - g.left, r: r.right - g.left, t: r.top - g.top, b: r.bottom - g.top, cx: (r.left + r.right) / 2 - g.left, cy: (r.top + r.bottom) / 2 - g.top };
    }
    function drawLinks(fresh) {
      const W = grid.scrollWidth, H = grid.scrollHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.textContent = '';
      const defs = el('defs', {}, svg);
      const mk = el('marker', { id: 'evo-ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs);
      el('path', { d: 'M0 0 L10 5 L0 10 Z', fill: '#7d84a0' }, mk);
      const add = (d, cls, isNew) => {
        const p = el('path', { d, class: cls }, svg);
        if (cls !== 'rev') p.setAttribute('marker-end', 'url(#evo-ah)');
        if (isNew && !REDUCED) { const L = p.getTotalLength(); p.style.setProperty('--len', L); p.classList.add('grow'); }
      };
      LINKS.forEach(([a, b]) => {
        if (stepOf(b) > step) return;
        const A = rel(nodes[a]), B = rel(nodes[b]);
        const x1 = A.r, y1 = A.cy, x2 = B.l - 2, y2 = B.cy, dx = Math.max(24, (x2 - x1) / 2);
        add(`M${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, '', fresh && stepOf(b) === step);
      });
      tags.forEach(tag => {
        const ts = +tag.dataset.step; if (ts > step) return;
        const T = tag.getBoundingClientRect(), g = grid.getBoundingClientRect();
        const tx = T.left - g.left, ty = (T.top + T.bottom) / 2 - g.top;
        tag.dataset.for.split(' ').forEach(k => {
          const A = rel(nodes[k]);
          const below = A.b < T.top - g.top - 4 && A.r > tx;
          const x1 = below ? A.cx : A.r, y1 = below ? A.b : A.cy;
          add(`M${x1} ${y1} C ${x1 + (below ? 0 : 30)} ${y1 + (below ? 30 : 0)}, ${tx - 30} ${ty}, ${tx} ${ty}`, 'rev', fresh && ts === step);
        });
      });
    }
    function memList(ul, items) {
      ul.textContent = '';
      items.forEach(([cat, txt, cls, isNew]) => {
        const li = document.createElement('li');
        if (cls) li.className = cls;
        if (!isNew || REDUCED) li.style.animation = 'none';
        const sq = document.createElement('i'); sq.style.background = COL[cat];
        li.append(sq, document.createTextNode(txt));
        ul.appendChild(li);
      });
    }
    function setStep(s, animate) {
      const prev = step; step = s;
      $$('.evo-steps button', box).forEach(b => {
        const k = +b.dataset.step;
        b.setAttribute('aria-selected', String(k === s)); b.tabIndex = k === s ? 0 : -1; b.classList.toggle('past', k < s);
      });
      Object.values(nodes).forEach(n => {
        const k = +n.dataset.step, rv = +(n.dataset.rev || 0);
        n.classList.toggle('hide', k > s);
        n.classList.remove('fresh', 'revising');
        if (animate && k === s && k > 1) { void n.offsetWidth; n.classList.add('fresh'); }
        n.classList.toggle('revised', !!rv && s >= rv);
        if (animate && rv === s) { void n.offsetWidth; n.classList.add('revising'); }
      });
      tags.forEach(t => t.classList.toggle('hide', +t.dataset.step > s));
      const gen = [], exp = [];
      GEN[1].forEach(([c, x]) => gen.push([c, x, '', false]));
      if (s >= 3) GEN[3].forEach(([c, x]) => gen.push([c, x, s === 3 ? 'promo' : '', s === 3 && animate]));
      [2, 3, 5].forEach(k => { if (s >= k) EXP[k].forEach(([c, x]) => exp.push([c, x, (s === 3 && k === 3 && GEN[3].some(g => g[1] === x)) ? 'src' : '', k === s && animate])); });
      memList($('#em-gen-list'), gen); memList($('#em-exp-list'), exp);
      const i = s - 1;
      $('#em-gen').textContent = COUNTS.gen[i]; $('#em-exp').textContent = COUNTS.exp[i];
      const sk = $('#em-skills'); sk.textContent = COUNTS.skills[i];
      if (i > 0 && COUNTS.skills[i] > COUNTS.skills[i - 1]) { const sm = document.createElement('small'); sm.textContent = '+' + (COUNTS.skills[i] - COUNTS.skills[i - 1]); sk.appendChild(sm); }
      say.textContent = SAY[s];
      requestAnimationFrame(() => drawLinks(animate && s !== prev));
    }
    const stepBtns = $$('.evo-steps button', box);
    stepBtns.forEach((b, i) => {
      b.addEventListener('click', e => { if (e.isTrusted && auto) { auto = false; playButton(btn, false, ['Pause', 'Play']); clearInterval(timer); } setStep(+b.dataset.step, true); });
      b.addEventListener('keydown', e => {
        let n; if (e.key === 'ArrowRight') n = (i + 1) % 5; else if (e.key === 'ArrowLeft') n = (i + 4) % 5; else return;
        e.preventDefault(); stepBtns[n].click(); stepBtns[n].focus();
      });
    });
    function tick() { setStep(step === 5 ? 1 : step + 1, true); }
    function run() { clearInterval(timer); if (auto && visible) timer = setInterval(tick, 3600); }
    btn.addEventListener('click', () => { auto = !auto; playButton(btn, auto, ['Pause', 'Play']); run(); });
    playButton(btn, auto, ['Pause', 'Play']);
    setStep(REDUCED ? 5 : 1, false);
    if ('ResizeObserver' in window) new ResizeObserver(() => drawLinks(false)).observe(grid);
    $$('img', grid).forEach(im => { if (!im.complete) im.addEventListener('load', () => drawLinks(false), { once: true }); });
    whenVisible(box, v => { visible = v; run(); }, 0.25);
  })();

  /* ---------- 05 · failure-aware task sampling (Eq. 4), illustrative success rates ---------- */
  (function sampler() {
    const TASKS = [['A', 0.95], ['B', 0.85], ['C', 0.70], ['D', 0.45], ['E', 0.20], ['F', 0.05]];
    const rows = $('#sampler-rows'), gamma = $('#gamma'), gammaOut = $('#gamma-out');
    if (!rows || !gamma) return;
    const K = TASKS.length, uniform = 1 / K, scale = 0.5;
    const bars = TASKS.map(([name, s]) => {
      const row = document.createElement('div');
      row.className = 'srow';
      row.innerHTML = `<span>Task ${name} · ŝ ${Math.round(s * 100)}%</span><div class="strack"><i></i><u style="left:${uniform / scale * 100}%"></u></div><b></b>`;
      rows.appendChild(row);
      return row;
    });
    function update() {
      const g = parseFloat(gamma.value);
      gammaOut.value = g.toFixed(1); gammaOut.textContent = g.toFixed(1);
      const w = TASKS.map(([, s]) => Math.pow(1 - s, g));
      const sum = w.reduce((a, b) => a + b, 0);
      bars.forEach((row, k) => {
        const p = 1 / (2 * K) + w[k] / (2 * sum);
        row.querySelector('i').style.width = Math.min(100, p / scale * 100) + '%';
        row.querySelector('b').textContent = (p * 100).toFixed(1) + '%';
      });
    }
    gamma.addEventListener('input', update);
    update();
  })();

  /* ---------- 06 · Figure 3 round chart ---------- */
  (function roundsChart() {
    const chartBox = $('#rounds-chart'), readout = $('#rounds-readout'), gains = $('#rounds-gains'), seg = $('.rounds-box .seg');
    if (!chartBox || !seg) return;
    let W = 760, H = 330, L = 44, R = 62, T = 24, B = 40, current = 'libero';
    function drawRounds(key) {
      current = key;
      const box = Math.round(chartBox.clientWidth || 760);
      W = Math.max(300, Math.min(760, box));
      const narrow = W < 520;
      H = narrow ? 250 : 330; L = narrow ? 34 : 44; R = narrow ? 48 : 62;
      const d = ROUNDS[key], n = d.hybrid.length;
      const x = i => L + i * (W - L - R) / (n - 1);
      const ys = v => H - B - v / 100 * (H - T - B);
      const yc = v => H - B - v / d.costMax * (H - T - B);
      chartBox.textContent = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': (key === 'libero' ? 'LIBERO-PRO' : 'RoboTwin C2R') + ': success rises and API cost falls over rounds' }, chartBox);
      for (let v = 0; v <= 100; v += 20) {
        el('line', { x1: L, x2: W - R, y1: ys(v), y2: ys(v), class: 'rc-grid' }, svg);
        el('text', { x: L - 8, y: ys(v) + 4, 'text-anchor': 'end', class: 'rc-axis' }, svg).textContent = v;
        el('text', { x: W - R + 8, y: ys(v) + 4, class: 'rc-axis cost' }, svg).textContent = '$' + (v / 100 * d.costMax);
      }
      el('text', { x: 0, y: T - 10, class: 'rc-title' }, svg).textContent = 'SUCCESS %';
      el('text', { x: W - R + 8, y: T - 10, class: 'rc-title' }, svg).textContent = 'USD';
      for (let i = 0; i < n; i++) el('text', { x: x(i), y: H - B + 20, 'text-anchor': 'middle', class: 'rc-axis' }, svg).textContent = i;
      el('text', { x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle', class: 'rc-title' }, svg).textContent = 'ROUND';
      const path = (vals, y) => vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
      el('path', { d: path(d.policy, ys) + ` L${x(n - 1)} ${ys(0)} L${x(0)} ${ys(0)} Z`, class: 'rc-area' }, svg);
      el('path', { d: path(d.cost, yc), class: 'rc-line cost' }, svg);
      el('path', { d: path(d.policy, ys), class: 'rc-line policy' }, svg);
      el('path', { d: path(d.hybrid, ys), class: 'rc-line hybrid' }, svg);
      const guide = el('line', { x1: 0, x2: 0, y1: T, y2: H - B, class: 'rc-guide' }, svg);
      const tris = d.cost.map((v, i) => el('path', { d: `M${x(i)} ${yc(v) - 5} l5 8.5 h-10 Z`, class: 'rc-tri' }, svg));
      const pd = d.policy.map((v, i) => el('circle', { cx: x(i), cy: ys(v), r: 4, class: 'rc-dot policy' }, svg));
      const hd = d.hybrid.map((v, i) => el('circle', { cx: x(i), cy: ys(v), r: 4, class: 'rc-dot hybrid' }, svg));
      el('text', { x: x(n - 1) - 6, y: ys(d.hybrid[n - 1]) - 12, 'text-anchor': 'end', class: 'rc-label hybrid' }, svg).textContent = f1(d.hybrid[n - 1]) + '%';
      el('text', { x: x(n - 1) - 6, y: ys(d.policy[n - 1]) + 22, 'text-anchor': 'end', class: 'rc-label policy' }, svg).textContent = f1(d.policy[n - 1]) + '%';
      el('text', { x: x(0) + 10, y: ys(d.policy[0]) + 18, class: 'rc-label policy' }, svg).textContent = f1(d.policy[0]) + '%';
      el('text', { x: x(0) + 10, y: yc(d.cost[0]) - 8, class: 'rc-label cost' }, svg).textContent = usd(d.cost[0]);
      el('text', { x: x(n - 1) - 8, y: yc(d.cost[n - 1]) + 20, 'text-anchor': 'end', class: 'rc-label cost' }, svg).textContent = usd(d.cost[n - 1]);
      function focusRound(i) {
        guide.setAttribute('x1', x(i)); guide.setAttribute('x2', x(i));
        pd.forEach((c, j) => c.setAttribute('r', j === i ? 6.5 : 4));
        hd.forEach((c, j) => c.setAttribute('r', j === i ? 6.5 : 4));
        tris.forEach((t, j) => t.setAttribute('transform', j === i ? `translate(${x(j)} ${yc(d.cost[j])}) scale(1.4) translate(${-x(j)} ${-yc(d.cost[j])})` : ''));
        const exact = i === 0 || i === n - 1;
        readout.innerHTML = `<span>Round ${i}</span><span class="r-h">Hybrid ${f1(d.hybrid[i])}%</span><span class="r-p">Standalone ${f1(d.policy[i])}%</span><span class="r-c">API ${exact ? '' : '≈ '}${usd(d.cost[i])}</span>`;
      }
      const step = (W - L - R) / (n - 1);
      for (let i = 0; i < n; i++) {
        const hit = el('rect', { x: x(i) - step / 2, y: T, width: step, height: H - T - B, class: 'rc-hit', tabindex: 0, role: 'button', 'aria-label': `Round ${i}` }, svg);
        hit.addEventListener('mouseenter', () => focusRound(i));
        hit.addEventListener('focus', () => focusRound(i));
        hit.addEventListener('click', () => focusRound(i));
      }
      focusRound(n - 1);
      const cDrop = (1 - d.cost[n - 1] / d.cost[0]) * 100;
      gains.innerHTML = `<span>Standalone <b>+${f1(d.policy[n - 1] - d.policy[0])} pp</b></span><span>Hybrid <b>+${f1(d.hybrid[n - 1] - d.hybrid[0])} pp</b></span><span>API cost <b>−${f1(cDrop)}%</b></span>`;
    }
    pressGroup(seg, b => drawRounds(b.dataset.bench));
    drawRounds('libero');
    let lastW = chartBox.clientWidth, timer;
    if ('ResizeObserver' in window) new ResizeObserver(() => {
      if (Math.abs(chartBox.clientWidth - lastW) < 8) return;
      lastW = chartBox.clientWidth; clearTimeout(timer); timer = setTimeout(() => drawRounds(current), 120);
    }).observe(chartBox);
  })();

  /* ---------- 07 · before/after comparison ---------- */
  $$('.cmp').forEach(cmp => {
    const input = cmp.querySelector('input');
    const set = v => cmp.style.setProperty('--pos', v + '%');
    input.addEventListener('input', () => set(input.value));
    if (REDUCED) return;
    let done = false;
    whenVisible(cmp, v => {
      if (!v || done) return; done = true;
      const keys = [[0, 50], [700, 88], [1500, 12], [2200, 50]], t0 = performance.now();
      (function anim(now) {
        const t = now - t0; let k = 0;
        while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
        const [ta, va] = keys[k], [tb, vb] = keys[k + 1];
        const p = Math.max(0, Math.min(1, (t - ta) / (tb - ta))), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const val = va + (vb - va) * e; set(val); input.value = Math.round(val);
        if (t < keys[keys.length - 1][0]) requestAnimationFrame(anim);
      })(t0);
    }, 0.5);
  });
  const filter = $('.repair-filter');
  if (filter) pressGroup(filter, b => {
    const r = b.dataset.route;
    $$('.repair').forEach(card => { card.hidden = !(r === 'all' || card.dataset.route === r); });
  });

  /* ---------- one video at a time ---------- */
  root.addEventListener('play', ev => {
    if (ev.target.tagName === 'VIDEO') $$('video').forEach(o => { if (o !== ev.target && !o.paused) o.pause(); });
  }, true);
  $$('details').forEach(box => box.addEventListener('toggle', () => {
    if (!box.open) box.querySelectorAll('video').forEach(v => v.pause());
  }));
})();

(() => {
  const btn = document.querySelector('.bib-copy');
  const text = document.getElementById('bib-text');
  if (!btn || !text) return;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text.textContent); btn.textContent = 'Copied'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(text); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
  });
})();

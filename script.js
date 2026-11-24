(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const scrollToId = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  /* =========================================================
     SOUND (synthesized, off by default)
     ========================================================= */
  let soundOn = store.get('sound', false);
  let actx = null;
  const tone = (f0, f1, dur, wave = 'square', vol = 0.06, delay = 0) => {
    const t = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  const NOTES = [330, 392, 494, 587];
  const sfx = (type, arg) => {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (type === 'pop') tone(620, 160, 0.12);
      else if (type === 'note') tone(NOTES[arg] || 440, NOTES[arg] || 440, 0.22, 'triangle', 0.08);
      else if (type === 'slash') { tone(2400, 300, 0.14, 'sawtooth', 0.05); tone(180, 60, 0.2, 'square', 0.05); }
      else if (type === 'buzz') tone(140, 90, 0.35, 'sawtooth', 0.07);
      else if (type === 'splat') { tone(320, 50, 0.18, 'sawtooth', 0.08); tone(900, 200, 0.06, 'square', 0.03); }
      else if (type === 'key') tone(1200, 900, 0.025, 'square', 0.02);
      else if (type === 'chime') [660, 880, 1320].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.08, i * 0.09));
      else if (type === 'power') { tone(110, 880, 0.6, 'sawtooth', 0.07); tone(220, 1760, 0.6, 'square', 0.03, 0.05); }
    } catch (e) {}
  };
  const soundBtn = $('#soundToggle');
  const renderSound = () => soundBtn.setAttribute('aria-pressed', soundOn);
  renderSound();
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound', soundOn);
    renderSound();
    sfx('chime');
  });

  /* =========================================================
     SFX WORD POPS
     ========================================================= */
  const words = ['BAM!', 'POW!', 'ZAP!', 'WHAM!', 'BOOM!', 'KA-POW!', 'ドン!', 'バン!', 'ゴゴゴ', 'ズバッ'];
  const popWord = (x, y, word, big) => {
    if (reduceMotion) return;
    const pop = document.createElement('span');
    pop.className = 'sfx-pop' + (/[぀-ヿ]/.test(word) ? ' jp' : '') + (big ? ' big' : '');
    pop.textContent = word;
    pop.setAttribute('aria-hidden', 'true');
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
    pop.style.setProperty('--r', (Math.random() * 30 - 15).toFixed(1) + 'deg');
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  };
  const NO_POP = 'input, textarea, select, label, .terminal, .game-area, .minigames, .move, dialog, .trophy-list, .trophy, #soundToggle';
  document.addEventListener('click', e => {
    if (e.detail === 0 || e.target.closest(NO_POP)) return; // skip keyboard clicks & interactive widgets
    popWord(e.clientX, e.clientY, words[Math.floor(Math.random() * words.length)]);
    sfx('pop');
  });

  /* =========================================================
     ACHIEVEMENTS
     ========================================================= */
  const ACH = [
    { id: 'hacker', name: 'Hacker Voice', desc: 'Run a command in the terminal.' },
    { id: 'combo', name: 'Combo Master', desc: 'Use all four special moves.' },
    { id: 'archivist', name: 'Archivist', desc: 'Open a story arc file.' },
    { id: 'moei', name: 'Mission Briefing', desc: 'Read the MOEI mission file.' },
    { id: 'slayer', name: 'Bug Slayer', desc: 'Squash 10+ bugs in one round.' },
    { id: 'samurai', name: 'Fastest Draw', desc: 'Win a duel in under 250 ms.' },
    { id: 'pipeline', name: 'Pipeline Pro', desc: 'Clear level 6 in Deploy Combo.' },
    { id: 'ink', name: 'Ink Master', desc: 'Invert the ink.' },
    { id: 'finale', name: 'To Be Continued', desc: 'Read to the very last page.' },
    { id: 'root', name: 'Root Access', desc: 'Find the one sudo command that works.', secret: true },
    { id: 'konami', name: 'Secret Technique', desc: 'Enter the ancient code.', secret: true }
  ];
  const unlocked = new Set(store.get('ach', []).filter(id => ACH.some(a => a.id === id)));
  const trophyBtn = $('#trophyBtn');
  const trophyList = $('#trophyList');
  const toasts = $('#toasts');

  const renderAch = () => {
    $('#trophyCount').textContent = unlocked.size;
    $('#trophyBtn .of').textContent = '/' + ACH.length;
    trophyBtn.setAttribute('aria-label', `Achievements: ${unlocked.size} of ${ACH.length} unlocked`);
    $('#trophyItems').innerHTML = ACH.map(a => {
      const got = unlocked.has(a.id);
      const show = got || !a.secret;
      return `<li class="${got ? 'got' : ''}"><i aria-hidden="true">${got ? '★' : '?'}</i><span><strong>${show ? a.name : '???'}</strong><small>${show ? a.desc : 'A secret technique. Keep exploring…'}</small></span></li>`;
    }).join('');
  };
  const toast = (title, label = 'Achievement unlocked', icon = '★') => {
    const dlg = document.getElementById('arcModal');
    if (dlg && dlg.open) { // dialogs sit above everything — show the toast once it closes
      dlg.addEventListener('close', () => toast(title, label, icon), { once: true });
      return;
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<i aria-hidden="true">${icon}</i><span><small>${label}</small><strong>${title}</strong></span>`;
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3600);
  };
  const unlock = id => {
    if (unlocked.has(id)) return;
    const a = ACH.find(x => x.id === id);
    if (!a) return;
    unlocked.add(id);
    store.set('ach', [...unlocked]);
    renderAch();
    toast(a.name);
    sfx('chime');
    trophyBtn.classList.remove('bump');
    void trophyBtn.offsetWidth;
    trophyBtn.classList.add('bump');
    if (unlocked.size === ACH.length) setTimeout(() => toast('You read the whole volume!', 'Full clear · 100%', '👑'), 900);
  };
  renderAch();

  const setTrophyOpen = open => {
    trophyList.hidden = !open;
    trophyBtn.setAttribute('aria-expanded', open);
  };
  trophyBtn.addEventListener('click', () => setTrophyOpen(trophyList.hidden));
  document.addEventListener('click', e => {
    if (!trophyList.hidden && !e.target.closest('#trophyList, #trophyBtn')) setTrophyOpen(false);
  });

  /* =========================================================
     READING PROGRESS
     ========================================================= */
  const progress = $('#progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========================================================
     PANELS SLAM IN ON SCROLL
     ========================================================= */
  const reveals = $$('.reveal');
  const finish = el => el.classList.remove('reveal', 'in');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const delay = Math.min([...el.parentElement.children].indexOf(el), 4) * 90;
        setTimeout(() => {
          el.classList.add('in');
          const done = ev => { if (ev.target === el) { el.removeEventListener('animationend', done); finish(el); } };
          el.addEventListener('animationend', done);
        }, delay);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(finish);
  }

  /* ---------- Skill bars charge up ---------- */
  const bars = $('.bars');
  if (bars) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) { bars.classList.add('charged'); obs.disconnect(); }
      }, { threshold: 0.3 }).observe(bars);
    } else {
      bars.classList.add('charged');
    }
  }

  /* ---------- Count-up stats ---------- */
  const counters = $$('[data-count]');
  const runCount = el => {
    const target = +el.dataset.count;
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / 1200, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  } else {
    counters.forEach(c => (c.textContent = c.dataset.count));
  }

  /* =========================================================
     COVER: talking bubble + eyes that follow you
     ========================================================= */
  const bubble = $('#heroBubble');
  const typeTarget = $('#typeTarget');
  const lines = [
    "Hi! I'm a Forward Deployed Engineer at MOEI. I go where the problem is and ship the fix. Ready for my story?",
    'Forward Deployed = I sit with the people who use the software, then build exactly what they need.',
    'Psst… the terminal in Chapter 01 actually works. Try typing help, or moei.',
    'I also study at 42 Abu Dhabi and IIT Madras. Sleep is a side quest.',
    'Three mini-games are hiding near the end of this volume. Think you can beat my scores?',
    `Collect all ${ACH.length} achievements. The ★ counter at the top is watching.`,
    'Okay, okay — scroll down already! The story is waiting.'
  ];
  let lineIdx = 0;
  let typeTimer = 0;
  const typeLine = text => {
    clearTimeout(typeTimer);
    if (reduceMotion) { typeTarget.textContent = text; return; }
    typeTarget.textContent = '';
    let i = 0;
    const step = () => {
      typeTarget.textContent = text.slice(0, ++i);
      if (i < text.length) typeTimer = setTimeout(step, /[.!?…]/.test(text[i - 1]) ? 240 : 28);
    };
    step();
  };
  if (!reduceMotion) { typeTarget.textContent = ''; typeTimer = setTimeout(() => typeLine(lines[0]), 600); }
  const nextLine = () => {
    lineIdx = (lineIdx + 1) % lines.length;
    typeLine(lines[lineIdx]);
  };
  bubble.addEventListener('click', nextLine);
  bubble.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextLine(); }
  });

  const eyes = $('.silhouette .eyes');
  const silhouette = $('.silhouette');
  if (eyes && finePointer && !reduceMotion) {
    let raf = 0;
    addEventListener('pointermove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = silhouette.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width * 0.5);
        const dy = e.clientY - (r.top + r.height * 0.45);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(d / 260, 1);
        eyes.setAttribute('transform', `translate(${(dx / d * 6 * k).toFixed(2)} ${(dy / d * 4 * k).toFixed(2)})`);
      });
    }, { passive: true });
  }

  /* =========================================================
     INK TOGGLE
     ========================================================= */
  const toggleInk = () => {
    const root = document.documentElement;
    const inverted = root.dataset.ink === 'inverted';
    if (inverted) delete root.dataset.ink; else root.dataset.ink = 'inverted';
    try { localStorage.setItem('ink', inverted ? 'paper' : 'inverted'); } catch (e) {}
    unlock('ink');
  };
  $('#inkToggle').addEventListener('click', toggleInk);

  /* =========================================================
     SPECIAL MOVES (tap to activate)
     ========================================================= */
  const usedMoves = new Set();
  $$('.move').forEach((card, i) => {
    const btn = $('.move-trigger', card);
    card.addEventListener('click', () => {
      const on = card.classList.toggle('flipped');
      btn.setAttribute('aria-expanded', on);
      if (!on) return;
      const r = card.getBoundingClientRect();
      popWord(r.left + r.width / 2, r.top + r.height / 2, card.dataset.sfx, true);
      sfx('power');
      usedMoves.add(i);
      if (usedMoves.size === $$('.move').length) unlock('combo');
    });
  });

  /* =========================================================
     STORY ARCS: filters, tilt, reader
     ========================================================= */
  const projects = $$('.project');
  const filters = $$('.filter');
  filters.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filter;
    filters.forEach(x => x.setAttribute('aria-pressed', x === b));
    projects.forEach(p => p.classList.toggle('dim', f !== 'all' && !p.dataset.cat.split(' ').includes(f)));
  }));

  if (finePointer && !reduceMotion) {
    projects.forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translate(-4px, -4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  const modal = $('#arcModal');
  let cur = 0;
  const openProject = i => {
    cur = (i + projects.length) % projects.length;
    const p = projects[cur];
    $('#arcNum').textContent = 'ARC ' + String(cur + 1).padStart(2, '0');
    $('#arcTitle').textContent = $('h3', p).textContent;
    $('#arcBody').innerHTML = $('.project-more', p).innerHTML + $('.tags', p).outerHTML;
    $('#arcLinks').innerHTML = $$('.project-links a', p).map(a => a.outerHTML).join('');
    if (!modal.open) {
      if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    } else if (!reduceMotion) {
      modal.classList.remove('turn'); void modal.offsetWidth; modal.classList.add('turn');
    }
    sfx('pop');
    unlock('archivist');
    if (p.dataset.key === 'moei') unlock('moei');
  };
  const closeModal = () => { if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open'); };
  projects.forEach((p, i) => {
    $('.open-arc', p).addEventListener('click', () => openProject(i));
    $('.art', p).addEventListener('click', () => openProject(i));
  });
  $('#arcClose').addEventListener('click', closeModal);
  $('#arcPrev').addEventListener('click', () => openProject(cur - 1));
  $('#arcNext').addEventListener('click', () => openProject(cur + 1));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  modal.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') openProject(cur - 1);
    if (e.key === 'ArrowRight') openProject(cur + 1);
  });

  /* =========================================================
     AWAKENED MODE (the ancient code)
     ========================================================= */
  let awakenTimer = 0;
  const awaken = () => {
    const root = document.documentElement;
    root.classList.add('awakened');
    const burst = document.createElement('div');
    burst.className = 'awaken-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.innerHTML = '<span>覚醒!!</span>';
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 2300);
    clearTimeout(awakenTimer);
    awakenTimer = setTimeout(() => root.classList.remove('awakened'), 8000);
    sfx('power');
    unlock('konami');
  };

  /* =========================================================
     TERMINAL
     ========================================================= */
  const term = $('#terminal');
  const termOut = $('#termOut');
  const termForm = $('#termForm');
  const termIn = $('#termIn');
  const hist = [];
  let histPos = 0;

  const print = (html, cls = 'out') => {
    const c = document.createElement('code');
    c.className = cls;
    c.innerHTML = html;
    termOut.appendChild(c);
    termOut.scrollTop = termOut.scrollHeight;
  };
  const CHAPTERS = {
    '~': 'cover', cover: 'cover', home: 'cover',
    1: 'ch1', origin: 'ch1', about: 'ch1',
    2: 'ch2', powers: 'ch2', skills: 'ch2',
    3: 'ch3', arcs: 'ch3', projects: 'ch3',
    4: 'ch4', training: 'ch4', experience: 'ch4',
    5: 'ch5', contact: 'ch5',
    bonus: 'bonus', game: 'bonus', bugs: 'bonus'
  };
  const findProject = arg => {
    if (!arg) return -1;
    if (/^\d+$/.test(arg)) return +arg - 1 < projects.length ? +arg - 1 : -1;
    return projects.findIndex(p => p.dataset.key === arg || $('h3', p).textContent.toLowerCase().includes(arg));
  };

  const COMMANDS = {
    help: () => print(
`<b>help</b>        list commands
<b>whoami</b>      who is this?
<b>skills</b>      power levels
<b>ls</b>          list story arcs
<b>open</b> &lt;n&gt;    read an arc file (try: open 1)
<b>education</b>   training grounds
<b>contact</b>     how to reach me
<b>goto</b> &lt;ch&gt;   jump to a chapter (1-5, bonus)
<b>moei</b>        my current mission
<b>game</b>        play the side quests
<b>ink</b> · <b>sound</b> toggle ink / sound
<b>clear</b>       clear the screen
…and a few secrets 👀 (try <b>hint</b>)`),
    whoami: () => print('Fathima Fidha — Forward Deployed Engineer @ MOEI (UAE Ministry of Energy &amp; Infrastructure).\nBackend developer · 42 Abu Dhabi · Bachelor in Data Science @ IIT Madras · Abu Dhabi, UAE'),
    moei: () => {
      print(
`<b>CURRENT MISSION</b> ── UAE Ministry of Energy &amp; Infrastructure
role      Forward Deployed Engineer
status    <span class="ok">● deployed</span>
loadout   discovery · rapid prototyping · integrations · AI &amp; data · production support
briefing  embedded with ministry teams, turning real needs into shipped software

Opening the mission file…`);
      const i = projects.findIndex(p => p.dataset.key === 'moei');
      if (i >= 0) setTimeout(() => openProject(i), 700);
    },
    skills: () => print($$('.bars li').map(li => {
      const name = $('span', li).textContent.padEnd(17, ' ');
      const lv = parseInt(li.style.getPropertyValue('--lv'), 10) || 0;
      const n = Math.round(lv / 10);
      return `${esc(name)}${'█'.repeat(n)}${'░'.repeat(10 - n)} ${lv}`;
    }).join('\n')),
    ls: () => print(projects.map((p, i) => `<b>${String(i + 1).padStart(2, '0')}</b>  ${esc(p.dataset.key.padEnd(8, ' '))} ${esc($('h3', p).textContent)}`).join('\n') + '\n\nType <b>open 1</b> to read one.'),
    open: arg => {
      const i = findProject(arg);
      if (i < 0) return print(arg ? `open: ${esc(arg)}: no such arc. Try <b>ls</b>.` : 'usage: open &lt;number|name&gt;', 'err');
      print(`Opening ${esc($('h3', projects[i]).textContent)}…`);
      openProject(i);
    },
    education: () => print('42 Abu Dhabi ......... Software Development Diploma (2023 – present)\nIIT Madras ........... Bachelor in Data Science (2023 – present)'),
    contact: () => {
      const email = $('#contactForm').dataset.email;
      print(`email     <a href="mailto:${esc(email)}">${esc(email)}</a>\ngithub    <a href="https://github.com/fkuruthl" target="_blank" rel="noopener">github.com/fkuruthl</a>\nlinkedin  <a href="https://linkedin.com/in/fathima-fidha-a3914323a" target="_blank" rel="noopener">linkedin.com/in/fathima-fidha-a3914323a</a>`);
    },
    goto: arg => {
      const id = CHAPTERS[arg];
      if (!id) return print('usage: goto &lt;1-5 | bonus | cover&gt;', 'err');
      print(`→ jumping to ${id === 'cover' ? 'the cover' : id === 'bonus' ? 'the bonus chapter' : 'chapter ' + id.slice(2)}…`);
      setTimeout(() => scrollToId(id), 350);
    },
    game: () => { print('Loading side quests: Bug Hunt 🐛 · Quick-Draw Duel ⚔ · Deploy Combo 🚀'); setTimeout(() => scrollToId('bonus'), 350); },
    ink: () => { toggleInk(); print('Ink inverted. 🖋️'); },
    sound: () => { soundBtn.click(); print(`Sound ${soundOn ? 'on 🔊' : 'off 🔇'}`); },
    clear: () => { termOut.innerHTML = ''; },
    pwd: () => print('/home/fathima/portfolio/vol-01'),
    date: () => print(esc(new Date().toString())),
    echo: (arg, raw) => print(esc(raw.replace(/^echo\s*/i, '')) || ' '),
    hint: () => print('Legends speak of an ancient code, typed anywhere on the page:\n↑ ↑ ↓ ↓ ← → ← → B A'),
    make: () => print("make: Nothing to be done for 'all'."),
    norminette: () => print('Norme: OK! ✔'),
    42: () => print('The answer to life, the universe, and everything. Also, my school.'),
    coffee: () => print('☕ Brewing… done. +10 HP, +5 focus.'),
    vim: () => print("You're now trapped in vim. Just kidding. :q!"),
    exit: () => print('There is no escape. Only the next chapter.'),
    hi: () => print('Hey there! 👋 Type <b>help</b> to see what I can do.'),
    sudo: (arg, raw) => {
      if (/^sudo\s+hire(\s|-)?(me|fathima)\s*$/i.test(raw)) {
        print('[sudo] password for recruiter: ********\nAccess granted. Excellent decision. Opening contact channel…', 'win');
        unlock('root');
        sfx('power');
        setTimeout(() => scrollToId('ch5'), 1100);
      } else {
        print('Nice try. This incident will be reported. 👀\n(psst: there is exactly one sudo command that works here…)', 'err');
      }
    },
    rm: () => print('rm: permission denied — this volume is protected by plot armor.', 'err')
  };
  const ALIASES = { cat: 'open', dir: 'ls', projects: 'ls', cd: 'goto', man: 'help', '?': 'help', about: 'whoami', play: 'game', games: 'game', duel: 'game', combo: 'game', mission: 'moei', fde: 'moei', work: 'moei', hello: 'hi', hey: 'hi', cls: 'clear', theme: 'ink' };

  const run = raw => {
    const line = raw.trim();
    print(`<span class="prompt">$</span> ${esc(line)}`, 'cmd');
    if (!line) return;
    hist.push(line);
    histPos = hist.length;
    const [name, ...rest] = line.split(/\s+/);
    let cmd = name.toLowerCase();
    cmd = ALIASES[cmd] || cmd;
    const fn = COMMANDS[cmd];
    if (fn) fn((rest[0] || '').toLowerCase(), line);
    else print(`command not found: ${esc(name)}. Type <b>help</b>.`, 'err');
    unlock('hacker');
  };

  termForm.addEventListener('submit', e => {
    e.preventDefault();
    run(termIn.value);
    termIn.value = '';
  });
  termIn.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hist.length) {
      e.preventDefault();
      histPos = Math.max(0, histPos - 1);
      termIn.value = hist[histPos];
    } else if (e.key === 'ArrowDown' && hist.length) {
      e.preventDefault();
      histPos = Math.min(hist.length, histPos + 1);
      termIn.value = hist[histPos] || '';
    } else if (e.key.length === 1) {
      sfx('key');
    }
  });
  term.addEventListener('click', e => {
    if (e.target.closest('a') || String(window.getSelection())) return;
    termIn.focus({ preventScroll: true });
  });

  /* =========================================================
     BUG HUNT (mini-game)
     ========================================================= */
  const area = $('#gameArea');
  if (area) {
    const screen = $('#gameScreen');
    const msg = $('#gameMsg');
    const startBtn = $('#gameStart');
    const elScore = $('#gScore');
    const elTime = $('#gTime');
    const elBest = $('#gBest');
    const ROUND = 20;
    const BUG_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M11 15 4 11M10 22H3M11 28 5 34M29 15l7-4M30 22h7M29 28l6 6M17 8l-3-5M23 8l3-5"/></g><ellipse cx="20" cy="24" rx="10" ry="12" fill="currentColor"/><circle cx="20" cy="11" r="5.5" fill="currentColor"/><path d="M20 14v20" stroke="var(--paper)" stroke-width="2"/></svg>';
    let bugs = [];
    let score = 0;
    let left = ROUND;
    let running = false;
    let raf = 0;
    let last = 0;
    let spawnAcc = 0;
    let tick = 0;
    let best = store.get('bestBugs', 0);
    elBest.textContent = best;

    const place = b => {
      b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`;
      b.svg.style.transform = `rotate(${(Math.atan2(b.vy, b.vx) * 57.2958 + 90).toFixed(1)}deg)`;
    };
    const squash = (b, x, y) => {
      if (b.dead || !running) return;
      b.dead = true;
      score += b.boss ? 3 : 1;
      elScore.textContent = score;
      b.el.classList.add('squashed');
      popWord(x, y, b.boss ? 'SEGV!!' : ['SPLAT!', 'SQUISH!', 'グシャ!', 'FIXED!'][Math.floor(Math.random() * 4)]);
      sfx('splat');
      if (b.boss && !reduceMotion) { area.classList.remove('shake'); void area.offsetWidth; area.classList.add('shake'); }
      bugs = bugs.filter(o => o !== b);
      setTimeout(() => b.el.remove(), 320);
    };
    const spawn = () => {
      const boss = Math.random() < 0.14;
      const size = boss ? 56 : 46;
      const W = area.clientWidth;
      const H = area.clientHeight;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bug' + (boss ? ' bug--boss' : '');
      el.setAttribute('aria-label', boss ? 'Segfault bug, 3 points' : 'Bug, 1 point');
      el.innerHTML = BUG_SVG + (boss ? '<b>SEGV</b>' : '');
      const speed = (boss ? 190 : 85 + Math.random() * 70) * (1 + ((ROUND - left) / ROUND) * 0.8);
      const a = Math.random() * Math.PI * 2;
      const b = {
        el, svg: el.firstChild, boss, size, dead: false,
        x: Math.random() * (W - size), y: Math.random() * (H - size),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed
      };
      el.addEventListener('pointerdown', e => { e.preventDefault(); squash(b, e.clientX, e.clientY); });
      el.addEventListener('click', () => {
        if (b.dead) return;
        const r = el.getBoundingClientRect();
        squash(b, r.left + r.width / 2, r.top + r.height / 2);
      });
      area.appendChild(el);
      bugs.push(b);
      place(b);
    };
    const loop = t => {
      if (!running) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const W = area.clientWidth;
      const H = area.clientHeight;
      spawnAcc += dt;
      const interval = Math.max(0.32, 0.7 - (ROUND - left) * 0.02);
      if (spawnAcc > interval && bugs.length < 10) { spawnAcc = 0; spawn(); }
      bugs.forEach(b => {
        if (Math.random() < dt * 0.9) {
          const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 1.8;
          const s = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * s;
          b.vy = Math.sin(a) * s;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); } else if (b.x > W - b.size) { b.x = W - b.size; b.vx = -Math.abs(b.vx); }
        if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy); } else if (b.y > H - b.size) { b.y = H - b.size; b.vy = -Math.abs(b.vy); }
        place(b);
      });
      raf = requestAnimationFrame(loop);
    };
    const clearBugs = () => { bugs.forEach(b => b.el.remove()); bugs = []; $$('.bug', area).forEach(el => el.remove()); };
    const end = () => {
      running = false;
      clearInterval(tick);
      cancelAnimationFrame(raf);
      clearBugs();
      const rank = score >= 28 ? 'S' : score >= 20 ? 'A' : score >= 12 ? 'B' : 'C';
      const verdict = {
        S: 'Legendary. Production has never been this stable.',
        A: 'Ship it! Only a couple of warnings left.',
        B: 'Solid debugging. The build is (mostly) green.',
        C: 'The bugs won this round. Grab a coffee and try again!'
      }[rank];
      const newBest = score > best;
      if (newBest) { best = score; store.set('bestBugs', best); elBest.textContent = best; }
      msg.innerHTML = `<span class="game-rank">RANK ${rank}</span>You squashed <b>${score}</b> bug${score === 1 ? '' : 's'}${newBest && score > 0 ? ' — new best!' : '.'} ${verdict}`;
      startBtn.textContent = 'Play Again ➜';
      screen.hidden = false;
      startBtn.focus({ preventScroll: true });
      if (score >= 10) unlock('slayer');
    };
    const start = () => {
      clearBugs();
      score = 0;
      left = ROUND;
      elScore.textContent = 0;
      elTime.textContent = left;
      screen.hidden = true;
      running = true;
      spawnAcc = 1;
      last = performance.now();
      raf = requestAnimationFrame(loop);
      clearInterval(tick);
      tick = setInterval(() => {
        left -= 1;
        elTime.textContent = left;
        if (left <= 0) end();
      }, 1000);
      sfx('power');
    };
    startBtn.addEventListener('click', start);
    document.addEventListener('visibilitychange', () => { if (document.hidden && running) end(); });
  }

  /* =========================================================
     QUICK-DRAW DUEL (reaction game)
     ========================================================= */
  const duel = $('#duelStage');
  if (duel) {
    const sign = $('#duelSign');
    const dMsg = $('#duelMsg');
    const elLast = $('#duelLast');
    const elBest = $('#duelBest');
    const elWins = $('#duelWins');
    let state = 'idle'; // idle → wait → go → done
    let t0 = 0;
    let timer = 0;
    let rival = 0;
    let best = store.get('bestDuel', 0);
    let wins = store.get('duelWins', 0);
    elBest.textContent = best ? best + 'ms' : '—';
    elWins.textContent = wins;

    const setStage = (cls, s, m) => {
      duel.dataset.state = cls;
      sign.textContent = s;
      dMsg.textContent = m;
    };
    const go = () => {
      state = 'go';
      rival = Math.round(210 + Math.random() * 130); // rival reflexes: 210–340 ms
      t0 = performance.now();
      setStage('go', '!', 'DRAW!');
      sfx('pop');
      timer = setTimeout(() => {
        if (state !== 'go') return;
        state = 'done';
        setStage('lose', '✕', `Too slow… the rival struck in ${rival}ms. Tap to duel again.`);
        sfx('buzz');
      }, 1500);
    };
    const begin = () => {
      state = 'wait';
      setStage('wait', '…', 'Steady… wait for it…');
      timer = setTimeout(go, 1300 + Math.random() * 2700);
    };
    const strike = () => {
      if (state === 'idle' || state === 'done') return begin();
      clearTimeout(timer);
      if (state === 'wait') {
        state = 'done';
        setStage('lose', '✕', 'Too early! Dishonor! Tap to try again.');
        sfx('buzz');
        if (!reduceMotion) { duel.classList.remove('shake'); void duel.offsetWidth; duel.classList.add('shake'); }
        return;
      }
      // state === 'go'
      const rt = Math.round(performance.now() - t0);
      state = 'done';
      elLast.textContent = rt + 'ms';
      const r = duel.getBoundingClientRect();
      popWord(r.left + r.width / 2, r.top + r.height / 2, rt < rival ? '斬!!' : 'ガキン!', true);
      if (rt < rival) {
        wins += 1;
        store.set('duelWins', wins);
        elWins.textContent = wins;
        setStage('win', '斬', `Victory! ${rt}ms vs the rival's ${rival}ms. Tap to duel again.`);
        sfx('slash');
        if (rt < 250) unlock('samurai');
      } else {
        setStage('lose', '…', `Defeated: ${rt}ms vs the rival's ${rival}ms. Tap to duel again.`);
        sfx('buzz');
      }
      if (!best || rt < best) { best = rt; store.set('bestDuel', best); elBest.textContent = best + 'ms'; }
    };
    // pointerdown for accurate timing; keyboard (Enter/Space) arrives as a click with detail 0
    duel.addEventListener('pointerdown', e => { if (e.button === 0) { e.preventDefault(); strike(); } });
    duel.addEventListener('click', e => { if (e.detail === 0) strike(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (state === 'wait' || state === 'go')) {
        clearTimeout(timer);
        state = 'idle';
        setStage('', '⚔', 'Duel paused. Tap to begin again.');
      }
    });
  }

  /* =========================================================
     DEPLOY COMBO (memory sequence game)
     ========================================================= */
  const pad = $('#comboPad');
  if (pad) {
    const keys = $$('button', pad);
    const cMsg = $('#comboMsg');
    const cStart = $('#comboStart');
    const elLevel = $('#comboLevel');
    const elBest = $('#comboBest');
    const STAGES = ['Build', 'Test', 'Ship', 'Monitor'];
    let seq = [];
    let pos = 0;
    let accepting = false;
    let run = 0; // invalidates pending timeouts from an older game
    let best = store.get('bestCombo', 0);
    elBest.textContent = best;

    const wait = ms => new Promise(res => setTimeout(res, ms));
    const lockPad = on => keys.forEach(k => { k.disabled = on; });
    const flash = async (i, ms) => {
      keys[i].classList.add('lit');
      sfx('note', i);
      await wait(ms);
      keys[i].classList.remove('lit');
    };
    const showSequence = async id => {
      accepting = false;
      lockPad(true);
      pad.classList.add('playing');
      cMsg.textContent = `Level ${seq.length}: watch the pipeline…`;
      const speed = Math.max(220, 520 - seq.length * 28);
      await wait(550);
      for (const i of seq) {
        if (id !== run) return;
        await flash(i, speed);
        await wait(speed * 0.45);
      }
      if (id !== run) return;
      pad.classList.remove('playing');
      pos = 0;
      accepting = true;
      lockPad(false);
      keys[0].focus({ preventScroll: true });
      cMsg.textContent = `Your turn! Repeat ${seq.length} step${seq.length > 1 ? 's' : ''}.`;
    };
    const nextLevel = () => {
      seq.push(Math.floor(Math.random() * 4));
      showSequence(run);
    };
    const fail = i => {
      accepting = false;
      lockPad(true);
      const cleared = seq.length - 1;
      keys[i].classList.add('wrong');
      setTimeout(() => keys[i].classList.remove('wrong'), 500);
      cMsg.innerHTML = `<b>Rollback!</b> Expected <b>${STAGES[seq[pos]]}</b>. Levels cleared: <b>${cleared}</b>.`;
      cStart.textContent = 'Redeploy ➜';
      cStart.disabled = false;
      sfx('buzz');
      if (!reduceMotion) { pad.classList.remove('shake'); void pad.offsetWidth; pad.classList.add('shake'); }
    };
    keys.forEach((k, i) => k.addEventListener('click', () => {
      if (!accepting) return;
      flash(i, 180);
      if (i !== seq[pos]) return fail(i);
      pos += 1;
      if (pos < seq.length) return;
      // level cleared
      accepting = false;
      lockPad(true);
      elLevel.textContent = seq.length;
      if (seq.length > best) { best = seq.length; store.set('bestCombo', best); elBest.textContent = best; }
      if (seq.length >= 6) unlock('pipeline');
      cMsg.textContent = `Deployed! ✔ Level ${seq.length} cleared.`;
      const r = pad.getBoundingClientRect();
      if (seq.length % 3 === 0) popWord(r.left + r.width / 2, r.top + r.height / 2, 'COMBO!', true);
      setTimeout(nextLevel, 650);
    }));
    cStart.addEventListener('click', () => {
      run += 1;
      seq = [];
      elLevel.textContent = 0;
      cStart.disabled = true;
      sfx('power');
      nextLevel();
    });
  }

  /* =========================================================
     NAV: active chapter, mobile menu, keyboard shortcuts
     ========================================================= */
  const links = $$('.nav a');
  const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const nio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => nio.observe(s));

    const fin = $('.fin');
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { unlock('finale'); obs.disconnect(); }
    }, { threshold: 1 }).observe(fin);
  }

  const nav = $('#nav');
  const menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  links.forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  const ORDER = ['cover', 'ch1', 'ch2', 'ch3', 'ch4', 'bonus', 'ch5'].map(id => document.getElementById(id));
  const currentSection = () => {
    let idx = 0;
    ORDER.forEach((s, i) => { if (s.getBoundingClientRect().top <= 130) idx = i; });
    return idx;
  };
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kPos = 0;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      setTrophyOpen(false);
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;

    const k = e.key.toLowerCase();
    kPos = k === KONAMI[kPos] ? kPos + 1 : (k === 'arrowup' ? (kPos === 2 ? 2 : 1) : 0);
    if (kPos === KONAMI.length) { kPos = 0; awaken(); return; }

    if (modal.open) return;
    if (k === 'j' || k === 'k') {
      const i = Math.min(Math.max(currentSection() + (k === 'j' ? 1 : -1), 0), ORDER.length - 1);
      ORDER[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    } else if (/^[1-5]$/.test(k)) {
      scrollToId('ch' + k);
    }
  });

  /* =========================================================
     CONTACT FORM → opens email client
     ========================================================= */
  const form = $('#contactForm');
  const note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = `New quest from ${data.get('name')}`;
    const body = `${data.get('message')}\n\n— ${data.get('name')} (${data.get('email')})`;
    location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Message scroll prepared! Your email app should open now.';
  });

  /* ---------- Footer year ---------- */
  $('#year').textContent = new Date().getFullYear();
})();

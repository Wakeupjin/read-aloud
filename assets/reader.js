// Read-aloud page: listen per paragraph (recorded natural voice, device voice as fallback),
// record yourself, adjust size and speed, first-visit onboarding.
(function () {
  const synth = window.speechSynthesis;
  const article = document.querySelector('.script');
  const paras = Array.from(document.querySelectorAll('.script .p'));
  const rateSel = document.getElementById('rate');
  const sizeBtn = document.getElementById('size');
  const allBtn = document.getElementById('listen-all');
  const stopBtn = document.getElementById('stop');
  const useFiles = !!(article && article.dataset.audio);
  const player = new Audio();
  player.preload = 'none';
  let voice = null, queue = [], playing = false, current = null, onDone = null;

  // onboarding: open on first visit, folded afterwards
  const onboard = document.getElementById('onboard');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function seen() { store.set('ra_onboarded', '1'); }
  if (onboard && store.get('ra_onboarded')) onboard.open = false;

  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices().filter(v => /^en(-|_)(US|GB)/i.test(v.lang));
    const pref = ['Ava', 'Samantha', 'Allison', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Daniel', 'Karen'];
    voice = pref.map(n => vs.find(v => v.name.includes(n))).find(Boolean) || vs[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function textOf(p) { return p.querySelector('.t').innerText; }
  function mark(p) { paras.forEach(x => x.classList.toggle('now', x === p)); }
  function rate() { return parseFloat(rateSel ? rateSel.value : '1'); }
  function fileOf(p) { const n = paras.indexOf(p) + 1; return 'audio/' + (n < 10 ? '0' + n : n) + '.mp3'; }

  function finish() { const cb = onDone; onDone = null; current = null; mark(null); cb && cb(); }

  function speakDevice(p) {
    if (!synth) { alert('이 브라우저에서는 소리가 나오지 않는다. 크롬이나 사파리에서 열어 보자.'); finish(); return; }
    const u = new SpeechSynthesisUtterance(textOf(p));
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = rate();
    u.onend = finish;
    synth.speak(u);
  }

  function play(p, cb) {
    current = p; onDone = cb || null;
    mark(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!useFiles) { speakDevice(p); return; }
    player.src = fileOf(p);
    player.playbackRate = rate();
    player.onended = finish;
    player.onerror = () => { if (current === p) speakDevice(p); };
    const pr = player.play();
    if (pr && pr.catch) pr.catch(() => { if (current === p && player.paused) speakDevice(p); });
  }
  function stop() {
    playing = false; queue = []; onDone = null; current = null;
    player.pause(); player.onended = null; player.onerror = null;
    if (synth) synth.cancel();
    mark(null);
  }
  function next() { if (!playing || !queue.length) { playing = false; return; } play(queue.shift(), next); }

  paras.forEach(p => {
    const b = document.createElement('button');
    b.className = 'play'; b.type = 'button'; b.setAttribute('aria-label', '이 문단 듣기'); b.textContent = '▶';
    b.onclick = () => { seen(); stop(); play(p); };
    p.prepend(b);
  });
  if (allBtn) allBtn.onclick = () => { seen(); stop(); playing = true; queue = paras.slice(); next(); };
  if (stopBtn) stopBtn.onclick = stop;
  if (rateSel) rateSel.onchange = () => { player.playbackRate = rate(); };

  const start = document.getElementById('start');
  if (start) start.onclick = () => {
    seen();
    if (onboard) onboard.open = false;
    if (paras.length) { stop(); play(paras[0]); }
  };

  const sizes = ['19px', '21px', '24px', '27px']; let si = 1;
  if (sizeBtn) sizeBtn.onclick = () => { si = (si + 1) % sizes.length; document.documentElement.style.setProperty('--fs', sizes[si]); };

  // Recording
  const recBtn = document.getElementById('rec');
  const out = document.getElementById('rec-out');
  const audio = document.getElementById('rec-audio');
  const save = document.getElementById('rec-save');
  let mr = null, chunks = [];
  if (recBtn) recBtn.onclick = async () => {
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mr = new MediaRecorder(stream); chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audio.src = url; save.href = url;
        save.download = 'my-reading.' + ((mr.mimeType || '').includes('mp4') ? 'm4a' : 'webm');
        out.classList.add('show');
        recBtn.classList.remove('on'); recBtn.textContent = '내 목소리 녹음';
      };
      mr.start(); seen(); recBtn.classList.add('on'); recBtn.textContent = '녹음 멈춤';
    } catch (e) { alert('이 브라우저에서는 마이크를 쓸 수 없다.'); }
  };
})();

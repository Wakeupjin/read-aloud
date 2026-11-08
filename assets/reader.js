// Read-aloud page: listen per paragraph (device voice), record yourself, adjust size and speed.
(function () {
  const synth = window.speechSynthesis;
  const paras = Array.from(document.querySelectorAll('.script .p'));
  const rateSel = document.getElementById('rate');
  const sizeBtn = document.getElementById('size');
  const allBtn = document.getElementById('listen-all');
  const stopBtn = document.getElementById('stop');
  let voice = null, queue = [], playing = false;

  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices().filter(v => /^en(-|_)(US|GB)/i.test(v.lang));
    const pref = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Daniel', 'Karen'];
    voice = pref.map(n => vs.find(v => v.name.includes(n))).find(Boolean) || vs[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function textOf(p) { return p.querySelector('.t').innerText; }
  function mark(p) { paras.forEach(x => x.classList.toggle('now', x === p)); }

  function speak(p, onend) {
    if (!synth) { alert('이 브라우저에서는 음성이 나오지 않는다. 크롬이나 사파리에서 열어 보자.'); return; }
    const u = new SpeechSynthesisUtterance(textOf(p));
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = parseFloat(rateSel.value);
    u.onend = () => { mark(null); onend && onend(); };
    mark(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    synth.speak(u);
  }
  function stop() { playing = false; queue = []; if (synth) synth.cancel(); mark(null); }
  function next() { if (!playing || !queue.length) { playing = false; return; } speak(queue.shift(), next); }

  paras.forEach(p => {
    const b = document.createElement('button');
    b.className = 'play'; b.type = 'button'; b.setAttribute('aria-label', '이 문단 듣기'); b.textContent = '▶';
    b.onclick = () => { stop(); speak(p); };
    p.prepend(b);
  });
  allBtn.onclick = () => { stop(); playing = true; queue = paras.slice(); next(); };
  stopBtn.onclick = stop;

  const sizes = ['19px', '21px', '24px', '27px']; let si = 1;
  sizeBtn.onclick = () => { si = (si + 1) % sizes.length; document.documentElement.style.setProperty('--fs', sizes[si]); };

  // Recording
  const recBtn = document.getElementById('rec');
  const out = document.getElementById('rec-out');
  const audio = document.getElementById('rec-audio');
  const save = document.getElementById('rec-save');
  let mr = null, chunks = [];
  recBtn.onclick = async () => {
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    try {
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
      mr.start(); recBtn.classList.add('on'); recBtn.textContent = '녹음 멈춤';
    } catch (e) { alert('이 브라우저에서는 마이크를 쓸 수 없다.'); }
  };
})();

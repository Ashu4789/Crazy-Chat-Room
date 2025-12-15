(() => {
  const messages = document.getElementById('messages');
  const roomInput = document.getElementById('room');
  const nameInput = document.getElementById('name');
  const joinBtn = document.getElementById('join');
  const textInput = document.getElementById('text');
  const sendBtn = document.getElementById('send');

  let ws;
  let joined = false;

  function colorFor(name) {
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    const hue = Math.abs(h) % 360; return `hsl(${hue} 80% 60%)`;
  }

  function makeAvatar(name) {
    const d = document.createElement('div');
    d.className = 'avatar'; d.textContent = (name || '?').slice(0,2).toUpperCase();
    d.style.background = colorFor(name);
    return d;
  }

  function appendMessage({name, text, time, sys}) {
    const row = document.createElement('div'); row.className = 'msg';
    const avatar = makeAvatar(name || '??');
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    const meta = document.createElement('div'); meta.className = 'meta';
    const t = new Date(time || Date.now()).toLocaleTimeString();
    meta.innerHTML = `<strong>${name || 'System'}</strong><small>${t}</small>`;
    const body = document.createElement('div'); body.innerHTML = text;
    bubble.appendChild(meta); bubble.appendChild(body);
    row.appendChild(avatar); row.appendChild(bubble);

    // reactions bar
    const reactBar = document.createElement('div'); reactBar.className = 'reactions';
    ['❤️','😂','👍','🎉'].forEach(e => {
      const btn = document.createElement('div'); btn.className = 'reaction'; btn.textContent = e + ' 0';
      btn.addEventListener('click', () => {
        const parts = btn.textContent.split(' '); const n = parseInt(parts.pop()||'0',10)+1; btn.textContent = e + ' ' + n;
        btn.animate([{transform:'scale(1.2)'},{transform:'scale(1)'}], {duration:220});
      });
      reactBar.appendChild(btn);
    });
    bubble.appendChild(reactBar);

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    // subtle sound
    playBeep(sys ? 220 : 400, 0.06);
    if (!sys && /wow|amazing|confetti|celebrate|party/i.test(text)) fireConfetti();
  }

  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host);
    ws.addEventListener('open', () => appendMessage({name:'Info', text:'Connected to server', time:Date.now(), sys:true}));
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'joined') {
        joined = true;
        appendMessage({name: 'System', text: `You joined room ${msg.room}`, time: Date.now(), sys: true});
        fireConfetti();
      } else if (msg.type === 'info') {
        appendMessage({name: 'Info', text: msg.message, time: Date.now(), sys: true});
      } else if (msg.type === 'message') {
        appendMessage({name: msg.name, text: msg.text, time: msg.time});
      } else if (msg.type === 'error') {
        appendMessage({name: 'Error', text: `<span style="color:#ff8da1">Error: ${msg.message}</span>`, time: Date.now(), sys: true});
      }
    });
    ws.addEventListener('close', () => appendMessage({name:'Info', text:'Disconnected', time:Date.now(), sys:true}));
  }

  joinBtn.addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) connect();
    const room = roomInput.value.trim() || 'default';
    const name = nameInput.value.trim() || 'Anonymous';
    ws.addEventListener('open', () => ws.send(JSON.stringify({ type: 'join', room, name })), { once: true });
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'join', room, name }));
  });

  sendBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) { appendMessage({name:'Info', text:'Not connected', time:Date.now(), sys:true}); return; }
    ws.send(JSON.stringify({ type: 'message', text }));
    // animate send
    animateSendButton();
    playBeep(560, 0.04);
    floatEmoji('✈️');
    textInput.value = '';
  });

  // send on Enter
  textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendBtn.click(); });
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); });

  // autoconnect so users can join quickly
  connect();
  // confetti setup
  const confettiCanvas = document.getElementById('confetti'); confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight;
  const ctx = confettiCanvas.getContext('2d'); let confettiPieces = [];
  function fireConfetti(count=36){
    for(let i=0;i<count;i++) confettiPieces.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight/3, vx:(Math.random()-0.5)*6, vy:2+Math.random()*6, w:6+Math.random()*8, h:6+Math.random()*8, c:`hsl(${Math.random()*360} 80% 60%)`, rot:Math.random()*360, vr:(Math.random()-0.5)*8});
    if (!anim) animateConfetti();
  }
  let anim = null;
  function animateConfetti(){
    anim = requestAnimationFrame(animateConfetti);
    ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    for(let i=confettiPieces.length-1;i>=0;i--){
      const p = confettiPieces[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180); ctx.fillStyle = p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      if (p.y > confettiCanvas.height+40) confettiPieces.splice(i,1);
    }
    if (confettiPieces.length===0){ cancelAnimationFrame(anim); anim=null; ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);} 
  }

  // simple beep using WebAudio
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playBeep(freq=440, dur=0.05){ try{ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.frequency.value = freq; g.gain.value = 0.02; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+dur); o.stop(audioCtx.currentTime+dur); }catch(e){}
  }

  // send button pulse animation and flying emoji
  function animateSendButton(){ const b = sendBtn; b.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'translateY(0)'}],{duration:320}); }
  function floatEmoji(emoji){ const f = document.createElement('div'); f.textContent = emoji; f.style.position='fixed'; const r = sendBtn.getBoundingClientRect(); f.style.left = (r.left+r.width/2)+'px'; f.style.top = (r.top - 8) +'px'; f.style.fontSize='20px'; f.style.pointerEvents='none'; document.body.appendChild(f); f.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-120px) scale(1.6)', opacity:0}],{duration:900}).onfinish = ()=>f.remove(); }
})();

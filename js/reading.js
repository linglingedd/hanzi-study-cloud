// Bundled recordings work even when the device has no Chinese speech engine.
(() => {
  let player = null, utterance = null, generation = 0, timer = null, settle = null;
  const status = (text, error = false) => window.dispatchEvent(new CustomEvent('reading-status', { detail: { text, error } }));
  function stop(announce = true) {
    generation++; clearInterval(timer); timer = null;
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); player.remove(); player = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    utterance = null; if (settle) { settle(false); settle = null; }
    if (announce) status('点击汉字或“听发音”即可朗读');
  }
  function speak(text, times = 1, rate = 0.8) {
    stop(false); const run = generation;
    if (!text) return Promise.resolve(false);
    times = Math.max(1, Math.min(3, Number(times) || 1));
    return new Promise(resolve => {
      settle = resolve;
      let completed = false, fallbackStarted = false;
      const done = (ok, message) => {
        if (run !== generation || completed) return;
        completed = true;
        clearInterval(timer); timer = null; if (player) player.pause();
        settle = null; resolve(ok); status(message || '朗读完成，可再次点击收听', !ok);
      };
      const fallback = () => {
        if (run !== generation || completed || fallbackStarted) return;
        fallbackStarted = true;
        clearInterval(timer); if (player) { player.pause(); player.remove(); player = null; }
        const synth = window.speechSynthesis;
        const voices = synth?.getVoices() || [];
        const voice = voices.find(v => /^zh[-_]CN/i.test(v.lang)) || voices.find(v => /^(zh|cmn)/i.test(v.lang));
        if (!synth || !voice) return done(false, '声音加载失败，请检查网络后再点一次，并确认设备音量已打开。');
        utterance = new SpeechSynthesisUtterance(Array(times).fill(text).join('，'));
        utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = rate;
        utterance.onstart = () => { if (run === generation) status(`正在朗读：${text}`); };
        utterance.onend = () => done(true);
        utterance.onerror = () => done(false, '暂时无法播放，请检查设备音量，再点一次“听发音”。');
        timer = setInterval(() => done(false, '播放等待过久，请再点一次收听。'), 45000);
        synth.resume(); synth.speak(utterance);
      };
      const clip = window.HANZI_AUDIO?.[text];
      status(`正在加载声音：${text}`);
      if (!clip) return fallback();
      const audio = new Audio(); player = audio; audio.preload = 'auto'; audio.id = 'reading-audio'; audio.hidden = true; document.body.append(audio);
      let remaining = times, deadline = Date.now() + 18000, started = false;
      audio.src = new URL(`audio/${clip.file}`, HanziAuth.root).href;
      audio.onloadedmetadata = () => { if (run === generation) audio.currentTime = clip.start; };
      audio.onplaying = () => { if (run !== generation) return; started = true; deadline = Date.now() + 45000; status(`正在朗读：${text}`); };
      audio.onended = () => {
        if (run !== generation || completed) return;
        if (--remaining > 0) { audio.currentTime = clip.start; audio.play().catch(fallback); }
        else done(true);
      };
      audio.onerror = fallback;
      timer = setInterval(() => {
        if (run !== generation) return;
        if (Date.now() > deadline) return fallback();
        if (started && audio.currentTime >= clip.end) {
          if (--remaining > 0) { audio.currentTime = clip.start; deadline = Date.now() + 45000; }
          else done(true);
        }
      }, 35);
      // Keep play() in the user gesture: delaying it breaks mobile audio permission.
      audio.play().catch(error => {
        if (run !== generation) return;
        if (error.name === 'NotAllowedError') done(false, '浏览器暂停了声音，请再次点击汉字或“听发音”。');
        else fallback();
      });
    });
  }
  window.HanziSpeech = { speak, stop };
  window.addEventListener('pagehide', () => stop(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();

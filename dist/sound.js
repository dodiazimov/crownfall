/* ===================================================================
   CROWNFALL - Web Audio API Synthesizer & Sound Effects Manager
   Pure procedural sound effects: zero external MP3/WAV assets required.
   =================================================================== */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'crownfall-sound';
  const SETTINGS_KEY = 'crownfall-audio-settings';
  let audioContext = null;
  let soundEnabled = false;
  let sfxVolume = 0.8;
  let musicVolume = 0.5;
  let ambientTimer = null;

  try {
    soundEnabled = localStorage.getItem(STORAGE_KEY) === 'on';
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (typeof savedSettings.sfxVolume === 'number') sfxVolume = Math.max(0, Math.min(1, savedSettings.sfxVolume));
    if (typeof savedSettings.musicVolume === 'number') musicVolume = Math.max(0, Math.min(1, savedSettings.musicVolume));
  } catch (e) {
    soundEnabled = false;
  }

  function saveAudioSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, soundEnabled ? 'on' : 'off');
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sfxVolume, musicVolume }));
    } catch (e) {}
  }

  function getAudioContext() {
    if (!audioContext && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }
    return audioContext;
  }

  function unlockAudio() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {
      soundEnabled = false;
    }
    startAmbient();
  }

  function tone(freq, duration = 0.1, volume = 0.045, delay = 0, type = 'sine') {
    if (!soundEnabled || typeof document === 'undefined' || document.hidden) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const scaledVol = volume * sfxVolume;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, scaledVol), t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) {}
  }

  // Procedural Medieval Ambient Synthesizer
  function startAmbient() {
    if (ambientTimer || !soundEnabled || musicVolume <= 0) return;
    const chords = [
      [220, 330, 440], // A minor
      [196, 294, 392], // G major
      [175, 262, 349], // F major
      [165, 247, 330]  // E minor
    ];
    let step = 0;
    const tickAmbient = () => {
      if (!soundEnabled || musicVolume <= 0 || typeof document === 'undefined' || document.hidden) {
        ambientTimer = null;
        return;
      }
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'running') {
        const chord = chords[step % chords.length];
        step++;
        chord.forEach((freq, idx) => {
          tone(freq, 2.8, 0.006 * musicVolume, idx * 0.18, 'sine');
        });
      }
      ambientTimer = setTimeout(tickAmbient, 4200);
    };
    tickAmbient();
  }

  function stopAmbient() {
    if (ambientTimer) {
      clearTimeout(ambientTimer);
      ambientTimer = null;
    }
  }

  function play(kind) {
    if (!soundEnabled) return;
    switch (kind) {
      case 'click':
        tone(680, 0.035, 0.014);
        break;
      case 'dispatch':
        tone(330, 0.09, 0.035);
        tone(490, 0.16, 0.035, 0.07);
        break;
      case 'impact':
        tone(85, 0.19, 0.055, 0, 'triangle');
        tone(160, 0.07, 0.04);
        break;
      case 'capture':
      case 'upgrade':
        [523, 659, 784].forEach((n, i) => tone(n, 0.2, 0.036, i * 0.07));
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((n, i) => tone(n, 0.4, 0.05, i * 0.14));
        break;
      case 'defeat':
        [330, 294, 220].forEach((n, i) => tone(n, 0.35, 0.035, i * 0.15));
        break;
      case 'alert':
        tone(660, 0.09, 0.025);
        tone(520, 0.13, 0.025, 0.12);
        break;
      case 'crown_control':
        [587, 740, 880, 1174].forEach((n, i) => tone(n, 0.3, 0.04, i * 0.1));
        break;
      case 'weather':
        [440, 554, 659].forEach((n, i) => tone(n, 0.22, 0.03, i * 0.08));
        break;
      case 'hero_pick':
        [392, 523, 659, 784].forEach((n, i) => tone(n, 0.25, 0.04, i * 0.06));
        break;
      case 'march':
        tone(100, 0.03, 0.012, 0, 'triangle');
        break;
    }
  }

  function isEnabled() {
    return soundEnabled;
  }

  function setEnabled(on) {
    soundEnabled = !!on;
    saveAudioSettings();

    if (soundEnabled) {
      unlockAudio();
      play('capture');
      startAmbient();
    } else {
      stopAmbient();
    }

    syncUI();
  }

  function toggle() {
    setEnabled(!soundEnabled);
    return soundEnabled;
  }

  function setSfxVolume(v) {
    sfxVolume = Math.max(0, Math.min(1, Number(v) || 0));
    saveAudioSettings();
    if (soundEnabled) play('click');
    syncUI();
  }

  function getSfxVolume() {
    return sfxVolume;
  }

  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, Number(v) || 0));
    saveAudioSettings();
    if (musicVolume > 0 && soundEnabled) startAmbient();
    else stopAmbient();
    syncUI();
  }

  function getMusicVolume() {
    return musicVolume;
  }

  function syncUI() {
    if (typeof document === 'undefined') return;
    const btnOn = document.getElementById('settingsSoundOnBtn');
    const btnOff = document.getElementById('settingsSoundOffBtn');
    const soundToggle = document.getElementById('soundToggle');
    const sfxSlider = document.getElementById('sfxVolumeSlider');
    const musicSlider = document.getElementById('musicVolumeSlider');
    const sfxVal = document.getElementById('sfxVolumeValue');
    const musicVal = document.getElementById('musicVolumeValue');

    if (btnOn) btnOn.classList.toggle('active', soundEnabled);
    if (btnOff) btnOff.classList.toggle('active', !soundEnabled);
    if (soundToggle) {
      soundToggle.textContent = soundEnabled ? '♪ Sound on' : '♪ Sound off';
      soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    }
    if (sfxSlider) sfxSlider.value = Math.round(sfxVolume * 100);
    if (musicSlider) musicSlider.value = Math.round(musicVolume * 100);
    if (sfxVal) sfxVal.textContent = `${Math.round(sfxVolume * 100)}%`;
    if (musicVal) musicVal.textContent = `${Math.round(musicVolume * 100)}%`;
  }

  function init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('pointerdown', unlockAudio, { passive: true });
    document.addEventListener('keydown', unlockAudio, { passive: true });
    document.addEventListener('click', (e) => {
      if (e.target.closest('button')) play('click');
    });
    const sfxSlider = document.getElementById('sfxVolumeSlider');
    const musicSlider = document.getElementById('musicVolumeSlider');
    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        setSfxVolume(Number(e.target.value) / 100);
      });
    }
    if (musicSlider) {
      musicSlider.addEventListener('input', (e) => {
        setMusicVolume(Number(e.target.value) / 100);
      });
    }
    syncUI();
  }

  const api = {
    init,
    play,
    tone,
    unlockAudio,
    isEnabled,
    setEnabled,
    toggle,
    setSfxVolume,
    getSfxVolume,
    setMusicVolume,
    getMusicVolume,
    syncUI
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CrownSound = api;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window === 'undefined' ? globalThis : window);

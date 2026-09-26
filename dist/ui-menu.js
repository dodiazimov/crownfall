/* ===================================================================
   CROWNFALL - UI Menu, Settings & Dialogs Controller
   Dedicated management of:
   - Main Menu full-screen state
   - Pre-game vs In-game Settings modal separation
   - Matchmaking, lobby and room invites
   - Auth, hotkeys, rules, confirmation and result dialogs
   =================================================================== */
(function (root) {
  'use strict';

  const $ = id => document.getElementById(id);

  let appBridge = null;

  function enterMenuMode() {
    document.body.classList.add('in-menu');
    document.body.classList.remove('in-game');
    if ($('mainMenuScreen')) $('mainMenuScreen').classList.remove('hidden');
    if ($('gameDock')) $('gameDock').style.display = 'none';
    const hud = document.querySelector('.game-hud');
    if (hud) hud.style.display = 'none';
    const bMain = document.querySelector('.battlefield-main');
    if (bMain) bMain.style.display = 'none';
    if ($('resumeNotice')) $('resumeNotice').style.display = 'none';
    if (root.CrownI18n) root.CrownI18n.applyTranslations();
    if (typeof root.updateCareerUI === 'function') root.updateCareerUI();
    if (typeof root.syncHeroUI === 'function') root.syncHeroUI();
    const soundOn = (root.CrownSound && root.CrownSound.isEnabled) ? root.CrownSound.isEnabled() : false;
    if ($('menuSoundIcon')) $('menuSoundIcon').textContent = soundOn ? '🔊' : '🔇';
    if (window.requestIdleCallback) requestIdleCallback(loadHighResMenuBg);
    else setTimeout(loadHighResMenuBg, 80);
  }

  let bgLoaded = false;
  function loadHighResMenuBg() {
    if (bgLoaded) return;
    const highEl = $('menuSceneBgHigh');
    if (!highEl) return;
    const isMobile = window.innerWidth <= 768;
    const targetSrc = isMobile ? 'assets/war_room_balcony_mobile.webp' : 'assets/war_room_balcony.webp';
    const img = new Image();
    img.src = targetSrc;
    const finish = () => {
      bgLoaded = true;
      highEl.style.backgroundImage = `url('${targetSrc}')`;
      highEl.classList.add('loaded');
    };
    if (img.decode) {
      img.decode().then(finish).catch(finish);
    } else {
      img.onload = finish;
    }
  }

  function enterGameMode() {
    document.body.classList.remove('in-menu');
    document.body.classList.add('in-game');
    if ($('mainMenuScreen')) $('mainMenuScreen').classList.add('hidden');
    if ($('gameDock')) $('gameDock').style.display = '';
    const hud = document.querySelector('.game-hud');
    if (hud) hud.style.display = '';
    const bMain = document.querySelector('.battlefield-main');
    if (bMain) bMain.style.display = '';
    if ($('resumeNotice')) $('resumeNotice').style.display = '';
    if (root.CrownI18n) root.CrownI18n.applyTranslations();
    if (root.CrownView && root.CrownView.loadMatchTerrain) root.CrownView.loadMatchTerrain();
  }

  function syncSettingsValues() {
    const curLang = root.CrownI18n ? root.CrownI18n.getLanguage() : 'ru';
    document.querySelectorAll('.lang-switch-group .lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === curLang);
    });

    const isSoundOn = (root.CrownSound && root.CrownSound.isEnabled)
      ? root.CrownSound.isEnabled()
      : (localStorage.getItem('crownfall-sound') === 'on');
    if ($('settingsSoundOnBtn')) $('settingsSoundOnBtn').classList.toggle('active', isSoundOn);
    if ($('settingsSoundOffBtn')) $('settingsSoundOffBtn').classList.toggle('active', !isSoundOn);

    const curQuality = (typeof MobileGame !== 'undefined' && MobileGame.getQuality)
      ? MobileGame.getQuality()
      : (localStorage.getItem('crownfall-quality') || 'auto');
    if ($('qualitySelect')) $('qualitySelect').value = curQuality;

    const curSpeed = appBridge?.getSpeed ? appBridge.getSpeed() : 0.65;
    document.querySelectorAll('.speed-switch-group .speed-opt-btn').forEach(b => {
      b.classList.toggle('active', Math.abs(Number(b.dataset.speed) - curSpeed) < 0.01);
    });

    const state = appBridge?.getState ? appBridge.getState() : null;
    if (state) {
      if ($('aiDifficulty')) $('aiDifficulty').value = state.aiDifficulty || 'normal';
      if ($('aiStyle')) $('aiStyle').value = state.aiStyle || 'balanced';
      if ($('mapSelect') && state.mapIndex !== undefined) $('mapSelect').value = state.mapIndex;
    }
  }

  function openSettings(inGame = false) {
    if (inGame) {
      if ($('inGameSettingsSection')) $('inGameSettingsSection').classList.remove('hidden');
      if ($('settingsModalTitle')) {
        $('settingsModalTitle').textContent = root.CrownI18n ? root.CrownI18n.t('ingame_settings_title') : "Настройки боя";
      }
      appBridge?.pauseOnMenuOpen?.();
    } else {
      if ($('inGameSettingsSection')) $('inGameSettingsSection').classList.add('hidden');
      if ($('settingsModalTitle')) {
        $('settingsModalTitle').textContent = root.CrownI18n ? root.CrownI18n.t('settings_title') : "Настройки игры";
      }
    }
    syncSettingsValues();
    if ($('menuDialog')) $('menuDialog').showModal();
  }

  function syncDiffModal(diff) {
    document.querySelectorAll('.diff-card').forEach(card => {
      const isMatch = card.dataset.diff === diff;
      card.classList.toggle('active', isMatch);
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = isMatch;
    });
  }

  function destroyAndReturnToMenu() {
    if ($('confirmMenuDialog')?.open) $('confirmMenuDialog').close();
    if ($('menuDialog')?.open) $('menuDialog').close();
    if ($('difficultyDialog')?.open) $('difficultyDialog').close();
    if ($('tacticsDialog')?.open) $('tacticsDialog').close();
    if ($('resultDialog')?.open) $('resultDialog').close();
    if ($('helpDialog')?.open) $('helpDialog').close();
    if ($('hotkeysDialog')?.open) $('hotkeysDialog').close();
    if ($('matchmakingDialog')?.open) $('matchmakingDialog').close();
    if ($('roomLobbyDialog')?.open) $('roomLobbyDialog').close();
    if ($('authDialog')?.open) $('authDialog').close();
    if ($('careerDialog')?.open) $('careerDialog').close();
    if ($('lobbyBrowserDialog')?.open) $('lobbyBrowserDialog').close();
    if (typeof root.stopLobbiesPolling === 'function') root.stopLobbiesPolling();

    appBridge?.onDestroyMatch?.();
    enterMenuMode();
  }

  let ambianceAnimId = null;
  function initAmbianceCanvas() {
    const canvas = $('menuAmbianceCanvas');
    if (!canvas || typeof window === 'undefined') return;
    // The static war-room presentation hides this layer; do not animate an invisible canvas.
    if (getComputedStyle(canvas).display === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    const numParticles = 24;
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.45 + 0.15,
        speedY: Math.random() * 0.3 + 0.12,
        swaySpeed: Math.random() * 0.015 + 0.008,
        swayAmount: Math.random() * 0.7 + 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }

    function renderAmbiance() {
      if (document.hidden || !document.body.classList.contains('in-menu')) {
        ambianceAnimId = requestAnimationFrame(renderAmbiance);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < numParticles; i++) {
        const p = particles[i];
        p.phase += p.swaySpeed;
        p.y -= p.speedY;
        p.x += Math.sin(p.phase) * p.swayAmount;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 194, 75, ${p.alpha})`;
        ctx.fill();
      }

      ambianceAnimId = requestAnimationFrame(renderAmbiance);
    }

    if (!ambianceAnimId) {
      ambianceAnimId = requestAnimationFrame(renderAmbiance);
    }
  }

  function init(bridge) {
    appBridge = bridge;
    initAmbianceCanvas();

    // Menu settings openers
    if ($('menuSettingsBtn')) $('menuSettingsBtn').onclick = () => openSettings(false);
    if ($('menuTopSettingsBtn')) $('menuTopSettingsBtn').onclick = () => openSettings(false);
    if ($('menuHeaderFriendsBtn')) {
      $('menuHeaderFriendsBtn').onclick = () => {
        if ($('friendsDialog')) $('friendsDialog').showModal();
      };
    }
    if ($('menuBtn')) $('menuBtn').onclick = () => openSettings(true);
    if ($('closeMenu')) $('closeMenu').onclick = () => {
      if ($('menuDialog')) $('menuDialog').close();
    };

    // Return to main menu confirmation & execution
    if ($('returnMenuBtn')) {
      $('returnMenuBtn').onclick = () => {
        const state = appBridge?.getState?.();
        if (state && !state.result && state.time > 0) {
          if ($('confirmMenuDesc')) {
            $('confirmMenuDesc').textContent = root.CrownI18n 
              ? root.CrownI18n.t('confirm_return_desc') 
              : "Текущая игра будет остановлена и удалена. Новая игра начнется заново.";
          }
          if ($('confirmMenuDialog')) $('confirmMenuDialog').showModal();
        } else {
          destroyAndReturnToMenu();
        }
      };
    }

    if ($('confirmMenuNoBtn')) {
      $('confirmMenuNoBtn').onclick = () => {
        if ($('confirmMenuDialog')) $('confirmMenuDialog').close();
      };
    }

    if ($('confirmMenuYesBtn')) {
      $('confirmMenuYesBtn').onclick = () => destroyAndReturnToMenu();
    }

    if ($('resultHomeBtn')) {
      $('resultHomeBtn').onclick = () => destroyAndReturnToMenu();
    }

    if ($('settingsReturnMenuBtn')) {
      $('settingsReturnMenuBtn').onclick = () => {
        if ($('menuDialog')?.open) $('menuDialog').close();
        const state = appBridge?.getState?.();
        if (state && !state.result && state.time > 0) {
          if ($('confirmMenuDesc')) {
            $('confirmMenuDesc').textContent = root.CrownI18n 
              ? root.CrownI18n.t('confirm_return_desc') 
              : "Текущая игра будет остановлена и удалена. Новая игра начнется заново.";
          }
          if ($('confirmMenuDialog')) $('confirmMenuDialog').showModal();
        } else {
          destroyAndReturnToMenu();
        }
      };
    }

    // Language switcher in settings
    document.querySelectorAll('.lang-switch-group .lang-btn').forEach(btn => {
      btn.onclick = () => {
        const lang = btn.dataset.lang;
        if (lang && root.CrownI18n) {
          root.CrownI18n.setLanguage(lang);
          document.querySelectorAll('.lang-switch-group .lang-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.lang === lang);
          });
          const inGameSectionVisible = $('inGameSettingsSection') && !$('inGameSettingsSection').classList.contains('hidden');
          if ($('settingsModalTitle')) {
            $('settingsModalTitle').textContent = inGameSectionVisible 
              ? root.CrownI18n.t('ingame_settings_title') 
              : root.CrownI18n.t('settings_title');
          }
          appBridge?.onLanguageChanged?.();
          appBridge?.toast?.(root.CrownI18n.t('toast_lang_changed'));
        }
      };
    });

    // Sound toggle in settings
    if ($('settingsSoundOnBtn')) {
      $('settingsSoundOnBtn').onclick = () => {
        if (root.CrownSound) root.CrownSound.setEnabled(true);
        syncSettingsValues();
        appBridge?.toast?.(root.CrownI18n ? root.CrownI18n.t('sound_toast_on') : "Звуковые эффекты включены");
      };
    }
    if ($('settingsSoundOffBtn')) {
      $('settingsSoundOffBtn').onclick = () => {
        if (root.CrownSound) root.CrownSound.setEnabled(false);
        syncSettingsValues();
        appBridge?.toast?.(root.CrownI18n ? root.CrownI18n.t('sound_toast_off') : "Звуковые эффекты отключены");
      };
    }

    // Quality dropdown in settings
    if ($('qualitySelect')) {
      $('qualitySelect').onchange = () => {
        const val = $('qualitySelect').value;
        if (typeof MobileGame !== 'undefined' && MobileGame.setQuality) {
          MobileGame.setQuality(val);
        }
        const toastPrefix = root.CrownI18n ? root.CrownI18n.t('quality_toast') : "Качество графики:";
        appBridge?.toast?.(`⚡ ${toastPrefix} ${val.toUpperCase()}`);
      };
    }

    // Speed options in settings
    document.querySelectorAll('.speed-switch-group .speed-opt-btn').forEach(btn => {
      btn.onclick = () => {
        const spd = Number(btn.dataset.speed);
        if (spd && appBridge?.setSpeed) {
          appBridge.setSpeed(spd);
          document.querySelectorAll('.speed-switch-group .speed-opt-btn').forEach(b => {
            b.classList.toggle('active', b === btn);
          });
          const speedPrefix = root.CrownI18n ? root.CrownI18n.t('speed_toast') : "Скорость игры:";
          appBridge?.toast?.(`⏱️ ${speedPrefix} ${spd}×`);
        }
      };
    });

    // Hotkeys & rules modal triggers
    if ($('menuHotkeysBtn')) $('menuHotkeysBtn').onclick = () => $('hotkeysDialog').showModal();
    if ($('closeHotkeysDialog')) $('closeHotkeysDialog').onclick = () => $('hotkeysDialog').close();
    if ($('closeHotkeysBtn')) $('closeHotkeysBtn').onclick = () => $('hotkeysDialog').close();

    if ($('settingsHotkeysBtn')) {
      $('settingsHotkeysBtn').onclick = () => {
        if ($('menuDialog')) $('menuDialog').close();
        if ($('hotkeysDialog')) $('hotkeysDialog').showModal();
      };
    }

    if ($('menuRulesBtn')) $('menuRulesBtn').onclick = () => $('helpDialog').showModal();
    if ($('closeHelp')) $('closeHelp').onclick = () => $('helpDialog').close();
    if ($('startPlaying')) $('startPlaying').onclick = () => $('helpDialog').close();

    if ($('settingsRulesBtn')) {
      $('settingsRulesBtn').onclick = () => {
        if ($('menuDialog')) $('menuDialog').close();
        if ($('helpDialog')) $('helpDialog').showModal();
      };
    }

    if ($('closeDifficultyDialog')) {
      $('closeDifficultyDialog').onclick = () => {
        if ($('difficultyDialog')?.open) $('difficultyDialog').close();
      };
    }

    initProgressiveBackground();
    scheduleIdlePrefetch();
  }

  let highResLoaded = false;
  function initProgressiveBackground() {
    if (highResLoaded) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const highResUrl = isMobile ? 'assets/war_room_balcony_mobile.webp' : 'assets/war_room_balcony.webp';
    const img = new Image();
    img.decoding = 'async';
    img.src = highResUrl;

    const applyHighRes = () => {
      highResLoaded = true;
      const highLayer = $('menuSceneBgHigh');
      const lowLayer = $('menuSceneBgLow');
      if (highLayer) {
        highLayer.style.backgroundImage = `url('${highResUrl}')`;
        highLayer.classList.add('loaded');
        if (lowLayer) {
          setTimeout(() => {
            lowLayer.classList.add('faded');
          }, 500);
        }
      }
    };

    if (img.decode) {
      img.decode().then(applyHighRes).catch(applyHighRes);
    } else {
      img.onload = applyHighRes;
    }
  }

  function scheduleIdlePrefetch() {
    if (typeof window === 'undefined') return;
    const idleFn = window.requestIdleCallback || (cb => setTimeout(cb, 1500));
    idleFn(() => {
      ['hero_fortifier.webp', 'hero_guildmaster.webp', 'hero_infiltrator.webp'].forEach(f => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = 'assets/' + f;
        document.head.appendChild(link);
      });
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initProgressiveBackground();
        scheduleIdlePrefetch();
      });
    } else {
      initProgressiveBackground();
      scheduleIdlePrefetch();
    }
  }

  const api = {
    init,
    enterMenuMode,
    enterGameMode,
    openSettings,
    syncSettingsValues,
    syncDiffModal,
    destroyAndReturnToMenu,
    initProgressiveBackground
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CrownMenuUI = api;
})(typeof window === 'undefined' ? globalThis : window);

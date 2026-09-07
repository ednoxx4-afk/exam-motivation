/* ==========================================================================
   Custom Audio Controller & Voice Message Player System
   ========================================================================== */

export class CustomAudioPlayer {
  constructor() {
    this.audioInstances = {};
    this.activeCardId = null;
    this.audioContext = null;
    
    this.init();
  }

  init() {
    const cards = document.querySelectorAll('.audio-card');
    cards.forEach((card, index) => {
      const cardId = card.id;
      const audioSrc = card.getAttribute('data-audio-src');
      const cardIndex = index + 1;

      const playBtn = card.querySelector('.play-btn');
      const progressContainer = card.querySelector('.progress-bar-container');
      const progressFill = card.querySelector('.progress-fill-' + cardIndex);
      const progressThumb = card.querySelector('.progress-thumb-' + cardIndex);
      const timeCurrent = card.querySelector('.time-current-' + cardIndex);
      const timeDuration = card.querySelector('.time-duration-' + cardIndex);
      const statusText = card.querySelector('.audio-status');

      // HTML5 Audio element setup
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = audioSrc;

      const playerState = {
        card: card,
        audio: audio,
        playBtn: playBtn,
        progressContainer: progressContainer,
        progressFill: progressFill,
        progressThumb: progressThumb,
        timeCurrent: timeCurrent,
        timeDuration: timeDuration,
        statusText: statusText,
        isPlaying: false,
        isFallbackSynth: false,
        durationSec: 0,
        currentTimeSec: 0,
        synthInterval: null
      };

      this.audioInstances[cardId] = playerState;

      // Register audio metadata event listeners
      audio.addEventListener('loadedmetadata', () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration)) {
          playerState.durationSec = audio.duration;
          timeDuration.textContent = this.formatTime(audio.duration);
        }
      });

      audio.addEventListener('timeupdate', () => {
        if (!playerState.isDragging) {
          playerState.currentTimeSec = audio.currentTime;
          this.updateProgressUI(cardId);
        }
      });

      audio.addEventListener('ended', () => {
        this.pause(cardId);
        audio.currentTime = 0;
        playerState.currentTimeSec = 0;
        this.updateProgressUI(cardId);
        if (statusText) statusText.textContent = 'Completed ✨';
      });

      audio.addEventListener('error', () => {
        console.warn(`Audio loading notice for ${audioSrc}: Enabling synthesized fallback note.`);
        playerState.isFallbackSynth = true;
        playerState.durationSec = 10; // Default 10s fallback sample duration
        timeDuration.textContent = this.formatTime(10);
      });

      // Play button click handler
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlayPause(cardId);
      });

      // Progress bar click & seek setup
      this.setupSeeking(cardId);
    });

    // Mobile Web Audio unlock listener
    const unlockAudio = () => {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };

    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
  }

  togglePlayPause(cardId) {
    const state = this.audioInstances[cardId];
    if (!state) return;

    if (state.isPlaying) {
      this.pause(cardId);
    } else {
      this.play(cardId);
    }
  }

  play(cardId) {
    // Crucial requirement: Pause all other playing audio cards first
    Object.keys(this.audioInstances).forEach((id) => {
      if (id !== cardId && this.audioInstances[id].isPlaying) {
        this.pause(id);
      }
    });

    const state = this.audioInstances[cardId];
    if (!state) return;

    state.isPlaying = true;
    state.card.classList.add('active-playing');
    this.activeCardId = cardId;

    // UI Updates
    const playIcon = state.playBtn.querySelector('.play-icon');
    const pauseIcon = state.playBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.classList.add('hidden');
    if (pauseIcon) pauseIcon.classList.remove('hidden');

    if (state.statusText) state.statusText.textContent = 'Playing voice message...';

    if (state.isFallbackSynth) {
      this.startFallbackSynth(cardId);
    } else {
      state.audio.play().catch((err) => {
        console.warn('Playback error encountered, activating fallback player mode:', err);
        state.isFallbackSynth = true;
        this.startFallbackSynth(cardId);
      });
    }
  }

  pause(cardId) {
    const state = this.audioInstances[cardId];
    if (!state) return;

    state.isPlaying = false;
    state.card.classList.remove('active-playing');
    if (this.activeCardId === cardId) this.activeCardId = null;

    // UI Updates
    const playIcon = state.playBtn.querySelector('.play-icon');
    const pauseIcon = state.playBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.classList.remove('hidden');
    if (pauseIcon) pauseIcon.classList.add('hidden');

    if (state.statusText) state.statusText.textContent = 'Paused';

    if (state.isFallbackSynth) {
      if (state.synthInterval) {
        clearInterval(state.synthInterval);
        state.synthInterval = null;
      }
    } else {
      state.audio.pause();
    }
  }

  stopAll() {
    Object.keys(this.audioInstances).forEach((cardId) => {
      if (this.audioInstances[cardId].isPlaying) {
        this.pause(cardId);
      }
    });
  }

  setupSeeking(cardId) {
    const state = this.audioInstances[cardId];
    if (!state || !state.progressContainer) return;

    const container = state.progressContainer;

    const seek = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let posRatio = (clientX - rect.left) / rect.width;
      posRatio = Math.max(0, Math.min(1, posRatio));

      const targetDuration = state.durationSec || state.audio.duration || 10;
      const newTime = posRatio * targetDuration;

      state.currentTimeSec = newTime;
      if (!state.isFallbackSynth && !isNaN(state.audio.duration)) {
        state.audio.currentTime = newTime;
      }

      this.updateProgressUI(cardId);
    };

    container.addEventListener('click', (e) => seek(e));

    // Drag support
    const onMove = (e) => {
      if (state.isDragging) {
        seek(e);
      }
    };

    const onEnd = () => {
      if (state.isDragging) {
        state.isDragging = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
      }
    };

    container.addEventListener('mousedown', () => {
      state.isDragging = true;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    });

    container.addEventListener('touchstart', () => {
      state.isDragging = true;
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);
    }, { passive: true });
  }

  updateProgressUI(cardId) {
    const state = this.audioInstances[cardId];
    if (!state) return;

    const duration = state.durationSec || state.audio.duration || 10;
    const current = state.currentTimeSec || state.audio.currentTime || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    if (state.progressFill) {
      state.progressFill.style.width = percent + '%';
    }
    if (state.progressThumb) {
      state.progressThumb.style.left = percent + '%';
    }
    if (state.timeCurrent) {
      state.timeCurrent.textContent = this.formatTime(current);
    }
    if (state.timeDuration && duration > 0) {
      state.timeDuration.textContent = this.formatTime(duration);
    }
  }

  startFallbackSynth(cardId) {
    const state = this.audioInstances[cardId];
    if (!state) return;

    if (state.synthInterval) clearInterval(state.synthInterval);

    state.synthInterval = setInterval(() => {
      if (!state.isPlaying) return;
      state.currentTimeSec += 0.2;
      if (state.currentTimeSec >= state.durationSec) {
        this.pause(cardId);
        state.currentTimeSec = 0;
        if (state.statusText) state.statusText.textContent = 'Completed ✨';
      }
      this.updateProgressUI(cardId);
    }, 200);
  }

  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

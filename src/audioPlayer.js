/* ==========================================================================
   Custom Audio Controller & Voice Message Player System
   ========================================================================== */

const resolveAudioSrc = (src) => {
  if (!src) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('blob:') || src.startsWith('data:')) {
    return src;
  }
  const baseUrl = import.meta.env.BASE_URL || '/';
  if (src.startsWith('/')) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return cleanBase + src;
  }
  return src;
};

export class CustomAudioPlayer {
  constructor() {
    this.audioInstances = {};
    this.activeCardId = null;
    
    this.init();
  }

  init() {
    const cards = document.querySelectorAll('.audio-card');
    cards.forEach((card, index) => {
      const cardId = card.id;
      const rawAudioSrc = card.getAttribute('data-audio-src');
      const audioSrc = resolveAudioSrc(rawAudioSrc);
      const cardIndex = index + 1;

      const playBtn = card.querySelector('.play-btn') || card.querySelector(`#play-btn-${cardIndex}`);
      const progressContainer = card.querySelector('.progress-bar-container') || card.querySelector(`#progress-container-${cardIndex}`);
      const progressFill = card.querySelector('.progress-bar-fill') || card.querySelector(`#progress-fill-${cardIndex}`);
      const progressThumb = card.querySelector('.progress-thumb') || card.querySelector(`#progress-thumb-${cardIndex}`);
      const timeCurrent = card.querySelector('.time-current') || card.querySelector(`#time-current-${cardIndex}`);
      const timeDuration = card.querySelector('.time-duration') || card.querySelector(`#time-duration-${cardIndex}`);
      const statusText = card.querySelector('.audio-status');

      // Create HTML5 Audio element
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
        isDragging: false,
        durationSec: 0,
        currentTimeSec: 0
      };

      this.audioInstances[cardId] = playerState;

      // Event Listeners on Audio Element
      const updateDuration = () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          playerState.durationSec = audio.duration;
          if (timeDuration) {
            timeDuration.textContent = this.formatTime(audio.duration);
          }
        }
      };

      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('durationchange', updateDuration);
      audio.addEventListener('canplay', updateDuration);

      audio.addEventListener('timeupdate', () => {
        if (!playerState.isDragging) {
          playerState.currentTimeSec = audio.currentTime;
          this.updateProgressUI(cardId);
        }
      });

      audio.addEventListener('play', () => {
        playerState.isPlaying = true;
        card.classList.add('active-playing');
        this.activeCardId = cardId;
        this.updatePlayBtnUI(cardId, true);
        if (statusText) statusText.textContent = 'Playing voice message...';
      });

      audio.addEventListener('pause', () => {
        playerState.isPlaying = false;
        card.classList.remove('active-playing');
        if (this.activeCardId === cardId) this.activeCardId = null;
        this.updatePlayBtnUI(cardId, false);
        if (statusText && statusText.textContent !== 'Completed ✨' && !statusText.textContent.includes('error') && !statusText.textContent.includes('Failed')) {
          statusText.textContent = 'Paused';
        }
      });

      audio.addEventListener('ended', () => {
        playerState.isPlaying = false;
        audio.currentTime = 0;
        playerState.currentTimeSec = 0;
        card.classList.remove('active-playing');
        if (this.activeCardId === cardId) this.activeCardId = null;
        this.updatePlayBtnUI(cardId, false);
        this.updateProgressUI(cardId);
        if (statusText) statusText.textContent = 'Completed ✨';
      });

      audio.addEventListener('error', () => {
        playerState.isPlaying = false;
        card.classList.remove('active-playing');
        if (this.activeCardId === cardId) this.activeCardId = null;
        this.updatePlayBtnUI(cardId, false);
        const err = audio.error;
        console.error(`Audio playback error for ${audioSrc}:`, err);
        if (statusText) {
          statusText.textContent = 'Failed to load audio. Tap to retry.';
        }
      });

      audio.addEventListener('waiting', () => {
        if (playerState.isPlaying && statusText) {
          statusText.textContent = 'Loading audio...';
        }
      });

      // Play button click listener
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePlayPause(cardId);
        });
      }

      // Seeking setup
      this.setupSeeking(cardId);
    });

    // Unlock audio on mobile devices upon user interaction
    const unlockMobileAudio = () => {
      Object.keys(this.audioInstances).forEach((id) => {
        const instance = this.audioInstances[id];
        if (instance && instance.audio && instance.audio.readyState === 0) {
          instance.audio.load();
        }
      });
      window.removeEventListener('touchstart', unlockMobileAudio);
      window.removeEventListener('click', unlockMobileAudio);
    };

    window.addEventListener('touchstart', unlockMobileAudio, { passive: true });
    window.addEventListener('click', unlockMobileAudio, { passive: true });
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
    // Pause all other playing audio cards first
    Object.keys(this.audioInstances).forEach((id) => {
      if (id !== cardId && this.audioInstances[id].isPlaying) {
        this.pause(id);
      }
    });

    const state = this.audioInstances[cardId];
    if (!state) return;

    const playPromise = state.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.error(`Error playing audio card ${cardId}:`, err);
        state.isPlaying = false;
        state.card.classList.remove('active-playing');
        this.updatePlayBtnUI(cardId, false);
        if (state.statusText) {
          state.statusText.textContent = 'Playback error. Tap to try again.';
        }
      });
    }
  }

  pause(cardId) {
    const state = this.audioInstances[cardId];
    if (!state) return;

    state.audio.pause();
  }

  stopAll() {
    Object.keys(this.audioInstances).forEach((cardId) => {
      if (this.audioInstances[cardId].isPlaying) {
        this.pause(cardId);
      }
    });
  }

  updatePlayBtnUI(cardId, isPlaying) {
    const state = this.audioInstances[cardId];
    if (!state || !state.playBtn) return;

    const playIcon = state.playBtn.querySelector('.play-icon');
    const pauseIcon = state.playBtn.querySelector('.pause-icon');

    if (isPlaying) {
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
    } else {
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
    }
  }

  setupSeeking(cardId) {
    const state = this.audioInstances[cardId];
    if (!state || !state.progressContainer) return;

    const container = state.progressContainer;

    const getDuration = () => {
      if (!isNaN(state.audio.duration) && isFinite(state.audio.duration) && state.audio.duration > 0) {
        return state.audio.duration;
      }
      return state.durationSec || 0;
    };

    const seek = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : e.clientX);
      let posRatio = (clientX - rect.left) / rect.width;
      posRatio = Math.max(0, Math.min(1, posRatio));

      const duration = getDuration();
      if (duration > 0) {
        const newTime = posRatio * duration;
        state.currentTimeSec = newTime;
        state.audio.currentTime = newTime;
        this.updateProgressUI(cardId);
      }
    };

    container.addEventListener('click', (e) => {
      if (!state.isDragging) {
        seek(e);
      }
    });

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

    container.addEventListener('mousedown', (e) => {
      state.isDragging = true;
      seek(e);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    });

    container.addEventListener('touchstart', (e) => {
      state.isDragging = true;
      seek(e);
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);
    }, { passive: true });
  }

  updateProgressUI(cardId) {
    const state = this.audioInstances[cardId];
    if (!state) return;

    const duration = (!isNaN(state.audio.duration) && isFinite(state.audio.duration) && state.audio.duration > 0) ? state.audio.duration : (state.durationSec || 0);
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

  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}


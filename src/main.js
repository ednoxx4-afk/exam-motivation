/* ==========================================================================
   Main Application Entry Point & Page Navigation Controller
   ========================================================================== */

import { ParticleEngine } from './particles.js';
import { CustomAudioPlayer } from './audioPlayer.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Particle Engine
  const particles = new ParticleEngine('particle-canvas');

  // Initialize Custom Audio Player
  const audioPlayer = new CustomAudioPlayer();

  // Navigation State
  let currentPageIndex = 1;
  const totalPages = 3;

  // DOM Elements
  const pages = {
    1: document.getElementById('page-1'),
    2: document.getElementById('page-2'),
    3: document.getElementById('page-3')
  };

  const dots = {
    1: document.getElementById('dot-1'),
    2: document.getElementById('dot-2'),
    3: document.getElementById('dot-3')
  };

  const btnToPage2 = document.getElementById('btn-to-page-2');
  const btnToPage3 = document.getElementById('btn-to-page-3');

  // Smooth Page Navigation Function
  function goToPage(targetPageNum) {
    if (targetPageNum < 1 || targetPageNum > totalPages || targetPageNum === currentPageIndex) {
      return;
    }

    const currentPage = pages[currentPageIndex];
    const targetPage = pages[targetPageNum];

    // If navigating away from Page 2, pause all playing audio
    if (currentPageIndex === 2) {
      audioPlayer.stopAll();
    }

    // Exit current page animation
    if (currentPage) {
      currentPage.classList.add('exit-left');
      setTimeout(() => {
        currentPage.classList.remove('active', 'exit-left');
      }, 500);
    }

    // Enter target page animation
    setTimeout(() => {
      if (targetPage) {
        targetPage.classList.add('active');
        // Scroll page card to top smoothly on mobile
        targetPage.scrollTop = 0;
      }
    }, 150);

    // Update Dots indicator
    Object.keys(dots).forEach((pageNumStr) => {
      const pageNum = parseInt(pageNumStr, 10);
      if (pageNum === targetPageNum) {
        dots[pageNum].classList.add('active');
      } else {
        dots[pageNum].classList.remove('active');
      }
    });

    currentPageIndex = targetPageNum;

    // Trigger Page 3 Final Celebration Effects
    if (targetPageNum === 3) {
      particles.setCelebrationMode(true);
      const finalCard = document.getElementById('final-card');
      if (finalCard) {
        setTimeout(() => {
          finalCard.classList.add('final-active');
        }, 300);
      }
    } else {
      particles.setCelebrationMode(false);
    }
  }

  // Event Listeners for Navigation Buttons
  if (btnToPage2) {
    btnToPage2.addEventListener('click', () => {
      goToPage(2);
    });
  }

  if (btnToPage3) {
    btnToPage3.addEventListener('click', () => {
      goToPage(3);
    });
  }

  // Keyboard Navigation Support (Arrow keys)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (currentPageIndex < totalPages) {
        goToPage(currentPageIndex + 1);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (currentPageIndex > 1) {
        goToPage(currentPageIndex - 1);
      }
    }
  });

  // Touch swipe support for smooth mobile browsing
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 60;
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe Left -> Next Page
      if (currentPageIndex < totalPages) {
        goToPage(currentPageIndex + 1);
      }
    } else if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe Right -> Previous Page
      if (currentPageIndex > 1) {
        goToPage(currentPageIndex - 1);
      }
    }
  }
});

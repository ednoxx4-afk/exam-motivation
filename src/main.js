/* ==========================================================================
   Main Application Entry Point & Page Navigation Controller
   ========================================================================== */

import { ParticleEngine } from './particles.js';
import { CustomAudioPlayer } from './audioPlayer.js';

function initApp() {
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
      if (dots[pageNum]) {
        if (pageNum === targetPageNum) {
          dots[pageNum].classList.add('active');
        } else {
          dots[pageNum].classList.remove('active');
        }
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

  // Reliable navigation button binding for mobile touch and desktop click
  function bindNavButton(btnElement, targetPage) {
    if (!btnElement) return;

    let touchHandled = false;

    btnElement.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      touchHandled = true;
      goToPage(targetPage);
      setTimeout(() => {
        touchHandled = false;
      }, 400);
    }, { passive: false });

    btnElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!touchHandled) {
        goToPage(targetPage);
      }
    });
  }

  bindNavButton(btnToPage2, 2);
  bindNavButton(btnToPage3, 3);

  // Navigation dots click & touch listeners
  Object.keys(dots).forEach((pageNumStr) => {
    const pageNum = parseInt(pageNumStr, 10);
    const dot = dots[pageNum];
    if (dot) {
      dot.style.cursor = 'pointer';
      bindNavButton(dot, pageNum);
    }
  });

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

  // Touch swipe support for mobile browsing (excluding interactive elements)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('button, .btn, .play-btn, .progress-bar-container, .nav-dots, .dot, a, input')) {
      touchStartX = 0;
      touchStartY = 0;
      return;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (touchStartX === 0 && touchStartY === 0) return;
    if (e.target.closest('button, .btn, .play-btn, .progress-bar-container, .nav-dots, .dot, a, input')) {
      return;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      handleSwipe();
    }
  }, { passive: true });

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const swipeThreshold = 50;

    // Ensure horizontal swipe is dominant over vertical scrolling
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe Left -> Next Page
        if (currentPageIndex < totalPages) {
          goToPage(currentPageIndex + 1);
        }
      } else {
        // Swipe Right -> Previous Page
        if (currentPageIndex > 1) {
          goToPage(currentPageIndex - 1);
        }
      }
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


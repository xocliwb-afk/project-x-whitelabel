document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Mobile Menu Logic ---
  const navToggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobile-nav');
  const closeNav = document.querySelector('.mobile-nav__close');

  if (navToggle && mobileNav) {
    const openMenu = () => {
      mobileNav.classList.add('open');
      mobileNav.setAttribute('aria-hidden', 'false');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('overlay-active');
    };

    const closeMenu = () => {
      mobileNav.classList.remove('open');
      mobileNav.setAttribute('aria-hidden', 'true');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('overlay-active');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.contains('open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeNav) {
      closeNav.addEventListener('click', closeMenu);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMenu();
        navToggle.focus();
      }
    });
  }

  // --- 2. Featured Areas (Chips) Logic ---
  const chips = document.querySelectorAll('.chip');
  let activeBalloon = null;

  const hideAllBalloons = () => {
    document.querySelectorAll('.chip-container .balloon').forEach((balloon) => {
      balloon.setAttribute('hidden', '');
    });
  };

  const closeActiveBalloon = () => {
    if (!activeBalloon) return;
    activeBalloon.setAttribute('hidden', '');
    activeBalloon = null;
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const container = chip.closest('.chip-container');
      const balloon = container ? container.querySelector('.balloon') : null;
      if (!balloon) return;

      const isOpen = !balloon.hasAttribute('hidden');

      hideAllBalloons();

      if (!isOpen) {
        balloon.removeAttribute('hidden');
        activeBalloon = balloon;
      } else {
        activeBalloon = null;
      }
    });
  });

  document.addEventListener('click', (e) => {
    // 1. Handle dedicated close button click
    if (e.target.closest('.balloon-close')) {
      e.preventDefault();
      closeActiveBalloon();
      return;
    }

    if (!activeBalloon) return;

    // 2. Do nothing if another chip is clicked (let the chip's listener handle it)
    if (e.target.closest('.chip')) return;

    // 3. Close if the click is outside the balloon OR on the balloon itself (but not its content)
    if (!activeBalloon.contains(e.target) || e.target === activeBalloon) {
      closeActiveBalloon();
      return;
    }

    // 4. Handle tap-to-close on the bubble's content, ignoring links
    if (activeBalloon.contains(e.target) && !e.target.closest('a')) {
      // This is a simple implementation for "tap bubble to close"
      closeActiveBalloon();
    }
  });
});

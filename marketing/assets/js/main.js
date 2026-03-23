document.addEventListener('DOMContentLoaded', () => {
  const HERO_LAT = 42.9634;
  const HERO_LON = -85.6681;
  const HERO_ZENITH = 96; // Civil dawn/dusk
  const heroEl = document.getElementById('hero');
  const setActiveNav = () => {
    const navLinks = document.querySelectorAll('.top-nav__links a');
    if (!navLinks.length) return;
    const neighborhoods = new Set([
      'neighborhoods.html',
      'grand-rapids.html',
      'east-grand-rapids.html',
      'ada.html',
      'rockford.html',
      'kentwood.html',
      'wyoming.html',
      'byron-center.html',
      'caledonia.html',
      'grandville.html'
    ]);
    const segments = window.location.pathname.split('/').filter(Boolean);
    let file = segments.pop() || 'index.html';
    file = file.toLowerCase() || 'index.html';
    const target = neighborhoods.has(file) ? 'neighborhoods.html' : file;

    navLinks.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      link.classList.toggle('is-active', href === target);
    });
  };
  setActiveNav();

  // --- Mobile Menu ---
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
      isOpen ? closeMenu() : openMenu();
    });

    if (closeNav) closeNav.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMenu();
        navToggle.focus();
      }
    });
  }

  // --- Property rail scrolling ---
  document.querySelectorAll('[data-rail]').forEach((section) => {
    const rail = section.querySelector('.property-rail');
    const prev = section.querySelector('.rail-btn--prev');
    const next = section.querySelector('.rail-btn--next');
    if (!rail) return;

    const scrollAmount = () => Math.max(rail.clientWidth * 0.8, 260);

    prev?.addEventListener('click', () => {
      rail.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });

    next?.addEventListener('click', () => {
      rail.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });
  });

  // --- Favorite toggle (UI-only) ---
  document.querySelectorAll('.favorite-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const active = btn.classList.toggle('is-active');
      btn.textContent = active ? '♥' : '♡';
    });
  });

  // --- Modal / drawer system ---
  const backdrop = document.getElementById('globalBackdrop');
  const closeAllOverlays = () => {
    document.querySelectorAll('.ui-modal, .ui-drawer, .ui-backdrop').forEach(el => el.classList.remove('is-visible'));
    document.body.classList.remove('no-scroll');
  };
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal || !backdrop) return;
    backdrop.classList.add('is-visible');
    modal.classList.add('is-visible');
    document.body.classList.add('no-scroll');
  };
  const openDrawer = (id) => {
    const drawer = document.getElementById(id);
    if (!drawer || !backdrop) return;
    backdrop.classList.add('is-visible');
    drawer.classList.add('is-visible');
    document.body.classList.add('no-scroll');
  };

  backdrop?.addEventListener('click', closeAllOverlays);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

  const slugify = (str = '') => str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  document.querySelectorAll('[data-open-modal]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const ctxInput = document.getElementById('page_context');
      if (ctxInput) {
        const fallbackHeading = document.querySelector('main h1')?.textContent || '';
        const ctx = trigger.dataset.pageContext || slugify(fallbackHeading);
        ctxInput.value = ctx;
      }
      openModal(trigger.getAttribute('data-open-modal'));
    });
  });

  document.querySelectorAll('[data-open-drawer]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer(trigger.getAttribute('data-open-drawer'));
    });
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllOverlays();
    });
  });

  const modalForm = document.getElementById('modalForm');
  const modalStatus = document.getElementById('modal-status');
  if (modalForm && !document.getElementById('page_context')) {
    const ctxInput = document.createElement('input');
    ctxInput.type = 'hidden';
    ctxInput.name = 'page_context';
    ctxInput.id = 'page_context';
    ctxInput.value = '';
    modalForm.prepend(ctxInput);
  }
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (modalStatus) modalStatus.textContent = 'Thanks — we will reach out shortly.';
      setTimeout(() => {
        closeAllOverlays();
        if (modalStatus) modalStatus.textContent = '';
        modalForm.reset();
      }, 900);
    });
  }

  // --- Hero day/night switching (Grand Rapids, MI) ---
  const degToRad = (deg) => deg * Math.PI / 180;
  const radToDeg = (rad) => rad * 180 / Math.PI;
  const normalizeDeg = (deg) => (deg % 360 + 360) % 360;

  const computeSolarTime = (date, isSunrise) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const n1 = Math.floor(275 * (month + 1) / 9);
    const n2 = Math.floor((month + 1 + 9) / 12);
    const n3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
    const N = n1 - (n2 * n3) + day - 30;

    const lngHour = HERO_LON / 15;
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;

    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(degToRad(M))) + (0.020 * Math.sin(degToRad(2 * M))) + 282.634;
    L = normalizeDeg(L);

    let RA = radToDeg(Math.atan(0.91764 * Math.tan(degToRad(L))));
    RA = normalizeDeg(RA);
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = (RA + (Lquadrant - RAquadrant)) / 15;

    const sinDec = 0.39782 * Math.sin(degToRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(degToRad(HERO_ZENITH)) - (sinDec * Math.sin(degToRad(HERO_LAT)))) / (cosDec * Math.cos(degToRad(HERO_LAT)));
    if (cosH > 1 || cosH < -1) return null; // Sun never rises/sets (edge case)

    const H = isSunrise ? 360 - radToDeg(Math.acos(cosH)) : radToDeg(Math.acos(cosH));
    const Hhours = H / 15;

    const T = Hhours + RA - (0.06571 * t) - 6.622;
    const UT = (T - lngHour + 24) % 24;

    const utcMidnight = Date.UTC(year, month, day, 0, 0, 0);
    const utcMillis = utcMidnight + UT * 3600 * 1000;
    return new Date(utcMillis);
  };

  const updateHeroTheme = () => {
    if (!heroEl) return;
    const now = new Date();
    const dawn = computeSolarTime(now, true);
    const dusk = computeSolarTime(now, false);

    let isNight = false;
    if (dawn && dusk) {
      isNight = now < dawn || now >= dusk;
    } else {
      // Fallback: treat 7pm-6am as night if calculations fail
      const hour = now.getHours();
      isNight = hour >= 19 || hour < 6;
    }

    heroEl.classList.toggle('is-night', isNight);
  };

  updateHeroTheme();
  setInterval(updateHeroTheme, 5 * 60 * 1000);
});

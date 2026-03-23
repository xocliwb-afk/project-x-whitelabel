(() => {
  const closeMobileMenu = () => {
    const mobileNav = document.getElementById('mobile-nav');
    const navToggle = document.getElementById('navToggle');
    if (mobileNav) {
      mobileNav.classList.remove('open');
      mobileNav.setAttribute('aria-hidden', 'true');
    }
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('overlay-active');
  };

  const initDropdown = (root) => {
    const trigger = root.querySelector('[data-neighborhoods-trigger]');
    const menu = root.querySelector('[data-neighborhoods-menu]');
    if (!trigger || !menu) return;

    let open = false;
    const setOpen = (next) => {
      open = next;
      trigger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      menu.classList.toggle('is-open', open);
    };

    setOpen(false);

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      setOpen(!open);
    });

    menu.querySelectorAll('[data-neighborhoods-link]').forEach((link) => {
      link.addEventListener('click', () => {
        setOpen(false);
        closeMobileMenu();
      });
    });

    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!root.contains(target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    });
  };

  const initMobileToggle = (root) => {
    const trigger = root.querySelector('[data-neighborhoods-mobile-trigger]');
    const menu = root.querySelector('[data-neighborhoods-mobile-menu]');
    if (!trigger || !menu) return;
    let open = false;
    const setOpen = (next) => {
      open = next;
      trigger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    };
    setOpen(false);
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      setOpen(!open);
    });
    menu.querySelectorAll('[data-neighborhoods-link]').forEach((link) => {
      link.addEventListener('click', () => {
        setOpen(false);
        closeMobileMenu();
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    });
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!root.contains(target)) {
        setOpen(false);
      }
    });
  };

  document.querySelectorAll('[data-neighborhoods-root]').forEach(initDropdown);
  document.querySelectorAll('[data-neighborhoods-mobile-root]').forEach(initMobileToggle);
})();

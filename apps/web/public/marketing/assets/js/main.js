document.addEventListener('DOMContentLoaded', () => {
  const HERO_LAT = 42.9634;
  const HERO_LON = -85.6681;
  const HERO_ZENITH = 96; // Civil dawn/dusk
  const heroEl = document.getElementById('hero');
  const setActiveNav = () => {
    const navLinks = document.querySelectorAll('.top-nav__links a');
    if (!navLinks.length) return;
    const neighborhoods = new Set([
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
    const normalizeRoute = (value = '') => {
      let next = String(value || '').toLowerCase().trim();
      if (!next || next === '#!' || next === '#') return '';
      next = next.replace(/^\/+/, '').replace(/\/+$/, '');
      if (next.endsWith('.html')) {
        next = next.slice(0, -5);
      }
      return next || 'index';
    };
    const normalizedNeighborhoods = new Set(Array.from(neighborhoods).map((slug) => normalizeRoute(slug)));
    const segments = window.location.pathname.split('/').filter(Boolean);
    const currentRoute = normalizeRoute(segments.pop() || 'index');
    const target = normalizedNeighborhoods.has(currentRoute) ? 'neighborhoods' : currentRoute;

    navLinks.forEach(link => {
      const href = normalizeRoute(link.getAttribute('href') || '');
      if (!href) {
        link.classList.remove('is-active');
        return;
      }
      link.classList.toggle('is-active', href === target);
    });
  };
  setActiveNav();

  // --- reCAPTCHA ---
  let recaptchaSiteKey = "";
  let recaptchaReady = false;

  const initRecaptcha = async () => {
    try {
      const res = await fetch("/recaptcha/site-key", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      recaptchaSiteKey = String(data?.siteKey || "");
      if (!recaptchaSiteKey) return;

      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
        recaptchaSiteKey
      )}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.grecaptcha?.ready) {
          window.grecaptcha.ready(() => {
            recaptchaReady = true;
          });
        } else {
          recaptchaReady = true;
        }
      };
      document.head.appendChild(script);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[Marketing] Failed to init reCAPTCHA", e);
    }
  };

  const MAX_CONTEXT_LENGTH = 8192;
  const MAX_URL_LENGTH = 1000;
  const PII_QUERY_KEYS = [
    "name",
    "firstName",
    "lastName",
    "email",
    "phone",
    "message",
    "interest",
    "preferredArea",
    "preferred_area",
    "token",
    "captcha",
    "captchaToken",
    "g-recaptcha-response",
    "g-recaptcha_response",
  ];

  const sanitizeUrl = (raw) => {
    if (!raw) return undefined;
    try {
      const url = new URL(raw);
      PII_QUERY_KEYS.forEach((key) => {
        url.searchParams.delete(key);
        url.searchParams.delete(key.toLowerCase());
      });
      const output = url.toString();
      return output.length > MAX_URL_LENGTH ? output.slice(0, MAX_URL_LENGTH) : output;
    } catch {
      return undefined;
    }
  };

  const buildLeadContext = ({
    pageSlug,
    intent,
    entry_source,
    source,
    listing_id,
    listing_address,
  }) => {
    try {
      const pageUrl = sanitizeUrl(window.location.href);
      const referrer = sanitizeUrl(document.referrer || "");
      const params = new URLSearchParams(window.location.search || "");
      const pickUtm = (key) => {
        const val = params.get(key);
        return val ? val.slice(0, 300) : undefined;
      };

      const ctxBase = {
        ctx_v: 1,
        page_type: "marketing",
        page_slug: pageSlug || getPageSlug(),
        page_url: pageUrl,
        referrer,
        utm_source: pickUtm("utm_source"),
        utm_medium: pickUtm("utm_medium"),
        utm_campaign: pickUtm("utm_campaign"),
        utm_term: pickUtm("utm_term"),
        utm_content: pickUtm("utm_content"),
        intent,
        entry_source,
        source,
        listing_id,
        listing_address,
        timestamp: new Date().toISOString(),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      };

      Object.keys(ctxBase).forEach((key) => {
        if (ctxBase[key] === undefined || ctxBase[key] === null || ctxBase[key] === "") {
          delete ctxBase[key];
        }
      });

      const dropOrder = [
        "utm_content",
        "utm_term",
        "referrer",
        "viewport_width",
        "viewport_height",
        "listing_address",
      ];

      const safeStringify = (obj) => JSON.stringify(obj);
      let json = safeStringify(ctxBase);
      if (json.length <= MAX_CONTEXT_LENGTH) return json;

      const working = { ...ctxBase };
      for (const key of dropOrder) {
        if (key in working) {
          delete working[key];
          json = safeStringify(working);
          if (json.length <= MAX_CONTEXT_LENGTH) return json;
        }
      }

      return safeStringify({
        ctx_v: 1,
        page_url: pageUrl,
        page_type: "marketing",
        timestamp: ctxBase.timestamp,
        truncated: true,
      });
    } catch {
      return undefined;
    }
  };

  const storageKeys = {
    id: "marketing_lead_listing_id",
    address: "marketing_lead_listing_address",
  };

  const safeStore = (() => {
    let memoryStore = {};
    return {
      set: (key, value) => {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          memoryStore[key] = value;
        }
      },
      get: (key) => {
        try {
          return sessionStorage.getItem(key) ?? memoryStore[key] ?? null;
        } catch {
          return memoryStore[key] ?? null;
        }
      },
      remove: (key) => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          delete memoryStore[key];
        }
      },
      clearListing: () => {
        safeStore.remove(storageKeys.id);
        safeStore.remove(storageKeys.address);
        window.__marketingActiveListing = undefined;
      },
    };
  })();

  let lastLeadModalTrigger = null;
  safeStore.clearListing();

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
  const lockBodyScrollIfNeeded = () => {
    if (document.body.classList.contains('no-scroll')) return;
    const scrollY = window.scrollY || 0;
    document.body.dataset.scrollY = String(scrollY);
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('no-scroll');
  };
  const unlockBodyScrollIfNeeded = () => {
    if (!document.body.classList.contains('no-scroll')) return;
    const scrollY = Number.parseInt(document.body.dataset.scrollY || '0', 10) || 0;
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    delete document.body.dataset.scrollY;
    window.scrollTo(0, scrollY);
  };
  const closeAllOverlays = () => {
    document.querySelectorAll('.ui-modal, .ui-drawer, .ui-backdrop').forEach(el => el.classList.remove('is-visible'));
    unlockBodyScrollIfNeeded();
    lastLeadModalTrigger = null;
    safeStore.clearListing();
  };
  const hideModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('is-visible');
  };
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal || !backdrop) return;
    backdrop.classList.add('is-visible');
    modal.classList.add('is-visible');
    lockBodyScrollIfNeeded();
  };
  const openDrawer = (id) => {
    const drawer = document.getElementById(id);
    if (!drawer || !backdrop) return;
    backdrop.classList.add('is-visible');
    drawer.classList.add('is-visible');
    lockBodyScrollIfNeeded();
  };

  backdrop?.addEventListener('click', closeAllOverlays);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

  const slugify = (str = '') => str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const REQUIRED_MODAL_FIELDS = [
    { name: 'first_name', requiredMessage: 'First name is required.' },
    { name: 'last_name', requiredMessage: 'Last name is required.' },
    { name: 'email', requiredMessage: 'Email is required.' },
    { name: 'interest', requiredMessage: "Please choose what you're interested in." },
  ];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const getModalErrorId = (fieldName) => `err_${fieldName}`;
  const getModalFieldElement = (formEl, fieldName) => {
    if (!(formEl instanceof HTMLFormElement)) return null;
    const field = formEl.elements.namedItem(fieldName);
    if (!(field instanceof HTMLElement)) return null;
    return field;
  };
  const ensureModalFieldErrorEl = (formEl, fieldName) => {
    if (!(formEl instanceof HTMLFormElement)) return null;
    const expectedId = getModalErrorId(fieldName);
    let errorEl = formEl.querySelector(`#${expectedId}`);
    if (!(errorEl instanceof HTMLElement)) {
      const fieldEl = getModalFieldElement(formEl, fieldName);
      if (!(fieldEl instanceof HTMLElement)) return null;
      const wrapper = fieldEl.closest('.hp-modal-field');
      if (!(wrapper instanceof HTMLElement)) return null;
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      errorEl.id = expectedId;
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      wrapper.appendChild(errorEl);
    }
    return errorEl;
  };
  const clearModalFieldError = (formEl, fieldName) => {
    const fieldEl = getModalFieldElement(formEl, fieldName);
    const errorEl = ensureModalFieldErrorEl(formEl, fieldName);
    if (fieldEl instanceof HTMLElement) {
      fieldEl.classList.remove('is-invalid');
      fieldEl.removeAttribute('aria-invalid');
      const describedBy = fieldEl.getAttribute('aria-describedby') || '';
      const tokens = describedBy
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => token !== getModalErrorId(fieldName));
      if (tokens.length > 0) {
        fieldEl.setAttribute('aria-describedby', tokens.join(' '));
      } else {
        fieldEl.removeAttribute('aria-describedby');
      }
    }
    if (errorEl instanceof HTMLElement) {
      errorEl.textContent = '';
    }
  };
  const setModalFieldError = (formEl, fieldName, message) => {
    const fieldEl = getModalFieldElement(formEl, fieldName);
    const errorEl = ensureModalFieldErrorEl(formEl, fieldName);
    if (fieldEl instanceof HTMLElement) {
      fieldEl.classList.add('is-invalid');
      fieldEl.setAttribute('aria-invalid', 'true');
      fieldEl.setAttribute('aria-describedby', getModalErrorId(fieldName));
    }
    if (errorEl instanceof HTMLElement) {
      errorEl.textContent = message;
    }
  };
  const validateModalField = (formEl, fieldName, requiredMessage) => {
    const fieldEl = getModalFieldElement(formEl, fieldName);
    if (!(fieldEl instanceof HTMLElement)) return null;
    const value = (fieldEl.value || '').toString().trim();
    if (!value) return requiredMessage;
    if (fieldName === 'email' && !emailPattern.test(value)) {
      return 'Enter a valid email address.';
    }
    return null;
  };
  const validateModalForm = (formEl) => {
    let firstInvalidEl = null;
    REQUIRED_MODAL_FIELDS.forEach(({ name, requiredMessage }) => {
      const nextError = validateModalField(formEl, name, requiredMessage);
      if (nextError) {
        setModalFieldError(formEl, name, nextError);
        if (!firstInvalidEl) {
          firstInvalidEl = getModalFieldElement(formEl, name);
        }
      } else {
        clearModalFieldError(formEl, name);
      }
    });
    return {
      isValid: !firstInvalidEl,
      firstInvalidEl,
    };
  };
  const clearModalValidation = (formEl) => {
    REQUIRED_MODAL_FIELDS.forEach(({ name }) => clearModalFieldError(formEl, name));
  };

  const handleOpenModalTrigger = (trigger) => {
    lastLeadModalTrigger = trigger;
    const ctxInput = document.getElementById('page_context');
    if (ctxInput) {
      const fallbackHeading = document.querySelector('main h1')?.textContent || '';
      const ctx = trigger.dataset.pageContext || slugify(fallbackHeading);
      ctxInput.value = ctx;
    }

    const listingId = trigger.getAttribute('data-listing-id') || "";
    const listingAddress = trigger.getAttribute('data-listing-address') || "";
    if (listingId) {
      safeStore.set(storageKeys.id, listingId);
      if (listingAddress) safeStore.set(storageKeys.address, listingAddress);
      window.__marketingActiveListing = { id: listingId, address: listingAddress || "" };
    } else if (window.__marketingActiveListing) {
      safeStore.set(storageKeys.id, window.__marketingActiveListing.id || "");
      safeStore.set(storageKeys.address, window.__marketingActiveListing.address || "");
    } else {
      safeStore.clearListing();
    }

    const targetModalId = trigger.getAttribute('data-open-modal');
    if (targetModalId === 'contactModal') {
      const listingModalEl = document.getElementById('listingModal');
      const triggerInsideListing = trigger.closest('#listingModal');
      const listingVisible = listingModalEl?.classList?.contains('is-visible');
      if (triggerInsideListing || listingVisible) {
        hideModal('listingModal');
      }
    }

    openModal(targetModalId);
    if (targetModalId === 'contactModal' && modalForm instanceof HTMLFormElement) {
      clearModalValidation(modalForm);
      if (modalStatus) modalStatus.textContent = '';
    }
  };

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const listingTrigger = target.closest('[data-view-listing]');
    if (listingTrigger) {
      const listingId =
        listingTrigger.getAttribute('data-listing-id') ||
        listingTrigger.getAttribute('data-view-listing');
      if (listingId) {
        e.preventDefault();
        openListingModal(listingId);
        return;
      }
    }
    const modalTrigger = target.closest('[data-open-modal]');
    if (modalTrigger) {
      e.preventDefault();
      handleOpenModalTrigger(modalTrigger);
      return;
    }
    const drawerTrigger = target.closest('[data-open-drawer]');
    if (drawerTrigger) {
      e.preventDefault();
      openDrawer(drawerTrigger.getAttribute('data-open-drawer'));
    }
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllOverlays();
    });
  });

  const modalForm = document.getElementById('modalForm');
  const modalStatus = document.getElementById('modal-status');
  if (modalForm instanceof HTMLFormElement) {
    modalForm.noValidate = true;
    REQUIRED_MODAL_FIELDS.forEach(({ name, requiredMessage }) => {
      ensureModalFieldErrorEl(modalForm, name);
      const fieldEl = getModalFieldElement(modalForm, name);
      if (!(fieldEl instanceof HTMLElement)) return;
      const revalidateField = () => {
        const nextError = validateModalField(modalForm, name, requiredMessage);
        if (nextError) {
          setModalFieldError(modalForm, name, nextError);
        } else {
          clearModalFieldError(modalForm, name);
        }
      };
      const valueEvent = fieldEl instanceof HTMLSelectElement ? 'change' : 'input';
      fieldEl.addEventListener(valueEvent, () => {
        if (fieldEl.classList.contains('is-invalid')) {
          revalidateField();
        }
      });
      fieldEl.addEventListener('blur', () => {
        const currentValue = (fieldEl.value || '').toString().trim();
        if (fieldEl.classList.contains('is-invalid') || !currentValue) {
          revalidateField();
        }
      });
    });

    if (!document.getElementById('page_context')) {
      const ctxInput = document.createElement('input');
      ctxInput.type = 'hidden';
      ctxInput.name = 'page_context';
      ctxInput.id = 'page_context';
      ctxInput.value = '';
      modalForm.prepend(ctxInput);
    }

    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const validation = validateModalForm(modalForm);
      if (!validation.isValid) {
        if (modalStatus) modalStatus.textContent = 'Please correct the highlighted fields.';
        validation.firstInvalidEl?.focus();
        return;
      }

      const formData = new FormData(modalForm);
      const firstName = (formData.get('first_name') || '').toString().trim();
      const lastName = (formData.get('last_name') || '').toString().trim();
      const email = (formData.get('email') || '').toString().trim();
      const phone = (formData.get('phone') || '').toString().trim();
      const interest = (formData.get('interest') || '').toString().trim();
      const preferredArea = (formData.get('preferred_area') || '').toString().trim();
      const userMessage = (formData.get('message') || '').toString().trim();
      const pageContextForm = (formData.get('page_context') || '').toString().trim();

      const pageContext =
        pageContextForm ||
        (window.location.pathname || '/')
          .replace(/^\/+/, '')
          .replace(/\.html$/, '') ||
        'home';

      if (!recaptchaSiteKey || !recaptchaReady || !window.grecaptcha?.execute) {
        if (modalStatus) modalStatus.textContent = 'Captcha not ready. Please try again.';
        return;
      }

      if (modalStatus) modalStatus.textContent = 'Verifying...';

      let captchaToken;
      try {
        captchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: "submit_lead" });
      } catch (err) {
        if (modalStatus) modalStatus.textContent = 'Captcha not ready. Please try again.';
        return;
      }

      if (!captchaToken) {
        if (modalStatus) modalStatus.textContent = 'Captcha not ready. Please try again.';
        return;
      }

      const name = `${firstName} ${lastName}`.trim();
      const lines = [];
      if (userMessage) lines.push(userMessage);
      lines.push('---');
      lines.push(`Interest: ${interest}`);
      if (preferredArea) lines.push(`Preferred area: ${preferredArea}`);
      lines.push(`Page: ${pageContext}`);
      const finalMessage = lines.join('\n');

      const listingIdStored = safeStore.get(storageKeys.id) || "";
      const listingAddressStored = safeStore.get(storageKeys.address) || "";
      const hasListingContext = Boolean(listingIdStored);
      const payloadSource = hasListingContext
        ? `marketing:${pageContext}:listing`
        : `marketing:${pageContext}`;
      const intent = hasListingContext ? "get-details" : "talk-to-brandon";

      const deriveEntrySource = () => {
        let entry = lastLeadModalTrigger?.getAttribute?.('data-entry-source') || '';
        if (!entry && lastLeadModalTrigger?.closest?.('header')) entry = 'marketing-header-nav';
        if (!entry && lastLeadModalTrigger?.closest?.('footer')) entry = 'marketing-footer-cta';
        if (!entry) entry = `marketing-${pageContext}-cta`;
        return entry;
      };
      const entrySource = deriveEntrySource();

      const context = buildLeadContext({
        pageSlug: pageContext,
        intent,
        entry_source: entrySource,
        source: payloadSource,
        listing_id: hasListingContext ? listingIdStored : undefined,
        listing_address: hasListingContext ? listingAddressStored : undefined,
      });

      const payload = {
        name,
        email,
        phone: phone || undefined,
        message: finalMessage,
        brokerId: 'demo-broker',
        source: payloadSource || 'marketing-contact-form',
        captchaToken,
        context,
        ...(hasListingContext
          ? {
              listingId: listingIdStored,
              listingAddress: listingAddressStored || undefined,
            }
          : {}),
      };

      if (modalStatus) modalStatus.textContent = 'Submitting...';

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          const errorMsg = data?.message || 'Lead submission failed';
          throw new Error(errorMsg);
        }
        if (modalStatus) modalStatus.textContent = 'Thanks — we will reach out shortly.';
        setTimeout(() => {
          closeAllOverlays();
          if (modalStatus) modalStatus.textContent = '';
          modalForm.reset();
          clearModalValidation(modalForm);
        }, 900);
      } catch (err) {
        console.error('Lead submit failed', err);
        const fallbackMessage = 'Error submitting form. Please try again.';
        const errorText = err?.message || fallbackMessage;
        if (modalStatus) modalStatus.textContent = errorText;
      }
    });
  }

  // --- Featured listings (live) ---
  const featuredGrid = document.querySelector('.hp-featured-grid');
  const featuredLoading = document.getElementById('featuredListingsLoading');
  const placeholderImage = "/assets/img/1.webp";

  const escapeHtml = (str = "") =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const shuffle = (arr = []) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const NEIGHBORHOOD_FILTERS = {
    "ada": { zips: ["49301"], cities: ["Ada", "Ada Township", "Ada Twp", "Ada Charter Township"] },
    "grand-rapids": { zips: ["49503","49504","49505","49506","49507","49508","49525","49534","49546"], cities: ["Grand Rapids"] },
    "east-grand-rapids": { zips: ["49506"], cities: ["East Grand Rapids","Grand Rapids"] },
    "byron-center": { zips: ["49315"], cities: ["Byron Center"] },
    "caledonia": { zips: ["49316"], cities: ["Caledonia"] },
    "grandville": { zips: ["49418"], cities: ["Grandville"] },
    "kentwood": { zips: ["49508","49512"], cities: ["Kentwood","Grand Rapids"] },
    "rockford": { zips: ["49341"], cities: ["Rockford"] },
    "wyoming": { zips: ["49418","49509","49519"], cities: ["Wyoming"] },
  };

  const FEATURED_COUNT_NEIGHBORHOOD = 8;
  const MIN_PRICE_NEIGHBORHOOD = 300000;
  const GR_METRO_BBOX = "-85.8,42.8,-85.5,43.1";

  const getPageSlug = () => {
    const p = window.location.pathname || "";
    const parts = p.split("/").filter(Boolean);
    const last = parts.pop() || "";
    const slug = last.replace(/\.html$/i, "");
    return slug.toLowerCase();
  };

  const isActiveForSale = (listing) => {
    const raw = listing?.details?.status || listing?.meta?.status || "";
    const s = String(raw).toUpperCase();
    if (s.includes("PENDING") || s.includes("SOLD") || s.includes("CLOSED")) return false;
    if (s.includes("ACTIVE")) return true;
    if (s === "FOR_SALE" || s.includes("FOR_SALE")) return true;
    if (!s) return true;
    return false;
  };

  const NEIGHBORHOODS = [
    {
      slug: 'grand-rapids',
      name: 'Grand Rapids',
      description:
        'City neighborhoods with walkable amenities, historic homes, and ongoing revitalization projects.',
      image: 'GR_Hero.webp',
    },
    {
      slug: 'ada',
      name: 'Ada',
      description:
        'Riverside living, village conveniences, and estate-style homes with room to breathe.',
      image: 'Ada_Hero.webp',
    },
    {
      slug: 'byron-center',
      name: 'Byron Center',
      description:
        'Popular new-construction corridors, community parks, and easy access to regional employers.',
      image: 'Byron_Center_Hero.webp',
    },
    {
      slug: 'caledonia',
      name: 'Caledonia',
      description:
        'Growth-friendly schools, newer subdivisions, and open spaces with quick routes to GR.',
      image: 'Caledonia_Hero.webp',
    },
    {
      slug: 'east-grand-rapids',
      name: 'East Grand Rapids',
      description:
        'Tree-lined streets, Reeds Lake access, and a tight-knit community vibe near downtown.',
      image: 'EGR_Hero.webp',
    },
    {
      slug: 'grandville',
      name: 'Grandville',
      description:
        'Established neighborhoods, retail conveniences, and commuter-friendly access to the metro area.',
      image: 'Grandville_Hero.webp',
    },
    {
      slug: 'kentwood',
      name: 'Kentwood',
      description:
        'Diverse housing options, parks, and quick access to the airport, 131, and 96 corridors.',
      image: 'Kentwood_Hero.webp',
    },
    {
      slug: 'rockford',
      name: 'Rockford',
      description:
        'River town character, trail access, and a mix of historic downtown and newer builds.',
      image: 'Rockford_Hero.webp',
    },
    {
      slug: 'wyoming',
      name: 'Wyoming',
      description:
        'Convenient west-side hub with parks, shopping, and steady-value neighborhoods.',
      image: 'Wyoming_Hero.webp',
    },
  ];

  const renderFeaturedNeighborhoods = () => {
    const grid = document.querySelector('.neighborhood-grid--featured');
    if (!grid) return;
    const picks = shuffle([...NEIGHBORHOODS]).slice(0, 4);
    const html = picks
      .map((n) => {
        const slug = escapeHtml(n.slug);
        const name = escapeHtml(n.name);
        const desc = escapeHtml(n.description);
        const image = escapeHtml(n.image);
        const image1x = escapeHtml(n.image.replace(/\.webp$/, "_400.webp"));
        return `
          <a class="area-card" href="${slug}.html">
            <div class="area-card__image" style="background-image:url('./assets/img/${image}'); background-image:image-set(url('./assets/img/${image1x}') 1x, url('./assets/img/${image}') 2x);"></div>
            <div class="area-card__body">
              <h3>${name}</h3>
              <p>${desc}</p>
            </div>
          </a>
        `;
      })
      .join('');
    grid.innerHTML = html;
  };

  const formatNumber = (num) =>
    typeof num === "number" && Number.isFinite(num) ? num.toLocaleString() : "—";

  const normalizeRemarks = (text) => {
    if (!text) return "";
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) return "";
    return normalized.replace(/\n\s*\n\s*\n+/g, "\n\n");
  };

  const normalizeZip = (zip) => {
    if (!zip) return "";
    return String(zip).trim().split("-")[0];
  };

  const normalizeCity = (city) => {
    if (!city) return "";
    return String(city)
      .toLowerCase()
      .replace(/\s+(township|twp)\b/g, "")
      .trim();
  };

  const MAX_DESC_WORDS = 120;
  const truncateWords = (text, maxWords) => {
    if (!text) return { text: "", truncated: false };
    const matches = [...text.matchAll(/\S+/g)];
    if (matches.length <= maxWords) {
      return { text, truncated: false };
    }
    const cutoffIndex = matches[maxWords - 1].index + matches[maxWords - 1][0].length;
    const sliced = text.slice(0, cutoffIndex).trimEnd();
    return { text: `${sliced}…`, truncated: true };
  };

  const formatAttribution = (listing) => {
    const agent = listing?.agent || listing?.coAgent || {};
    const agentName =
      [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim() ||
      (agent.name || "").trim();
    const officeName = (listing?.office?.name || "").trim();
    const brokerageName = (listing?.office?.brokerageName || listing?.brokerageName || "").trim();
    const best = officeName || brokerageName || agentName || "Listing agent on file";
    return `Listed by ${best}\nData provided by SimplyRETS`;
  };

  const formatPrice = (listing) => {
    if (listing?.listPriceFormatted) return listing.listPriceFormatted;
    const price = Number(listing?.listPrice ?? listing?.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) return "$—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPhotoUrl = (listing) => {
    const thumb = (listing?.media?.thumbnailUrl || "").trim();
    if (thumb) return thumb;
    const photos = Array.isArray(listing?.media?.photos) ? listing.media.photos : [];
    const first = photos[0];
    if (typeof first === "string" && first.trim()) {
      return first.trim();
    }
    if (first && typeof first === "object") {
      const maybe = [first.href, first.url, first.src].find(
        (v) => typeof v === "string" && v.trim()
      );
      if (maybe) return maybe.trim();
    }
    return placeholderImage;
  };

  const buildCardHtml = (listing) => {
    const rawId = listing?.id != null ? listing.id : listing?.mlsId;
    if (rawId == null) return "";

    const price = formatPrice(listing);
    const street = escapeHtml(
      listing?.address?.street || listing?.address?.full || "Address unavailable"
    );
    const city = escapeHtml(listing?.address?.city || "");
    const state = escapeHtml(listing?.address?.state || "");
    const cityLine = [city, state].filter(Boolean).join(", ");

    const beds = listing?.details?.beds ?? listing?.details?.bedrooms ?? listing?.beds;
    const baths =
      listing?.details?.baths ?? listing?.details?.bathrooms ?? listing?.baths;
    const sqft = listing?.details?.sqft ?? listing?.sqft;

    const photo = getPhotoUrl(listing);
    const safePhoto = escapeHtml(photo);
    const safePlaceholder = escapeHtml(placeholderImage);
    const altText = escapeHtml(street || "Featured listing");

    const meta = `${formatNumber(beds)} Beds · ${formatNumber(baths)} Baths · ${formatNumber(
      sqft
    )} sqft`;

    const id = escapeHtml(String(rawId));
    const attribution = escapeHtml(formatAttribution(listing)).replace(/\n/g, "<br>");

    return `
      <article class="property-card hp-featured-card" role="listitem" data-listing-id="${id}">
        <div class="property-card__media">
          <img src="${safePhoto}" alt="${altText}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${safePlaceholder}';">
        </div>
        <div class="property-card__body">
          <div class="property-card__price">${price}</div>
          <div class="property-card__address">${street}${cityLine ? `<br>${cityLine}` : ""}</div>
          <div class="property-card__meta">${meta}</div>
          <div class="property-card__footer">
            <button class="btn btn-secondary hp-featured-btn btn-block" type="button" data-view-listing data-listing-id="${id}">View Details</button>
          </div>
          <div class="property-card__attribution">${attribution}</div>
        </div>
      </article>
    `;
  };

  let listingModalEls = null;

  const ensureListingModalMarkup = () => {
    if (listingModalEls) return listingModalEls;
    let modal = document.getElementById("listingModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "ui-modal";
      modal.id = "listingModal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML = `
        <div class="listing-modal">
          <div class="listing-modal__header">
            <h3 id="listing-modal-title">Listing Details</h3>
            <button class="btn-close" type="button" aria-label="Close" data-close>&times;</button>
          </div>
          <div class="listing-modal__body">
            <div class="listing-modal__left">
              <div class="listing-modal__hero">
                <img id="listingModalHero" src="${placeholderImage}" alt="Listing photo">
                <button class="listing-modal__nav listing-modal__nav--prev" type="button" aria-label="Previous photo">‹</button>
                <button class="listing-modal__nav listing-modal__nav--next" type="button" aria-label="Next photo">›</button>
                <div class="listing-modal__counter" id="listingModalCounter"></div>
              </div>
              <div class="listing-modal__thumbs" id="listingModalThumbs"></div>
              <div class="listing-modal__description" id="listingModalDescription"></div>
            </div>
            <div class="listing-modal__right" id="listingModalRight">
              <p class="listing-modal__loading">Loading…</p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const closeBtn = modal.querySelector('[data-close]');
    const closeModalFallback = () => {
      modal.classList.remove("is-visible");
      document.body.classList.remove("no-scroll");
      const backdropEl = document.getElementById("globalBackdrop");
      backdropEl?.classList.remove("is-visible");
    };
    if (closeBtn) {
      closeBtn.onclick = () => (typeof closeAllOverlays === "function" ? closeAllOverlays() : closeModalFallback());
    }
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        if (typeof closeAllOverlays === "function") closeAllOverlays();
        else closeModalFallback();
      }
    });

    listingModalEls = {
      modal,
      hero: modal.querySelector("#listingModalHero"),
      counter: modal.querySelector("#listingModalCounter"),
      thumbs: modal.querySelector("#listingModalThumbs"),
      description: modal.querySelector("#listingModalDescription"),
      right: modal.querySelector("#listingModalRight"),
      prev: modal.querySelector(".listing-modal__nav--prev"),
      next: modal.querySelector(".listing-modal__nav--next"),
    };
    return listingModalEls;
  };

  const renderListingModal = (listing) => {
    const els = ensureListingModalMarkup();
    if (!els) return;
    const photos = Array.isArray(listing?.media?.photos) ? listing.media.photos.filter(Boolean) : [];
    const thumb = listing?.media?.thumbnailUrl || null;
    const fallback = thumb || photos[0] || placeholderImage;
    let activeIndex = 0;

    const setHero = (idx) => {
      const safeIdx = photos.length ? ((idx % photos.length) + photos.length) % photos.length : 0;
      activeIndex = safeIdx;
      const src = photos.length ? photos[safeIdx] : fallback;
      els.hero.src = src || placeholderImage;
      els.hero.alt = listing?.address?.full || "Listing photo";
      if (els.counter) {
        els.counter.textContent = photos.length ? `${safeIdx + 1} / ${photos.length}` : "1 / 1";
      }
      if (els.thumbs) {
        els.thumbs.querySelectorAll("button").forEach((btn, i) => {
          btn.classList.toggle("is-active", i === safeIdx);
        });
      }
    };

    if (els.thumbs) {
      if (photos.length) {
        els.thumbs.innerHTML = photos
          .map(
            (p, idx) => `
            <button type="button" class="listing-modal__thumb${idx === 0 ? " is-active" : ""}" data-idx="${idx}">
              <img src="${escapeHtml(p)}" alt="Thumbnail ${idx + 1}">
            </button>
          `
          )
          .join("");
        els.thumbs.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-idx"));
            setHero(idx);
          });
        });
      } else {
        els.thumbs.innerHTML = `
          <button type="button" class="listing-modal__thumb is-active">
            <img src="${escapeHtml(fallback)}" alt="Listing photo">
          </button>
        `;
      }
    }

    els.prev.onclick = photos.length > 1 ? () => setHero(activeIndex - 1) : null;
    els.next.onclick = photos.length > 1 ? () => setHero(activeIndex + 1) : null;
    if (photos.length <= 1) {
      els.prev.style.display = "none";
      els.next.style.display = "none";
    } else {
      els.prev.style.display = "";
      els.next.style.display = "";
    }
    setHero(0);

    const status = (listing?.details?.status || "").toString().trim();
    const beds = listing?.details?.beds ?? null;
    const baths = listing?.details?.baths ?? null;
    const sqft = listing?.details?.sqft ?? null;
    const lotSize = listing?.details?.lotSize ?? null;
    const yearBuilt = listing?.details?.yearBuilt ?? null;
    const hoa = listing?.details?.hoaFees ?? null;
    const basement = listing?.details?.basement ?? null;
    const propertyType = listing?.details?.propertyType ?? null;
    const dom = listing?.meta?.daysOnMarket ?? null;

    const keyFacts = [];
    if (status) keyFacts.push({ label: "Status", value: status.replace(/_/g, " ") });
    if (Number.isFinite(dom) && dom > 0) keyFacts.push({ label: "Days on Market", value: `${dom}` });
    if (Number.isFinite(lotSize) && lotSize > 0) keyFacts.push({ label: "Lot Size", value: `${lotSize.toLocaleString(undefined, { maximumFractionDigits: 2 })} ac` });
    if (Number.isFinite(yearBuilt) && yearBuilt > 0) keyFacts.push({ label: "Year Built", value: `${yearBuilt}` });
    if (propertyType) keyFacts.push({ label: "Property Type", value: propertyType });
    if (Number.isFinite(hoa) && hoa > 0) keyFacts.push({ label: "HOA", value: `$${hoa.toLocaleString()}` });
    if (basement) keyFacts.push({ label: "Basement", value: basement });

    const detailRows = [];
    const agentName = [listing?.agent?.firstName, listing?.agent?.lastName].filter(Boolean).join(" ").trim();
    const coAgentName = [listing?.coAgent?.firstName, listing?.coAgent?.lastName].filter(Boolean).join(" ").trim();
    const brokerage = (listing?.office?.name || "").trim();
    const schoolDistrict = (listing?.school?.district || "").trim();
    const taxAmount = listing?.tax?.annualAmount;
    const taxYear = listing?.tax?.year;

    if (agentName) detailRows.push({ label: "Agent", value: agentName });
    if (coAgentName) detailRows.push({ label: "Co-Agent", value: coAgentName });
    if (brokerage) detailRows.push({ label: "Brokerage", value: brokerage });
    if (schoolDistrict) detailRows.push({ label: "School District", value: schoolDistrict });
    if (Number.isFinite(taxAmount)) {
      const taxValue = `$${taxAmount.toLocaleString()}${taxYear ? ` (${taxYear})` : ""}`;
      detailRows.push({ label: "Tax", value: taxValue });
    }

    const specs = [];
    if (beds != null) specs.push(`${beds} bd`);
    if (baths != null) specs.push(`${baths} ba`);
    if (Number.isFinite(sqft) && sqft > 0) specs.push(`${sqft.toLocaleString()} sqft`);

    const attribution = escapeHtml(formatAttribution(listing)).replace(/\n/g, "<br>");

    const fullDesc = normalizeRemarks(
      listing?.description ?? listing?.remarks ?? listing?.details?.publicRemarks ?? ""
    );
    if (els.description) {
      const { text: descOut, truncated } = truncateWords(fullDesc, MAX_DESC_WORDS);
      const safeDesc = descOut ? escapeHtml(descOut).replace(/\n/g, "<br>") : "";
      els.description.innerHTML = safeDesc
        ? `<h4>Description</h4><p>${safeDesc}</p>${truncated ? '<p class="listing-modal__note">Full description on Full Listing Page.</p>' : ""}`
        : "";
    }

    if (els.right) {
      const listingAddressFull = listing?.address?.full || "";
      window.__marketingActiveListing = {
        id: listing?.id || "",
        address: listingAddressFull || "",
      };
      if (window.__marketingActiveListing.id) {
        safeStore.set(storageKeys.id, window.__marketingActiveListing.id);
        safeStore.set(storageKeys.address, window.__marketingActiveListing.address || "");
      }

      els.right.innerHTML = `
        <div class="listing-modal__section">
          <div class="listing-modal__price">${formatPrice(listing)}</div>
          <div class="listing-modal__address">${escapeHtml(listing?.address?.full || "")}</div>
          <div class="listing-modal__meta">${specs.join(" · ")}</div>
        </div>
        ${
          keyFacts.length
            ? `<div class="listing-modal__section"><h4>Key Facts</h4>
                <dl class="listing-modal__facts">
                  ${keyFacts
                    .map(
                      (row) => `
                      <div class="listing-modal__fact-row">
                        <dt>${row.label}</dt>
                        <dd>${escapeHtml(row.value)}</dd>
                      </div>`
                    )
                    .join("")}
                </dl>
              </div>`
            : ""
        }
        ${
          detailRows.length
            ? `<div class="listing-modal__section"><h4>Agent &amp; Office</h4>
                <dl class="listing-modal__facts">
                  ${detailRows
                    .map(
                      (row) => `
                      <div class="listing-modal__fact-row">
                        <dt>${row.label}</dt>
                        <dd>${escapeHtml(row.value)}</dd>
                      </div>`
                    )
                    .join("")}
                </dl>
              </div>`
            : ""
        }
        <div class="listing-modal__section">
          <p class="listing-modal__attribution">${attribution}</p>
          <div class="listing-modal__actions">
            <button
              type="button"
              class="btn btn-primary btn-block"
              data-open-modal="contactModal"
              data-entry-source="marketing-listing-modal"
              data-listing-id="${escapeHtml(listing.id)}"
              ${listingAddressFull ? `data-listing-address="${escapeHtml(listingAddressFull)}"` : ""}
              data-page-context="listing-modal"
            >Contact Agent</button>
            <a class="btn btn-primary btn-block" href="/listing/${encodeURIComponent(
              listing.id
            )}">Full Listing Page</a>
            <a class="btn btn-secondary btn-block" href="/search?listingId=${encodeURIComponent(
              listing.id
            )}">See on Map</a>
          </div>
        </div>
      `;
    }
  };

  const openListingModal = async (listingId) => {
    const els = ensureListingModalMarkup();
    if (!els) return;
    if (els.right) {
      els.right.innerHTML = `<p class="listing-modal__loading">Loading…</p>`;
    }
    if (els.description) {
      els.description.innerHTML = "";
    }

    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}`);
      const data = await res.json().catch(() => null);
      const listing = data?.listing || data;
      if (!listing || !listing.id) {
        throw new Error("Listing not found");
      }
      renderListingModal(listing);
      openModal("listingModal");
      const escListener = (ev) => {
        if (ev.key === "Escape") {
          if (typeof closeAllOverlays === "function") closeAllOverlays();
          else {
            const modal = document.getElementById("listingModal");
            const backdropEl = document.getElementById("globalBackdrop");
            modal?.classList.remove("is-visible");
            backdropEl?.classList.remove("is-visible");
            document.body.classList.remove("no-scroll");
          }
          document.removeEventListener("keydown", escListener);
        }
      };
      document.addEventListener("keydown", escListener);
    } catch (err) {
      if (els.right) {
        els.right.innerHTML = `<p class="listing-modal__loading">Failed to load listing.</p>`;
      }
      // eslint-disable-next-line no-console
      console.error("Listing modal failed", err);
    }
  };

  const loadFeaturedListings = async () => {
    if (!featuredGrid) return;
    featuredGrid.innerHTML =
      '<p class="section__lede" id="featuredListingsLoading">Loading featured listings…</p>';

    const fetchListings = async (params) => {
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      const json = await res.json();
      return Array.isArray(json?.results)
        ? json.results
        : Array.isArray(json?.data)
        ? json.data
        : [];
    };

    const collected = [];
    const seen = new Set();
    const addListings = (listings, minPrice) => {
      listings.forEach((listing) => {
        const rawId = listing?.id != null ? listing.id : listing?.mlsId;
        if (rawId == null) return;
        const id = String(rawId);
        if (seen.has(id)) return;
        const rawPrice = Number(listing?.listPrice ?? listing?.price ?? 0);
        if (!Number.isFinite(rawPrice) || rawPrice < minPrice) return;
        if (!isActiveForSale(listing)) return;
        seen.add(id);
        collected.push(listing);
      });
    };

    const baseParams = { limit: "50", sort: "price_desc", page: "1", bbox: GR_METRO_BBOX };
    const PRIMARY_MIN_PRICE = 300000;
    const FALLBACK_MIN_PRICE = 0;

    try {
      const paramsPrimary = new URLSearchParams({
        ...baseParams,
        minPrice: String(PRIMARY_MIN_PRICE),
      });
      addListings(await fetchListings(paramsPrimary), PRIMARY_MIN_PRICE);

      if (collected.length < FEATURED_COUNT_NEIGHBORHOOD) {
        const paramsFallback = new URLSearchParams({
          ...baseParams,
          minPrice: String(FALLBACK_MIN_PRICE),
        });
        addListings(await fetchListings(paramsFallback), FALLBACK_MIN_PRICE);
      }

      const selected = shuffle(collected)
        .map((listing) => buildCardHtml(listing))
        .filter(Boolean)
        .slice(0, FEATURED_COUNT_NEIGHBORHOOD);
      if (!selected.length) throw new Error("No listings available");

      featuredGrid.innerHTML = selected.join("");
    } catch (err) {
      featuredGrid.innerHTML =
        '<p class="section__lede">Featured listings are unavailable right now.</p>';
      // eslint-disable-next-line no-console
      console.error("Featured listings failed", err);
    } finally {
      featuredLoading?.remove();
    }
  };

  const loadNeighborhoodFeaturedListings = async () => {
    if (!featuredGrid) return;
    const slug = getPageSlug();
    if (!slug || !NEIGHBORHOOD_FILTERS[slug]) return;
    const filterCfg = NEIGHBORHOOD_FILTERS[slug];
    const zips = Array.isArray(filterCfg?.zips)
      ? filterCfg.zips.map((z) => normalizeZip(z)).filter(Boolean)
      : [];
    const cities = Array.isArray(filterCfg?.cities)
      ? filterCfg.cities.map((c) => normalizeCity(c)).filter(Boolean)
      : [];

    featuredGrid.innerHTML = '<p class="section__lede">Loading featured listings…</p>';

    try {
      const collected = [];
      const seen = new Set();
      const POOL_TARGET = 24;
      const FALLBACK_MIN_PRICE = 0;

      const addListings = (listings, minPrice) => {
        listings.forEach((listing) => {
          const rawId = listing?.id != null ? listing.id : listing?.mlsId;
          if (rawId == null) return;
          const id = String(rawId);
          if (seen.has(id)) return;
          const rawPrice = Number(listing?.listPrice ?? listing?.price ?? 0);
          if (!Number.isFinite(rawPrice) || rawPrice < minPrice) return;
          if (!isActiveForSale(listing)) return;
          const listingZip = normalizeZip(listing?.address?.zip || "");
          const listingCity = normalizeCity(listing?.address?.city || "");
          const matchesZip = !zips.length || zips.includes(listingZip);
          const matchesCity = !cities.length || cities.includes(listingCity);
          if (!matchesZip && !matchesCity) return;
          seen.add(id);
          collected.push(listing);
        });
      };

      const addFromQuery = async (queryText, minPrice) => {
        if (!queryText) return;
        const params = new URLSearchParams({
          q: queryText,
          minPrice: String(minPrice),
          limit: "50",
          sort: "price_desc",
          page: "1",
        });
        const res = await fetch(`/api/listings?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch listings");
        const json = await res.json();
        const listings = Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json?.data)
          ? json.data
          : [];
        addListings(listings, minPrice);
      };

      // Pass 1: ZIP-first
      for (const zip of zips) {
        if (collected.length >= POOL_TARGET) break;
        // eslint-disable-next-line no-await-in-loop
        await addFromQuery(zip, MIN_PRICE_NEIGHBORHOOD);
      }

      // Pass 2: city-based fallback (if still short)
      if (collected.length < FEATURED_COUNT_NEIGHBORHOOD && cities.length) {
        for (const city of cities) {
          if (collected.length >= POOL_TARGET) break;
          // eslint-disable-next-line no-await-in-loop
          await addFromQuery(city, MIN_PRICE_NEIGHBORHOOD);
        }
      }

      // Pass 3: lower price within same zips/cities
      if (collected.length < FEATURED_COUNT_NEIGHBORHOOD) {
        for (const zip of zips) {
          if (collected.length >= FEATURED_COUNT_NEIGHBORHOOD) break;
          // eslint-disable-next-line no-await-in-loop
          await addFromQuery(zip, FALLBACK_MIN_PRICE);
        }
      }

      if (collected.length < FEATURED_COUNT_NEIGHBORHOOD && cities.length) {
        for (const city of cities) {
          if (collected.length >= FEATURED_COUNT_NEIGHBORHOOD) break;
          // eslint-disable-next-line no-await-in-loop
          await addFromQuery(city, FALLBACK_MIN_PRICE);
        }
      }

      const selected = shuffle(collected)
        .map((listing) => buildCardHtml(listing))
        .filter(Boolean)
        .slice(0, FEATURED_COUNT_NEIGHBORHOOD);
      if (!selected.length) throw new Error("No listings available");

      featuredGrid.innerHTML = selected.join("");
    } catch (err) {
      featuredGrid.innerHTML =
        '<p class="section__lede">Featured listings are unavailable right now.</p>';
      // eslint-disable-next-line no-console
      console.error("Neighborhood featured listings failed", err);
    } finally {
      featuredLoading?.remove();
    }
  };

  const slug = getPageSlug();
  const isNeighborhoodPage = Boolean(slug && NEIGHBORHOOD_FILTERS[slug]);
  if (featuredGrid) {
    if (isNeighborhoodPage) {
      loadNeighborhoodFeaturedListings();
    } else {
      loadFeaturedListings();
    }
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

  initRecaptcha();
  renderFeaturedNeighborhoods();
  updateHeroTheme();
  setInterval(updateHeroTheme, 5 * 60 * 1000);
});

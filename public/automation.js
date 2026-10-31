/*
 * VERLONIQ — AI Automation landing page (/automation) behaviour.
 *
 * Page-specific on purpose: the homepage keeps its own inline script and is never affected by this file.
 * The enquiry form, Cloudflare Turnstile and booking logic mirror the homepage's (same Formspree endpoint,
 * Cal.com link and Turnstile Site Key from public/config.js), with two differences:
 *   - enquiries carry enquiry_source=automation-page and an "automation enquiry" email subject;
 *   - privacy-safe conversion events are recorded (see track() below). No form contents are ever included.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  $('year').textContent = new Date().getFullYear();

  // ---- Conversion measurement (privacy-conscious; no personal information) ----
  // Events go to window.vqAnalytics (an in-page list, nothing is sent anywhere) and, only if the founder
  // enables Cloudflare Zaraz for verloniq.com, to zaraz.track(). Nothing else is loaded or contacted.
  // Event names describe clicks, never outcomes: "booking_cta_click" is a click, not a confirmed appointment.
  const track = (name, props = {}) => {
    const ev = { event: name, page: 'automation', ...props };
    try { (window.vqAnalytics = window.vqAnalytics || []).push(ev); } catch {}
    try { if (window.zaraz && typeof window.zaraz.track === 'function') window.zaraz.track(name, { page: 'automation', ...props }); } catch {}
  };
  track('automation_page_view');

  // Header shadow once the page scrolls
  const header = $('siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile navigation
  const menu = $('navLinks'), menuBtn = $('menuToggle');
  const setMenu = (shown) => { menu.classList.toggle('open', shown); menuBtn.setAttribute('aria-expanded', String(shown)); menuBtn.setAttribute('aria-label', shown ? 'Close navigation' : 'Open navigation'); menuBtn.textContent = shown ? '✕' : '☰'; };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', (e) => { if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== menuBtn) setMenu(false); });

  // Site configuration (public/config.js, shared with the homepage and read-only here). Same validation as the homepage.
  const cfg = window.VERLONIQ_CONFIG || {};
  const endpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]{6,}$/.test(cfg.formspreeEndpoint || '') ? cfg.formspreeEndpoint : '';
  const bookingUrl = /^https:\/\/(?:app\.)?cal\.(?:com|eu)\/[A-Za-z0-9._~\/-]+(?:\?[A-Za-z0-9._~=&%-]*)?$/.test(cfg.calBookingUrl || '') ? cfg.calBookingUrl : '';
  const contactEmail = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(cfg.contactEmail || '') ? cfg.contactEmail : '';
  const tsKey = endpoint && /^[0-3]x[A-Za-z0-9_-]{16,}$/.test(cfg.turnstileSiteKey || '') ? cfg.turnstileSiteKey : '';
  if (cfg.formspreeEndpoint && !endpoint) console.warn('VERLONIQ: formspreeEndpoint is not a valid Formspree URL; the enquiry form stays in demo mode.');
  if (cfg.calBookingUrl && !bookingUrl) console.warn('VERLONIQ: calBookingUrl is not a valid Cal.com URL; booking stays in placeholder mode.');
  if (cfg.turnstileSiteKey && !tsKey) console.warn('VERLONIQ: turnstileSiteKey ignored (invalid, or no Formspree endpoint set).');
  document.documentElement.classList.toggle('form-live', !!endpoint);
  document.documentElement.classList.toggle('booking-live', !!bookingUrl);
  if (bookingUrl) $('bookingLink').href = bookingUrl;

  // Dialogs (enquiry + booking): focus trap, Escape to close, focus returns to the opener
  const modals = { enquiry: $('enquiryModal'), booking: $('bookingModal') };
  let current = null, lastFocus = null, bookingFrom = '';
  const focusables = (m) => [...m.querySelectorAll('button,input,select,textarea,a[href],iframe')].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
  const openModal = (name, focusEl) => {
    const m = modals[name]; if (current === m) return;
    if (current) { current.classList.remove('open'); current.setAttribute('aria-hidden', 'true'); } else lastFocus = document.activeElement;
    setMenu(false); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); current = m; document.body.style.overflow = 'hidden';
    (focusEl || focusables(m)[0]).focus();
  };
  const closeModal = () => { if (!current) return; current.classList.remove('open'); current.setAttribute('aria-hidden', 'true'); current = null; document.body.style.overflow = ''; if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); };
  document.querySelectorAll('[data-open-modal]').forEach((b) => b.addEventListener('click', (e) => {
    const t = e.currentTarget; const svc = t.dataset.service;
    track('automation_enquiry_click', { location: t.dataset.cta || 'unknown' });
    showFormView(); if (svc) $('fService').value = svc; openModal('enquiry', $('fName')); loadTurnstile();
  }));
  document.querySelectorAll('[data-open-booking]').forEach((b) => b.addEventListener('click', (e) => {
    bookingFrom = e.currentTarget.dataset.cta || 'unknown';
    track('automation_booking_cta_click', { location: bookingFrom });
    openModal('booking');
  }));
  // "Choose a time" opens Cal.com in a new tab. This records that Cal.com was opened, NOT that a call was booked.
  $('bookingLink').addEventListener('click', () => { if (bookingUrl) track('automation_booking_calendar_opened', { location: bookingFrom }); });
  document.querySelectorAll('[data-demo-link]').forEach((a) => a.addEventListener('click', (e) => track('automation_demo_click', { location: e.currentTarget.dataset.cta || 'unknown' })));
  document.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
  Object.values(modals).forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) closeModal(); }));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (current) closeModal(); else if (menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } }
    if (e.key === 'Tab' && current) { const f = focusables(current); const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });

  // Optional Cloudflare Turnstile (Formspree verifies the token server-side with the Secret Key held in Formspree).
  // Loaded only when the form is live AND a site key is configured, and only once the form is opened.
  let tsWidget = null, tsRequested = false; const tsErr = $('turnstile-err');
  const tsMsg = (m) => { tsErr.textContent = m; };
  const tsFail = () => { tsMsg('The security check couldn\'t load. Please check your connection or disable content blockers for this site, then refresh the page.'); };
  const loadTurnstile = () => {
    if (!tsKey || tsRequested) return; tsRequested = true; $('turnstileBox').hidden = false; $('tsNote').hidden = false;
    window.vqTurnstileReady = () => { try {
      const box = $('turnstileBox'); const wide = (box.clientWidth || form.clientWidth) >= 300;
      tsWidget = window.turnstile.render('#turnstileBox', { sitekey: tsKey, theme: 'light', action: 'enquiry', size: wide ? 'flexible' : 'compact',
        'refresh-expired': 'auto', 'refresh-timeout': 'auto', retry: 'auto',
        callback: () => { tsMsg(''); },
        'expired-callback': () => { tsMsg('The security check expired and is refreshing. Please wait a moment, then send again.'); },
        'timeout-callback': () => { tsMsg('The security check timed out and is refreshing. Please complete it again.'); },
        'error-callback': () => { tsMsg('The security check didn\'t complete. It will retry automatically. If this keeps happening, refresh the page.'); return true; } });
    } catch { tsFail(); } };
    const sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=vqTurnstileReady'; sc.async = true; sc.defer = true;
    sc.onerror = () => { tsRequested = false; sc.remove(); tsFail(); }; document.head.appendChild(sc);
  };
  const tsToken = () => { try { return tsWidget !== null && window.turnstile ? window.turnstile.getResponse(tsWidget) || '' : ''; } catch { return ''; } };
  const tsReset = () => { try { if (tsWidget !== null && window.turnstile) window.turnstile.reset(tsWidget); } catch {} };

  // Enquiry form: validation, spam traps, duplicate guard and Formspree submission (only when an endpoint is configured)
  const form = $('enquiryForm'), status = $('formStatus'), submitBtn = $('enquirySubmit'); let openedAt = Date.now(), sending = false;
  const setStatus = (msg, kind) => { status.hidden = !msg; status.textContent = msg || ''; status.className = 'form-status' + (kind ? ' is-' + kind : ''); };
  const showFormView = () => { if (!$('formSuccess').hidden) { form.reset(); $('formSuccess').hidden = true; $('enquiryFormView').hidden = false; } setStatus(''); openedAt = Date.now(); };
  const errors = { name: 'Please enter your full name.', business: 'Please enter your business name.', email: 'Please enter your email address.', emailFormat: 'Please enter a valid email address, e.g. name@business.com.au.', phone: 'Please enter a valid phone number, or leave this blank.', industry: 'Please choose your industry.', team_size: 'Please choose your approximate team size.', service: 'Please choose what you\'d like help with.', message: 'Please tell us what you\'d like to automate or improve.', messageShort: 'Please add a little more detail (at least 20 characters).', consent: 'Please tick the box so we can respond to your enquiry.' };
  const check = (el) => {
    const v = el.type === 'checkbox' ? el.checked : el.value.trim(); let msg = '';
    if (el.required && !v) msg = errors[el.name];
    else if (el.name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = errors.emailFormat;
    else if (el.name === 'phone' && v && (!/^[0-9+()\s-]+$/.test(v) || v.replace(/\D/g, '').length < 8 || v.replace(/\D/g, '').length > 15)) msg = errors.phone;
    else if (el.name === 'message' && v.length < 20) msg = errors.messageShort;
    const err = $(el.id + '-err'); err.textContent = msg; if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); return !msg;
  };
  const fields = [...form.querySelectorAll('input:not([name="_gotcha"]):not([type="hidden"]),select,textarea')];
  fields.forEach((el) => {
    el.addEventListener('blur', () => { if (el.type !== 'checkbox' && (el.value.trim() || el.hasAttribute('aria-invalid'))) check(el); });
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => { if (el.hasAttribute('aria-invalid')) check(el); });
  });
  const showSuccess = (name, email) => { $('successName').textContent = name ? ', ' + name.split(/\s+/)[0] : ''; $('successEmail').textContent = email; $('enquiryFormView').hidden = true; $('formSuccess').hidden = false; $('formSuccess').focus(); };
  // Duplicate guard: remembers a short hash (not the content) of enquiries sent in this browser tab (shared with the homepage form)
  const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  let sentHashes = []; try { sentHashes = JSON.parse(sessionStorage.getItem('vq-sent') || '[]'); } catch {}
  const rememberSent = (h) => { sentHashes.push(h); try { sessionStorage.setItem('vq-sent', JSON.stringify(sentHashes.slice(-10))); } catch {} };
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (sending) return; setStatus('');
    const bad = fields.filter((el) => !check(el)); if (bad.length) { bad[0].focus(); setStatus(bad.length === 1 ? 'Please fix the highlighted field.' : `Please fix the ${bad.length} highlighted fields.`, 'error'); return; }
    const name = $('fName').value.trim(), email = $('fEmail').value.trim();
    if (Date.now() - openedAt < 3000) { setStatus('Please take a moment to check your details, then send again.', 'info'); return; }
    if (!endpoint) { setStatus('Demo mode: your details look complete, but nothing has been sent. The VERLONIQ enquiry form will be connected before launch.', 'info'); return; }
    if ($('hpField').value) { setStatus('Sorry, your enquiry couldn\'t be sent. Please refresh the page and try again.', 'error'); return; } // honeypot: bots only; nothing is sent and we don't claim it was
    const sig = hash([email, $('fBusiness').value, $('fMessage').value].map((x) => x.trim().toLowerCase()).join('|'));
    if (sentHashes.includes(sig)) { setStatus('You\'ve already sent this enquiry, so we haven\'t sent it again. We\'ll be in touch soon. To add something, edit your message and send again.', 'info'); return; }
    const token = tsKey ? tsToken() : ''; if (tsKey && !token) { tsMsg(!tsRequested || tsWidget === null ? 'The security check is still loading. Please wait a moment.' : 'Please complete the security check above, then send again.'); return; }
    sending = true; submitBtn.disabled = true; const label = submitBtn.innerHTML; submitBtn.textContent = 'Sending…';
    const data = new FormData(form); if (token) data.set('cf-turnstile-response', token);
    data.set('_subject', `New VERLONIQ automation enquiry: ${$('fBusiness').value.trim()}`); data.set('consent_given_at', new Date().toISOString());
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
    const fallback = contactEmail ? ` or email ${contactEmail}` : '';
    try {
      // Success only when Formspree explicitly confirms acceptance ({"ok": true}); redirects and non-JSON pages are never treated as sent.
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, redirect: 'manual', signal: ctrl.signal });
      let body = null; try { if ((res.headers.get('content-type') || '').includes('json')) body = await res.json(); } catch {}
      if (res.ok && body && body.ok === true) {
        track('automation_enquiry_submitted', { service: $('fService').value || 'unknown' }); // service category only, never personal details
        rememberSent(sig); showSuccess(name, email); form.reset(); tsReset();
      } else {
        const detail = body ? [...(Array.isArray(body.errors) ? body.errors.map((x) => x && x.message) : []), typeof body.error === 'string' ? body.error : ''].filter(Boolean).join(' ') : '';
        console.warn('VERLONIQ enquiry not confirmed by Formspree', { status: res.status, type: res.type, errors: body ? (body.errors || body.error || null) : null });
        tsReset(); const captcha = tsKey && (res.status === 403 || /captcha|turnstile/i.test(detail)); if (captcha) tsMsg('Please complete the security check again.');
        setStatus(captcha ? `Sorry, the security check couldn't be verified, so your enquiry wasn't sent. Please complete the check again and resend${fallback}.` : res.ok || res.type === 'opaqueredirect' ? `Sorry, we couldn't confirm that your enquiry was received, so it may not have been sent. Please try again${fallback}.` : `Sorry, your enquiry couldn't be sent${detail ? ': ' + detail : '.'} Please check your details and try again${fallback}.`, 'error');
      }
    } catch { tsReset(); setStatus(`Sorry, we couldn't reach our enquiry service, so your enquiry hasn't been sent. Please check your connection and try again in a moment${fallback}.`, 'error'); }
    finally { clearTimeout(timer); sending = false; submitBtn.disabled = false; submitBtn.innerHTML = label; }
  });

  // Subtle reveal-on-scroll (skipped entirely for reduced-motion users)
  document.querySelectorAll('[data-stagger]').forEach((g) => [...g.children].forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', (i * 70) + 'ms'); }));
  const reveals = document.querySelectorAll('.reveal');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('in'));
  else { const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }); reveals.forEach((el) => io.observe(el)); }

  // Highlight the nav link for the section in view
  if ('IntersectionObserver' in window) {
    const links = [...menu.querySelectorAll('a[href^="#"]')];
    const spy = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
  }
})();

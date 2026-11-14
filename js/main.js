/* SalikBuilds — page choreography, interactions, configurator wiring. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var Cup = window.SBCup;

  /* ---------- 3D ---------- */
  var scene = window.SBScene;
  var has3D = !!(scene && scene.init($('#gl')));
  if (!has3D) document.documentElement.classList.add('no-webgl');
  var S = has3D ? scene.S : {};

  /* ---------- Menu data (placeholder prices) ---------- */
  var MENU = [
    { name: 'Espresso', desc: 'Double ristretto — syrupy, bright, chocolate finish.', cents: 350, tag: 'Classic', c: '#3a2012', fs: '0%' },
    { name: 'Cortado', desc: 'Equal parts espresso and silky steamed milk.', cents: 450, tag: 'Balanced', c: '#5a3520', fs: '26%' },
    { name: 'Oat Flat White', desc: 'Velvet oat microfoam over a double shot.', cents: 550, tag: 'Bestseller', c: '#6b4228', fs: '44%' },
    { name: 'Honey Lavender Latte', desc: 'Wildflower honey, lavender, espresso, milk.', cents: 625, tag: 'California', c: '#8a5a3a', fs: '52%' },
    { name: 'Horchata Cold Brew', desc: '18-hour cold brew with cinnamon rice milk.', cents: 650, tag: 'House special', c: '#7a4a2a', fs: '34%' },
    { name: 'Cascara Tonic', desc: 'Coffee-cherry tea, tonic and citrus peel.', cents: 575, tag: 'Seasonal', c: '#9a4a22', fs: '0%' }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var rail = $('#rail');
  MENU.forEach(function (d) {
    var card = el('article', 'card');
    var art = el('div', 'card__art');
    var cup = el('div', 'topcup');
    cup.style.setProperty('--c', d.c);
    cup.style.setProperty('--fs', d.fs);
    cup.appendChild(el('i'));
    art.appendChild(el('span', 'card__tag', d.tag));
    art.appendChild(cup);
    card.appendChild(art);
    card.appendChild(el('h3', null, d.name));
    card.appendChild(el('p', null, d.desc));
    var row = el('div', 'card__row');
    row.appendChild(el('b', null, Cup.formatPrice(d.cents)));
    var add = el('button', 'add', 'Add +');
    add.type = 'button';
    add.setAttribute('aria-label', 'Add ' + d.name + ' to order');
    add.addEventListener('click', function () { addToOrder(d.name); });
    row.appendChild(add);
    card.appendChild(row);
    rail.appendChild(card);

    if (finePointer && !reduced) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        card.style.transform = 'rotateY(' + (px * 12) + 'deg) rotateX(' + (-py * 10) + 'deg) translateY(-6px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    }
  });

  function railStep(dir) {
    var card = $('.card', rail);
    rail.scrollBy({ left: dir * (card ? card.offsetWidth + 22 : 300), behavior: reduced ? 'auto' : 'smooth' });
  }
  $('#menuPrev').addEventListener('click', function () { railStep(-1); });
  $('#menuNext').addEventListener('click', function () { railStep(1); });

  // Drag-to-scroll for mouse users
  (function () {
    var down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.target.closest('button')) return;
      down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft;
      rail.style.scrollSnapType = 'none';
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false; rail.style.scrollSnapType = '';
    });
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  })();

  /* ---------- Order / toast ---------- */
  var count = 0, toastTimer;
  var cartBtn = $('#cartBtn');
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }
  function addToOrder(label) {
    count += 1;
    $('#cartCount').textContent = String(count);
    cartBtn.setAttribute('aria-label', 'Your order, ' + count + (count === 1 ? ' item' : ' items'));
    cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
    toast('Added to your order — ' + label);
  }
  cartBtn.addEventListener('click', function () {
    toast(count ? 'You have ' + count + (count === 1 ? ' item' : ' items') + ' in your order' : 'Your order is empty — build a cup below');
  });

  /* ---------- Configurator ---------- */
  var form = $('#builder');
  var shots = 1;
  function readForm() {
    var fd = new FormData(form);
    return Cup.normalize({ roast: fd.get('roast'), milk: fd.get('milk'), size: fd.get('size'), temp: fd.get('temp'), sweet: fd.get('sweet'), shots: shots });
  }
  function syncBuilder() {
    var c = readForm();
    shots = c.shots;
    $('#shots').textContent = String(c.shots);
    $('#shotMinus').disabled = c.shots <= 1;
    $('#shotPlus').disabled = c.shots >= 3;
    $('#sweetOut').textContent = c.sweet + '%';
    $('#sweet').style.setProperty('--p', c.sweet + '%');
    $('#summary').textContent = Cup.describe(c);
    $('#price').textContent = Cup.formatPrice(Cup.priceCents(c));
    if (has3D) scene.setLook(Cup.visual(c));
    return c;
  }
  form.addEventListener('input', syncBuilder);
  form.addEventListener('change', syncBuilder);
  $('#shotMinus').addEventListener('click', function () { shots -= 1; syncBuilder(); });
  $('#shotPlus').addEventListener('click', function () { shots += 1; syncBuilder(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = syncBuilder();
    addToOrder(Cup.describe(c) + ' (' + Cup.formatPrice(Cup.priceCents(c)) + ')');
  });
  syncBuilder();

  /* ---------- Newsletter (front-end only: connect a provider before launch) ---------- */
  $('#news').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#email'), msg = $('#newsMsg');
    if (!input.checkValidity()) {
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = 'Please enter a valid email address.';
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    // TODO: POST to your email provider (Klaviyo/Mailchimp) here. Nothing is sent yet.
    msg.textContent = 'Thank you — you’re on the list.';
    input.value = '';
  });

  /* ---------- Mobile nav ---------- */
  var burger = $('#burger'), mnav = $('#mobileNav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mnav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); burger.focus(); } });

  /* ---------- Nav state ---------- */
  var nav = $('#nav'), lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && mnav.hidden);
    lastY = y;
  }, { passive: true });

  /* ---------- Cursor + magnetic ---------- */
  if (finePointer && !reduced) {
    document.body.classList.add('has-cursor');
    var cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var hit = e.target.closest('a, button, label, input, .card');
      cur.classList.toggle('is-hover', !!hit);
      var isCard = !!(hit && hit.classList.contains('card'));
      cur.classList.toggle('has-label', isCard);
      label.textContent = isCard ? 'Drag' : '';
    });
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .25) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- Split headings into words ---------- */
  function split(node) {
    var parts = [];
    node.childNodes.forEach(function (child) {
      var isEm = child.nodeType === 1 && child.tagName === 'EM';
      (child.textContent || '').split(/\s+/).filter(Boolean).forEach(function (word) { parts.push({ word: word, em: isEm }); });
    });
    node.setAttribute('aria-label', node.textContent.replace(/\s+/g, ' ').trim());
    node.textContent = '';
    parts.forEach(function (p, i) {
      var outer = el('span', 'w'); outer.setAttribute('aria-hidden', 'true');
      var inner = el(p.em ? 'em' : 'span', null, p.word);
      if (p.em) inner.style.display = 'inline-block';
      outer.appendChild(inner);
      node.appendChild(outer);
      if (i < parts.length - 1) node.appendChild(document.createTextNode(' '));
    });
    return $$('.w > *', node);
  }

  /* ---------- No GSAP fallback ---------- */
  if (!hasGsap) {
    document.documentElement.classList.remove('js');
    $('#loader').remove();
    document.body.classList.remove('is-loading');
    return;
  }

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  var ST = window.ScrollTrigger;

  var heroWords = split($('[data-split="hero"]'));
  gsap.set(heroWords, { yPercent: 115 });

  $$('[data-split]:not([data-split="hero"])').forEach(function (h) {
    var words = split(h);
    gsap.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .06,
      scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });
  $$('[data-reveal]').forEach(function (n) {
    gsap.to(n, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
  });

  // Counters
  $$('[data-count]').forEach(function (b) {
    var end = parseInt(b.getAttribute('data-count'), 10), suf = b.getAttribute('data-suffix') || '', o = { v: 0 };
    ST.create({ trigger: b, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: end, duration: reduced ? 0 : 2, ease: 'power3.out', onUpdate: function () { b.textContent = Math.round(o.v).toLocaleString('en-US') + suf; } });
    } });
  });

  // Craft steps highlight
  var steps = $$('#steps .step');
  ST.create({ trigger: '#craft', start: 'top 55%', end: 'bottom 45%', onUpdate: function (self) {
    var idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
    steps.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
  } });

  // Section index, active nav link, light-section nav
  var sections = $$('main .sec');
  var links = $$('.nav__links a');
  sections.forEach(function (sec) {
    ST.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: function (self) {
      if (!self.isActive) return;
      $('#secNum').textContent = sec.getAttribute('data-index');
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + sec.id); });
    } });
  });
  ST.create({ trigger: '#menu', start: 'top 70px', end: 'bottom 70px', toggleClass: { targets: nav, className: 'on-light' } });
  gsap.to('#progressBar', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true } });

  /* ---------- 3D choreography: one keyframe per section ---------- */
  if (has3D) {
    var KF = {
      hero:   { x: 1.25, y: -.25, z: 0,   rx: .2,  ry: -.5, scale: 1,    spread: 1,   beanScale: 1,   pour: 1, turn: 0 },
      origin: { x: -1.45, y: -.3, z: -.5, rx: .05, ry: .9,  scale: .9,   spread: 2.3, beanScale: 1.15, pour: 0, turn: 0 },
      craft:  { x: 1.35, y: -.15, z: .6,  rx: 1.0, ry: 1.6, scale: 1.12, spread: .6,  beanScale: .7,  pour: 0, turn: 0 },
      menu:   { x: 0,    y: -1,   z: -3,  rx: .3,  ry: 2.4, scale: .8,   spread: 3.2, beanScale: .6,  pour: 0, turn: 0 },
      build:  { x: 0,    y: -.4,  z: .3,  rx: .32, ry: 3.1, scale: .86, spread: .5,  beanScale: 0,   pour: 0, turn: 1 },
      visit:  { x: 1.75, y: 1.05, z: -.6, rx: .22, ry: 3.6, scale: .62,  spread: 1.6, beanScale: .8,  pour: 0, turn: 0 }
    };
    var keys = Object.keys(KF.hero);
    var frames = sections.map(function (s) { return KF[s.getAttribute('data-scene')]; });
    var tops = [], goal = Object.assign({}, KF.hero);
    function measure() { tops = sections.map(function (s) { return s.getBoundingClientRect().top + window.scrollY; }); }
    function smooth(p) { return p * p * (3 - 2 * p); }
    // Deterministic: the pose is a pure function of scroll position, so reloads mid-page are correct.
    function computeGoal() {
      var y = window.scrollY, vh = window.innerHeight, cur = frames[0], prev = frames[0], p = 0;
      for (var i = 1; i < frames.length; i++) {
        var start = tops[i] - vh, end = tops[i] - vh * .15;
        var q = Math.min(1, Math.max(0, (y - start) / (end - start)));
        if (q > 0) { prev = frames[i - 1]; cur = frames[i]; p = q; }
      }
      var e = smooth(p);
      keys.forEach(function (k) { goal[k] = prev[k] + (cur[k] - prev[k]) * e; });
    }
    measure(); computeGoal();
    keys.forEach(function (k) { S[k] = goal[k]; });
    window.addEventListener('resize', measure);
    ST.addEventListener('refresh', measure);
    gsap.ticker.add(function () {
      computeGoal();
      var f = reduced ? 1 : .075;
      keys.forEach(function (k) { S[k] += (goal[k] - S[k]) * f; });
    });
  }

  /* ---------- Intro ---------- */
  var loader = $('#loader'), num = $('#loaderNum'), bar = $('#loaderBar'), pr = { v: 0 };
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var counting = new Promise(function (res) {
    gsap.to(pr, { v: 100, duration: reduced ? .2 : 1.8, ease: 'power2.inOut', onComplete: res, onUpdate: function () {
      num.textContent = String(Math.round(pr.v));
      bar.style.width = pr.v + '%';
    } });
  });
  Promise.all([counting, fontsReady]).then(function () {
    var tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    tl.to(loader, { yPercent: -100, duration: reduced ? .2 : 1.2 })
      .add(function () { document.body.classList.remove('is-loading'); loader.remove(); ST.refresh(); })
      .to(heroWords, { yPercent: 0, duration: 1.3, stagger: .07, ease: 'expo.out' }, '-=.55')
      .to('.hero-in', { opacity: 1, y: 0, duration: 1.2, stagger: .1, ease: 'expo.out', startAt: { y: 30 } }, '-=1.0');
    if (has3D) tl.to(S, { intro: 1, duration: 2.2, ease: 'expo.out' }, '-=1.9');
  });
})();

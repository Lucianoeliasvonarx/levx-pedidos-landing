/* Guía de la tienda: la primera vez que alguien pide, le muestra en 4 pasos cómo se usa.
   Cada paso aparece una sola vez, cuando su parte de la tienda está en pantalla.
   "Saltar guía" la apaga para siempre en ese celular. */
(function () {
  'use strict';
  var CLAVE = 'fogon_guia_v1';
  var estado = {};
  try { estado = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) {}
  if (estado.fin || navigator.webdriver) return;

  var PASOS = [
    { id: 'ayuda', donde: function () { return document.querySelector('.bienvenida button[aria-label]'); },
      texto: '¿No sabés qué pedir? Tocá acá: te hacemos dos preguntas y te armamos el pedido.',
      extra: 'Si ya sabés, tocá «Ya sé lo que quiero».' },
    { id: 'producto', donde: function () { return document.querySelector('#app .contenido button.producto'); },
      texto: 'Tocá cualquier producto para ver cómo viene y sumarlo a tu pedido.' },
    { id: 'barra', donde: function () { return document.getElementById('barra-pedido'); },
      texto: 'Acá está tu pedido. Cuando termines de elegir, tocalo para mandarlo.' },
    { id: 'confirmar', donde: function () { return document.getElementById('f-cliente'); },
      texto: 'Poné tu nombre y tu WhatsApp, y tocá «Confirmar pedido». El pedido le llega al local por WhatsApp.' }
  ];

  var css = document.createElement('style');
  css.textContent =
    '.guia-aro{position:fixed;z-index:9998;border-radius:14px;pointer-events:none;' +
      'box-shadow:0 0 0 3px #F2B33D,0 0 0 9999px rgba(28,25,22,.55);transition:all .28s cubic-bezier(.2,.7,.2,1)}' +
    '.guia-card{position:fixed;z-index:9999;left:16px;right:16px;max-width:360px;margin:0 auto;' +
      'background:#1C1916;color:#FAFAF8;border-radius:16px;padding:16px 16px 12px;' +
      'font:400 15px/1.45 Geist,system-ui,-apple-system,sans-serif;box-shadow:0 18px 40px rgba(0,0,0,.35);' +
      'opacity:0;transform:translateY(6px);transition:opacity .25s ease,transform .25s ease}' +
    '.guia-card.on{opacity:1;transform:none}' +
    '.guia-card p{margin:0}' +
    '.guia-card .guia-extra{margin-top:6px;color:rgba(250,250,248,.65);font-size:13.5px}' +
    '.guia-pie{display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:12px}' +
    '.guia-num{font-size:12px;color:rgba(250,250,248,.5);letter-spacing:.04em}' +
    '.guia-pie div{display:flex;gap:6px}' +
    '.guia-card button{font:500 14px Geist,system-ui,sans-serif;border:0;border-radius:999px;padding:8px 14px;cursor:pointer}' +
    '.guia-no{background:transparent;color:rgba(250,250,248,.7)}' +
    '.guia-ok{background:#F2B33D;color:#1C1916}' +
    '@media (prefers-reduced-motion:reduce){.guia-aro,.guia-card{transition:none}}';
  document.head.appendChild(css);

  var aro = null, card = null, actual = null, objetivo = null;

  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) {} }
  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  }
  function ocupado() { return !!document.querySelector('#hoja'); } // hay una hoja de producto abierta

  function cerrar(listo) {
    if (actual && listo) { estado[actual.id] = 1; if (PASOS.every(function (p) { return estado[p.id]; })) estado.fin = 1; guardar(); }
    if (aro) aro.remove(); if (card) card.remove();
    aro = card = actual = objetivo = null;
  }
  function saltarTodo() { estado.fin = 1; guardar(); cerrar(false); }

  function ubicar() {
    if (!actual || !objetivo) return;
    if (!document.body.contains(objetivo) || ocupado()) { cerrar(false); return; }
    var r = objetivo.getBoundingClientRect(), m = 6;
    var radio = parseFloat(getComputedStyle(objetivo).borderTopLeftRadius) || 0;
    aro.style.borderRadius = (radio * 2 >= Math.min(r.width, r.height) - 1) ? '999px' : (radio + m) + 'px';
    aro.style.left = (r.left - m) + 'px'; aro.style.top = (r.top - m) + 'px';
    aro.style.width = (r.width + m * 2) + 'px'; aro.style.height = (r.height + m * 2) + 'px';
    var h = card.offsetHeight, abajo = r.bottom + 14, arriba = r.top - h - 14;
    var y = (abajo + h < innerHeight - 8) ? abajo : Math.max(8, arriba);
    card.style.top = y + 'px';
  }

  function mostrar(paso, el) {
    actual = paso; objetivo = el;
    aro = document.createElement('div'); aro.className = 'guia-aro';
    card = document.createElement('div'); card.className = 'guia-card'; card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Cómo pedir');
    var n = PASOS.indexOf(paso) + 1;
    card.innerHTML = '<p></p>' + (paso.extra ? '<p class="guia-extra"></p>' : '') +
      '<div class="guia-pie"><span class="guia-num">' + n + ' de ' + PASOS.length + '</span>' +
      '<div><button type="button" class="guia-no">Saltar guía</button><button type="button" class="guia-ok">Entendido</button></div></div>';
    card.querySelector('p').textContent = paso.texto;
    if (paso.extra) card.querySelector('.guia-extra').textContent = paso.extra;
    card.querySelector('.guia-ok').addEventListener('click', function () { cerrar(true); });
    card.querySelector('.guia-no').addEventListener('click', saltarTodo);
    document.body.appendChild(aro); document.body.appendChild(card);
    ubicar();
    requestAnimationFrame(function () { card.classList.add('on'); });
  }

  // Si el cliente toca lo que señalamos, el paso queda hecho.
  document.addEventListener('click', function (e) {
    if (objetivo && objetivo.contains(e.target)) cerrar(true);
  }, true);

  var espera = null;
  function revisar() {
    if (estado.fin) return;
    if (actual) { ubicar(); return; }
    if (ocupado()) return;
    for (var i = 0; i < PASOS.length; i++) {
      var p = PASOS[i];
      if (estado[p.id]) continue;
      var el = p.donde();
      if (visible(el)) {
        clearTimeout(espera);
        espera = setTimeout(function (p2) { return function () {
          var el2 = p2.donde();
          if (!actual && !estado[p2.id] && visible(el2) && !ocupado()) mostrar(p2, el2);
        }; }(p), 700);
        return;
      }
    }
  }

  new MutationObserver(function () { requestAnimationFrame(revisar); })
    .observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  addEventListener('hashchange', function () { cerrar(false); setTimeout(revisar, 300); });
  addEventListener('resize', ubicar);
  addEventListener('scroll', function () { if (actual) ubicar(); else revisar(); }, { passive: true });
  setTimeout(revisar, 600);
  // Red de seguridad: la tienda a veces dibuja sin que se note el cambio; revisamos cada tanto.
  var vigia = setInterval(function () { if (estado.fin) { clearInterval(vigia); return; } if (!actual) revisar(); }, 900);
})();

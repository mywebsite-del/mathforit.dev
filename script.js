(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function $(s) { return document.querySelector(s); }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(v) { return String(+v.toFixed(2)); }
  function peso(v) { return '₱' + Math.round(Math.abs(v)).toLocaleString('en-PH'); }

  /* 1. Graphs */
  (function () {
    var svg = $('#graph-svg');
    var nodes = { A: [60, 115], B: [150, 40], C: [170, 125], D: [95, 200], E: [250, 175] };
    var names = Object.keys(nodes);
    var edges = [['A','B'],['B','C'],['C','D'],['D','A'],['A','C'],['C','E'],['E','D']].map(function (p) { return { a: p[0], b: p[1], on: true }; });
    var nodeEls = {};

    function toggle(e) { e.on = !e.on; update(); }
    edges.forEach(function (e) {
      var p1 = nodes[e.a], p2 = nodes[e.b];
      var g = el('g', { 'class': 'edge', tabindex: '0', role: 'button' }, svg);
      el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], 'class': 'edge-hit' }, g);
      el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], 'class': 'edge-line' }, g);
      g.addEventListener('click', function () { toggle(e); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(e); }
      });
      e.el = g;
    });
    names.forEach(function (n) {
      var g = el('g', { 'class': 'node' }, svg);
      el('circle', { cx: nodes[n][0], cy: nodes[n][1], r: 15 }, g);
      var t = el('text', { x: nodes[n][0], y: nodes[n][1] + 5, 'text-anchor': 'middle' }, g);
      t.textContent = n;
      nodeEls[n] = g;
    });

    function update() {
      var deg = {}, adj = {};
      names.forEach(function (n) { deg[n] = 0; adj[n] = []; });
      var active = 0;
      edges.forEach(function (e) {
        e.el.setAttribute('class', 'edge' + (e.on ? '' : ' off'));
        e.el.setAttribute('aria-pressed', String(e.on));
        e.el.setAttribute('aria-label', 'Edge ' + e.a + ' to ' + e.b + ', ' + (e.on ? 'on' : 'off') + '. Press to ' + (e.on ? 'remove' : 'add') + ' it.');
        if (e.on) { deg[e.a]++; deg[e.b]++; adj[e.a].push(e.b); adj[e.b].push(e.a); active++; }
      });
      var odds = names.filter(function (n) { return deg[n] % 2 === 1; });
      names.forEach(function (n) { nodeEls[n].setAttribute('class', 'node' + (deg[n] % 2 ? ' odd' : '')); });
      $('#deg-chips').innerHTML = names.map(function (n) {
        return '<span class="chip' + (deg[n] % 2 ? ' odd' : '') + '">' + n + ': ' + deg[n] + (deg[n] % 2 ? ' (odd)' : '') + '</span>';
      }).join('');

      var verdict = $('#graph-verdict'), cls = 'verdict', text;
      if (active === 0) {
        text = 'No edges are left. Tap a dotted line to add one back.';
        cls += ' warn';
      } else {
        var start = names.filter(function (n) { return deg[n] > 0; })[0];
        var seen = {}; seen[start] = true;
        var queue = [start];
        while (queue.length) {
          var cur = queue.shift();
          adj[cur].forEach(function (m) { if (!seen[m]) { seen[m] = true; queue.push(m); } });
        }
        var connected = names.every(function (n) { return deg[n] === 0 || seen[n]; });
        if (!connected) {
          text = 'The edges form separate groups, so no single walk can use all of them.';
          cls += ' warn';
        } else if (odds.length === 0) {
          text = 'Every vertex has an even degree, so an Euler circuit exists. You can use every edge once and finish where you started.';
        } else if (odds.length === 2) {
          text = 'Exactly two vertices (' + odds.join(' and ') + ') have an odd degree, so an Euler path exists. Start at one of them and end at the other.';
        } else {
          text = odds.length + ' vertices have an odd degree, so there is no Euler path and no Euler circuit.';
          cls += ' warn';
        }
      }
      verdict.className = cls;
      verdict.textContent = text;
    }
    update();
  })();

  /* 2. Statistics */
  (function () {
    var input = $('#scores'), svg = $('#stats-svg'), msg = $('#stats-msg');
    function draw(nums, mean) {
      svg.textContent = '';
      var L = 30, R = 314, B = 130, T = 12, h = B - T;
      function y(v) { return B - v * h / 100; }
      [0, 50, 100].forEach(function (t) {
        el('line', { x1: L, x2: R, y1: y(t), y2: y(t), 'class': 'gl' }, svg);
        var tx = el('text', { x: L - 6, y: y(t) + 3, 'text-anchor': 'end', 'class': 'axis' }, svg);
        tx.textContent = t;
      });
      var slot = (R - L) / nums.length, bw = Math.min(30, slot * 0.7);
      nums.forEach(function (v, i) {
        var x = L + slot * i + (slot - bw) / 2;
        el('rect', { x: x, y: y(v), width: bw, height: Math.max(0, B - y(v)), rx: 2, 'class': 'bar-r' }, svg);
        if (nums.length <= 12) {
          var t = el('text', { x: x + bw / 2, y: y(v) - 3, 'text-anchor': 'middle', 'class': 'val' }, svg);
          t.textContent = v;
        }
      });
      el('line', { x1: L, x2: R, y1: y(mean), y2: y(mean), 'class': 'mean' }, svg);
    }
    function run() {
      var nums = input.value.split(/[\s,;]+/).filter(Boolean).map(Number);
      var bad = nums.length < 1 || nums.length > 20 || nums.some(function (v) { return !isFinite(v) || v < 0 || v > 100; });
      if (bad) { msg.textContent = 'Enter 1 to 20 scores between 0 and 100, separated by commas.'; return; }
      msg.textContent = '';
      var n = nums.length;
      var mean = nums.reduce(function (a, b) { return a + b; }, 0) / n;
      var s = nums.slice().sort(function (a, b) { return a - b; });
      var median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
      var freq = {}, best = 0;
      nums.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; if (freq[v] > best) best = freq[v]; });
      var modes = best < 2 ? 'None' : Object.keys(freq).filter(function (k) { return freq[k] === best; }).map(Number).sort(function (a, b) { return a - b; }).join(', ');
      var sd = n > 1 ? Math.sqrt(nums.reduce(function (a, v) { return a + (v - mean) * (v - mean); }, 0) / (n - 1)) : 0;
      var above = nums.filter(function (v) { return v >= mean; }).length;
      $('#s-mean').textContent = fmt(mean);
      $('#s-median').textContent = fmt(median);
      $('#s-mode').textContent = modes;
      $('#s-range').textContent = fmt(s[n - 1] - s[0]);
      $('#s-sd').textContent = n > 1 ? fmt(sd) : 'n/a';
      $('#s-prob').textContent = above + ' of ' + n + ' (' + Math.round(above / n * 100) + '%)';
      draw(nums, mean);
    }
    input.addEventListener('input', run);
    run();
  })();

  /* 3. Finance */
  (function () {
    var ids = ['cost', 'rate', 'term', 'benefit'];
    var msg = $('#fin-msg'), verdict = $('#fin-verdict');
    function run() {
      var P = parseFloat($('#cost').value), rate = parseFloat($('#rate').value);
      var n = Math.round(parseFloat($('#term').value)), b = parseFloat($('#benefit').value);
      if (!(P >= 0) || !(rate >= 0) || !(n >= 1) || !(b >= 0)) {
        msg.textContent = 'Enter a cost, rate and benefit of 0 or more, and a term of at least 1 month.';
        return;
      }
      msg.textContent = '';
      var r = rate / 1200;
      var pay = r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
      var total = pay * n, interest = total - P, benefit = b * n, net = benefit - total;
      $('#f-pay').textContent = peso(pay);
      $('#f-interest').textContent = peso(interest);
      $('#f-total').textContent = peso(total);
      $('#f-benefit').textContent = peso(benefit);
      if (net >= 0) {
        verdict.className = 'verdict good';
        verdict.textContent = 'The benefits are ' + peso(net) + ' more than the total paid, so the project pays for itself within ' + n + ' months.';
      } else {
        verdict.className = 'verdict bad';
        verdict.textContent = 'The total paid is ' + peso(net) + ' more than the benefits, so the project does not pay for itself within ' + n + ' months.';
      }
    }
    ids.forEach(function (id) { $('#' + id).addEventListener('input', run); });
    run();
  })();

  /* 4. Geometry */
  (function () {
    var svg = $('#geo-svg'), O = 20, U = 24;
    function X(u) { return O + u * U; }
    function Y(v) { return 264 - v * U; }
    for (var i = 0; i <= 10; i++) {
      el('line', { x1: X(i), x2: X(i), y1: Y(0), y2: Y(10), 'class': 'gl' }, svg);
      el('line', { x1: X(0), x2: X(10), y1: Y(i), y2: Y(i), 'class': 'gl' }, svg);
    }
    [0, 5, 10].forEach(function (t) {
      var a = el('text', { x: X(t), y: Y(0) + 16, 'text-anchor': 'middle', 'class': 'axis' }, svg); a.textContent = t;
      var b = el('text', { x: O - 6, y: Y(t) + 3, 'text-anchor': 'end', 'class': 'axis' }, svg); b.textContent = t;
    });
    var AX = 1, AY = 1;
    var taxi = el('polyline', { 'class': 'taxi' }, svg);
    var euc = el('line', { 'class': 'euc' }, svg);
    el('circle', { cx: X(AX), cy: Y(AY), r: 6, 'class': 'dot-a' }, svg);
    var ta = el('text', { x: X(AX) - 8, y: Y(AY) + 20, 'text-anchor': 'end', 'class': 'pt-label' }, svg); ta.textContent = 'A';
    var dotB = el('circle', { r: 6, 'class': 'dot-b' }, svg);
    var tb = el('text', { 'class': 'pt-label' }, svg); tb.textContent = 'B';
    var sx = $('#bx'), sy = $('#by');
    function run() {
      var bx = +sx.value, by = +sy.value;
      $('#bx-v').textContent = bx; $('#by-v').textContent = by;
      taxi.setAttribute('points', X(AX) + ',' + Y(AY) + ' ' + X(bx) + ',' + Y(AY) + ' ' + X(bx) + ',' + Y(by));
      euc.setAttribute('x1', X(AX)); euc.setAttribute('y1', Y(AY)); euc.setAttribute('x2', X(bx)); euc.setAttribute('y2', Y(by));
      dotB.setAttribute('cx', X(bx)); dotB.setAttribute('cy', Y(by));
      tb.setAttribute('x', X(bx) + 10); tb.setAttribute('y', Y(by) - 8);
      var dx = Math.abs(bx - AX), dy = Math.abs(by - AY);
      $('#g-euc').textContent = fmt(Math.sqrt(dx * dx + dy * dy)) + ' units';
      $('#g-tax').textContent = (dx + dy) + ' units';
    }
    sx.addEventListener('input', run);
    sy.addEventListener('input', run);
    run();
  })();

  /* 5. Caesar cipher */
  (function () {
    var plain = $('#plain'), shift = $('#shift'), out = $('#cipher-out'), wheel = $('#wheel');
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function caesar(s, k) {
      return s.replace(/[a-z]/gi, function (c) {
        var base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base + k + 26) % 26 + base);
      });
    }
    function drawWheel(k) {
      var html = '';
      [0, 13].forEach(function (start) {
        var top = '', bottom = '';
        for (var i = start; i < start + 13; i++) {
          top += '<span>' + A[i] + '</span>';
          bottom += '<span class="c">' + A[(i + k) % 26] + '</span>';
        }
        html += top + bottom;
      });
      wheel.innerHTML = html;
    }
    function run() {
      var k = +shift.value, dec = $('#mode-dec').checked;
      $('#shift-val').textContent = k;
      $('#plain-label').textContent = dec ? 'Message to decrypt' : 'Message to encrypt';
      $('#out-label').textContent = dec ? 'Decrypted message' : 'Encrypted message';
      out.textContent = caesar(plain.value, dec ? -k : k);
      drawWheel(k);
    }
    plain.addEventListener('input', run);
    shift.addEventListener('input', run);
    $('#mode-enc').addEventListener('change', run);
    $('#mode-dec').addEventListener('change', run);
    run();
  })();


  /* Quick-check quizzes */
  (function () {
    fetch('quizzes.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
    function mk(tag, cls, text, parent) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      if (parent) parent.appendChild(e);
      return e;
    }
    Object.keys(data).forEach(function (id) {
      var grid = document.querySelector('#' + id + ' .topic-grid');
      if (!grid) return;
      var qs = data[id], box = mk('div', 'quiz', '', grid);
      mk('p', 'demo-title', 'Quick check: ' + qs.length + ' questions', box);
      var done = 0, right = 0, score, retry, cards = [];
      function build() {
        cards.forEach(function (c) { c.remove(); });
        cards = []; done = 0; right = 0;
        qs.forEach(function (q, qi) {
          var card = mk('div', 'quiz-q', '', box);
          box.insertBefore(card, foot);
          cards.push(card);
          mk('h3', '', (qi + 1) + '. ' + q[0], card);
          var opts = mk('div', 'opts', '', card), note = mk('p', 'qnote', '', card);
          note.setAttribute('aria-live', 'polite');
          var btns = q[1].map(function (t, oi) {
            var b = mk('button', 'opt', t, opts);
            b.type = 'button';
            b.addEventListener('click', function () {
              btns.forEach(function (x) { x.disabled = true; });
              var ok = oi === q[2];
              b.classList.add(ok ? 'right' : 'wrong');
              if (!ok) btns[q[2]].classList.add('right');
              note.textContent = (ok ? 'Correct. ' : 'Not quite. ') + q[3];
              if (ok) right++;
              done++;
              update();
            });
            return b;
          });
        });
        update();
      }
      function update() {
        score.textContent = done < qs.length ? 'Answered ' + done + ' of ' + qs.length : 'Score: ' + right + ' of ' + qs.length;
        retry.hidden = done === 0;
      }
      var foot = mk('div', 'quiz-foot', '', box);
      score = mk('span', 'score', '', foot);
      retry = mk('button', 'retry', 'Try again', foot);
      retry.type = 'button';
      retry.addEventListener('click', build);
      build();
    });
      })
      .catch(function () { console.error('quizzes.json could not load. Open the site with Live Server (not by double-clicking index.html).'); });
  })();

  /* Sign in / create account (front-end only) */
  (function () {
    var ACC = 'mfit-accounts', SES = 'mfit-user', mem = null, memAcc = {};
    var out = $('#logout'), form = $('#auth-form'), msg = $('#au-msg'), mode = 'in';
    var uEl = $('#au-user'), pEl = $('#au-pass'), cEl = $('#au-conf'), keep = $('#au-keep'), agree = $('#au-agree'), human = $('#au-human');
    var COMMON = ['password', '12345678', '123456789', 'qwerty123', 'qwertyuiop', 'iloveyou', 'admin123', 'abcd1234', 'password1', 'letmein123'];
    function rd(st, k) { try { return window[st].getItem(k); } catch (e) { return null; } }
    function wr(st, k, v) { try { if (v == null) window[st].removeItem(k); else window[st].setItem(k, v); } catch (e) {} }
    function accounts() { try { return JSON.parse(rd('localStorage', ACC) || 'null') || memAcc; } catch (e) { return memAcc; } }
    function saveAcc(a) { memAcc = a; wr('localStorage', ACC, JSON.stringify(a)); }
    function session() {
      var raw = rd('sessionStorage', SES) || rd('localStorage', SES);
      if (!raw) return mem;
      try { var o = JSON.parse(raw); return o.exp && o.exp < Date.now() ? null : o.n; } catch (e) { return null; }
    }
    function setSession(n, k) {
      mem = n; wr('sessionStorage', SES, null); wr('localStorage', SES, null);
      if (n) { if (k) wr('localStorage', SES, JSON.stringify({ n: n, exp: Date.now() + 30 * 864e5 })); else wr('sessionStorage', SES, JSON.stringify({ n: n })); }
    }
    function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
    function hash(salt, pw) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw)).then(hex); }
    function newSalt() { var a = new Uint8Array(8); crypto.getRandomValues(a); return hex(a); }
    function show() {
      var u = session();
      document.body.setAttribute('data-auth', u ? 'in' : 'out');
      out.textContent = u ? 'Log out (' + u + ')' : 'Log out';
    }
    function checks() {
      var u = uEl.value.trim().toLowerCase(), p = pEl.value, pl = p.toLowerCase();
      var len = p.length >= 8;
      var easy = p.length > 0 && COMMON.indexOf(pl) < 0 && !/^(.)\1*$/.test(p) && !/^\d+$/.test(p);
      var nou = p.length > 0 && !(u.length > 0 && pl.indexOf(u) > -1);
      var s = p ? (len ? 1 : 0) + (p.length >= 12 ? 1 : 0) + (/[a-z]/.test(p) && /[A-Z]/.test(p) ? 1 : 0) + (/\d/.test(p) && /[^A-Za-z0-9]/.test(p) ? 1 : 0) : 0;
      if (!len) s = Math.min(s, 1);
      if (p && s === 0) s = 1;
      return { len: len, easy: easy, nou: nou, s: s };
    }
    function update() {
      var c = checks();
      $('#rq-len').className = c.len ? 'ok' : '';
      $('#rq-easy').className = c.easy ? 'ok' : '';
      $('#rq-user').className = c.nou ? 'ok' : '';
      $('#au-bars').setAttribute('data-s', c.s);
      $('#au-human-t').textContent = human.checked ? 'Verified' : 'I\u2019m not a robot';
    }
    function setMode(m) {
      mode = m; form.setAttribute('data-mode', m);
      $('#tab-in').setAttribute('aria-selected', String(m === 'in'));
      $('#tab-up').setAttribute('aria-selected', String(m === 'up'));
      $('#auth-h').textContent = m === 'in' ? 'Sign in' : 'Create your account';
      $('#auth-sub').textContent = m === 'in' ? 'Welcome back. Enter your username and password.' : 'Free, no email needed. It takes about 30 seconds.';
      $('#au-go-t').textContent = m === 'in' ? 'Sign in' : 'Create account';
      pEl.autocomplete = m === 'in' ? 'current-password' : 'new-password';
      msg.textContent = ''; update();
    }
    function finish(n) {
      setSession(n, keep.checked); form.reset(); setMode('in'); show();
      $('#topic-graphs').scrollIntoView();
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-go')); });
    });
    [uEl, pEl, cEl, human].forEach(function (e) { e.addEventListener('input', update); e.addEventListener('change', update); });
    $('#au-eye').addEventListener('click', function () {
      var t = pEl.type === 'password' ? 'text' : 'password'; pEl.type = t; cEl.type = t;
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var n = uEl.value.trim(), p = pEl.value, key = n.toLowerCase(), acc = accounts();
      if (!window.crypto || !crypto.subtle) { msg.textContent = 'This browser cannot save accounts here.'; return; }
      if (!/^\w{3,16}$/.test(n)) { msg.textContent = 'Username: 3 to 16 letters, numbers or _.'; return; }
      if (mode === 'in') {
        var a = acc[key];
        if (!a) { msg.textContent = 'No account with that username. Create one first.'; return; }
        hash(a.s, p).then(function (h) { if (h !== a.h) msg.textContent = 'Wrong password.'; else finish(a.n); });
        return;
      }
      var c = checks();
      if (!(c.len && c.easy && c.nou)) { msg.textContent = 'Your password must meet all three rules.'; return; }
      if (p !== cEl.value) { msg.textContent = 'The two passwords do not match.'; return; }
      if (!agree.checked) { msg.textContent = 'Please agree to the course rules.'; return; }
      if (!human.checked) { msg.textContent = 'Please confirm you are not a robot.'; return; }
      if (acc[key]) { msg.textContent = 'That username is taken. Sign in instead.'; return; }
      var s = newSalt();
      hash(s, p).then(function (h) { acc[key] = { n: n, s: s, h: h }; saveAcc(acc); finish(n); });
    });
    out.addEventListener('click', function () { setSession(null); show(); window.scrollTo(0, 0); });
    show(); update();
  })();

  /* Active link in the top bar */
  (function () {
    var nav = $('.nav');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + en.target.id;
            if (on) { a.setAttribute('aria-current', 'true'); nav.scrollLeft = a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2; }
            else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-35% 0px -60% 0px' });
      links.forEach(function (a) {
        var s = document.querySelector(a.getAttribute('href'));
        if (s) io.observe(s);
      });
    } catch (e) {}
  })();
})();

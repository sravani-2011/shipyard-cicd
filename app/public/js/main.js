// Shared layout: navigation + footer injected on every page
(function () {
  const pages = [
    ['/', 'Home'], ['/pipeline', 'Pipeline'], ['/architecture', 'Architecture'],
    ['/status', 'Live Status'], ['/contact', 'Contact'],
  ];
  const here = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';

  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = `<div class="container">
    <a class="brand" href="/"><span class="brand-logo">S</span>Shipyard</a>
    <button class="nav-toggle" aria-label="Menu">&#9776;</button>
    <ul class="nav-links">${pages.map(([h, t]) =>
      `<li><a href="${h}" class="${here === h ? 'active' : ''}">${t}</a></li>`).join('')}</ul></div>`;
  document.body.prepend(nav);
  nav.querySelector('.nav-toggle').onclick = () => nav.querySelector('.nav-links').classList.toggle('open');

  const footer = document.createElement('footer');
  footer.innerHTML = `<div class="container">
    <div><strong style="color:var(--text)">Shipyard</strong> &middot; CI/CD with Jenkins, Docker &amp; Kubernetes on AWS</div>
    <div>Build <span class="badge" id="ft-build">…</span> Pod <span class="badge" id="ft-pod">…</span></div></div>`;
  document.body.append(footer);

  fetch('/api/info').then(r => r.json()).then(i => {
    document.getElementById('ft-build').textContent = '#' + i.buildNumber;
    document.getElementById('ft-pod').textContent = i.pod;
  }).catch(() => {});

  // Scroll reveal
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Animated counters
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '';
    let n = 0; const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => { n = Math.min(target, n + step); el.textContent = n + suffix; if (n >= target) clearInterval(t); }, 30);
  });
})();

/* GrowLocal front-end: reveals, counters, parallax, kinetic type, transitions */
(function () {
  "use strict";

  /* nav scroll state + burger */
  var nav = document.getElementById("nav");
  var onScrollNav = function () {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  var burger = document.getElementById("burger");
  var links = document.getElementById("navLinks");
  if (burger && links) {
    burger.addEventListener("click", function () {
      links.classList.toggle("open");
      burger.classList.toggle("x");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) { links.classList.remove("open"); burger.classList.remove("x"); }
    });
  }

  /* kinetic type: split .kinetic into word spans */
  document.querySelectorAll(".kinetic").forEach(function (el, ei) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.innerHTML = "";
    words.forEach(function (w, i) {
      var wrap = document.createElement("span");
      wrap.className = "kw";
      wrap.style.setProperty("--kd", (ei * 0.15 + i * 0.07) + "s");
      wrap.textContent = w;
      el.appendChild(wrap);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* scroll reveals */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal, .reveal-l, .reveal-r").forEach(function (el) { io.observe(el); });

  /* animated counters */
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      var el = en.target, target = parseFloat(el.dataset.count), dur = 1400, t0 = null;
      var suffix = el.dataset.suffix || "";
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });

  /* parallax blobs */
  var px = document.querySelectorAll("[data-parallax]");
  if (px.length) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        px.forEach(function (el) {
          var sp = parseFloat(el.dataset.parallax || "0.15");
          el.style.transform = "translateY(" + (y * sp) + "px)";
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* card spotlight follows cursor */
  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* page transition wipe for internal links */
  var wipe = document.getElementById("wipe");
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || !wipe) return;
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) !== "/" || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
    if (href === window.location.pathname) return;
    e.preventDefault();
    wipe.classList.remove("go");
    void wipe.offsetWidth;
    wipe.classList.add("go");
    setTimeout(function () { window.location.href = href; }, 300);
  });

  /* sparkline bars get random-ish heights deterministically */
  document.querySelectorAll(".spark").forEach(function (s) {
    var bars = s.querySelectorAll("i");
    bars.forEach(function (b, i) {
      b.style.height = (28 + ((i * 37) % 68)) + "%";
      b.style.animationDelay = (-i * 0.22) + "s";
    });
  });

  /* auto-dismiss alerts */
  document.querySelectorAll(".alert.ok").forEach(function (a) {
    setTimeout(function () {
      a.style.transition = "opacity .6s"; a.style.opacity = "0";
      setTimeout(function () { a.remove(); }, 650);
    }, 6000);
  });
})();

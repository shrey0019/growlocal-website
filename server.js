// GrowLocal: Express server. Single start command: npm start.
// Zero external services. SQLite DB auto-created on first run.
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const config = require("./config");
const { init } = require("./db");

const db = init();
const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const SITE_URL = process.env.SITE_URL || config.brand.siteUrl || `http://localhost:${PORT}`;

// ── helpers ──────────────────────────────────────────────
function fmtINR(n) {
  return "\u20B9" + Number(n).toLocaleString("en-IN");
}

function newSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + config.sessionDays * 24 * 60 * 60 * 1000;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return token;
}

function getUser(req) {
  const token = req.cookies[config.cookieName];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, Date.now());
  return row || null;
}

function setSessionCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  });
}

// Attach brand + user + meta defaults to every render
app.use((req, res, next) => {
  req.user = getUser(req);
  res.locals.brand = config.brand;
  res.locals.user = req.user;
  res.locals.fmtINR = fmtINR;
  res.locals.meta = { title: config.brand.name, description: config.brand.tagline };
  res.locals.jsonld = null;
  res.locals.active = "";
  res.locals.ok = req.query.ok || null;
  res.locals.err = req.query.err || null;
  // Canonical URL for every page (used by canonical tag + og:url).
  const q = req.originalUrl.indexOf("?");
  const pathOnly = q === -1 ? req.originalUrl : req.originalUrl.slice(0, q);
  res.locals.canonical = SITE_URL + pathOnly;
  res.locals.siteUrl = SITE_URL;
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login?err=" + encodeURIComponent("Please log in first."));
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).render("pages/403", {
      active: "",
      meta: { title: "Not allowed | " + config.brand.name, description: "This area is restricted." },
    });
  next();
}

const ORDER_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: config.brand.name,
    description: config.brand.tagline,
    url: SITE_URL,
    email: config.brand.email,
    telephone: config.brand.phone,
    address: { "@type": "PostalAddress", addressLocality: "Bhopal", addressCountry: "IN" },
    priceRange: "\u20B9\u20B9",
  };
}

// ── SEO: robots + sitemap ────────────────────────────────
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (req, res) => {
  const services = db.prepare("SELECT slug FROM services WHERE active = 1").all();
  const urls = ["", "/services", "/work", "/pricing", "/about", "/contact", "/login", "/signup"]
    .map((p) => `  <url><loc>${SITE_URL}${p || "/"}</loc><changefreq>weekly</changefreq></url>`)
    .concat(
      services.map(
        (s) => `  <url><loc>${SITE_URL}/services/${s.slug}</loc><changefreq>monthly</changefreq></url>`
      )
    );
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
  );
});

// ── public pages ─────────────────────────────────────────
app.get("/", (req, res) => {
  const services = db.prepare("SELECT * FROM services WHERE active = 1 ORDER BY id").all();
  res.render("pages/home", {
    active: "home",
    services,
    meta: {
      title: `${config.brand.name} | Reels, Websites & WhatsApp Marketing for Local Businesses`,
      description:
        "GrowLocal helps coaches, gyms, salons, clinics and shops get more customers with short-form video, WhatsApp automation, websites and local marketing. Fixed pricing, fast delivery.",
    },
    jsonld: orgJsonLd(),
  });
});

app.get("/services", (req, res) => {
  const services = db.prepare("SELECT * FROM services WHERE active = 1 ORDER BY id").all();
  res.render("pages/services", {
    active: "services",
    services,
    meta: {
      title: `Services & Pricing | ${config.brand.name}`,
      description:
        "Seven fixed-price services for local businesses: reel editing, WhatsApp automation, social media management, websites, Google Business Profile, lead generation and pitch decks.",
    },
    jsonld: orgJsonLd(),
  });
});

app.get("/services/:slug", (req, res) => {
  const s = db.prepare("SELECT * FROM services WHERE slug = ? AND active = 1").get(req.params.slug);
  if (!s) return res.status(404).render("pages/404", { active: "services", meta: { title: "Not found | " + config.brand.name, description: "Page not found." } });
  s.features = JSON.parse(s.features);
  res.render("pages/service-detail", {
    active: "services",
    service: s,
    meta: {
      title: `${s.name} | ${config.brand.name}`,
      description: s.short + ". " + s.price_note + ".",
    },
    jsonld: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.name,
      description: s.description,
      provider: { "@type": "ProfessionalService", name: config.brand.name, url: SITE_URL },
      offers: { "@type": "Offer", priceCurrency: "INR", price: String(s.price_from) },
    },
  });
});

app.get("/work", (req, res) => {
  res.render("pages/work", {
    active: "work",
    meta: {
      title: `Sample Work | ${config.brand.name}`,
      description:
        "Sample concepts showing the kind of reels, websites, WhatsApp setups and creatives GrowLocal produces for local businesses.",
    },
    jsonld: orgJsonLd(),
  });
});

app.get("/pricing", (req, res) => {
  const services = db.prepare("SELECT * FROM services WHERE active = 1 ORDER BY price_from").all();
  res.render("pages/pricing", {
    active: "pricing",
    services,
    meta: {
      title: `Pricing | ${config.brand.name}`,
      description:
        "Honest, fixed pricing for every service. Reels from \u20B9800, websites from \u20B912,000, WhatsApp setup from \u20B93,000. No hidden charges, ever.",
    },
    jsonld: orgJsonLd(),
  });
});

app.get("/about", (req, res) => {
  res.render("pages/about", {
    active: "about",
    meta: {
      title: `About | ${config.brand.name}`,
      description:
        "GrowLocal is a small digital studio in Bhopal, India, built for one job: helping local businesses get found and get customers online.",
    },
    jsonld: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: config.brand.name,
      description: config.brand.tagline,
      url: SITE_URL,
      email: config.brand.email,
      telephone: config.brand.phone,
      address: { "@type": "PostalAddress", addressLocality: "Bhopal", addressCountry: "IN" },
    },
  });
});

app.get("/contact", (req, res) => {
  res.render("pages/contact", {
    active: "contact",
    meta: {
      title: `Contact | ${config.brand.name}`,
      description:
        "Tell us about your business and get a free consultation. We reply within one business day.",
    },
    jsonld: orgJsonLd(),
  });
});

app.post("/contact", (req, res) => {
  const { name, email, phone, business, message } = req.body;
  if (!name?.trim() || !email?.trim() || !phone?.trim() || !message?.trim()) {
    return res.redirect("/contact?err=" + encodeURIComponent("Please fill in your name, email, phone and message."));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.redirect("/contact?err=" + encodeURIComponent("That email address does not look right."));
  }
  db.prepare("INSERT INTO leads (name, email, phone, business, message) VALUES (?, ?, ?, ?, ?)").run(
    name.trim(), email.trim(), phone.trim(), (business || "").trim(), message.trim()
  );
  res.redirect("/contact?ok=" + encodeURIComponent("Thanks! Your message is in. We will reply within one business day."));
});

// ── auth ─────────────────────────────────────────────────
app.get("/login", (req, res) => {
  if (req.user) return res.redirect(req.user.role === "admin" ? "/admin" : "/dashboard");
  res.render("pages/login", {
    active: "",
    meta: { title: `Log in | ${config.brand.name}`, description: "Log in to your GrowLocal account to track orders and request services." },
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get((email || "").trim().toLowerCase());
  if (!u || !bcrypt.compareSync(password || "", u.password_hash)) {
    return res.redirect("/login?err=" + encodeURIComponent("Wrong email or password. Try again."));
  }
  setSessionCookie(res, newSession(u.id));
  res.redirect(u.role === "admin" ? "/admin" : "/dashboard");
});

app.get("/signup", (req, res) => {
  if (req.user) return res.redirect(req.user.role === "admin" ? "/admin" : "/dashboard");
  res.render("pages/signup", {
    active: "",
    meta: { title: `Create account | ${config.brand.name}`, description: "Create a free GrowLocal account to request services and track your orders." },
  });
});

app.post("/signup", (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  if (!name || !email || password.length < 6) {
    return res.redirect("/signup?err=" + encodeURIComponent("Please add your name, a valid email, and a password of at least 6 characters."));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.redirect("/signup?err=" + encodeURIComponent("That email address does not look right."));
  }
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    return res.redirect("/signup?err=" + encodeURIComponent("An account with this email already exists. Log in instead."));
  }
  const id = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
    .run(name, email, bcrypt.hashSync(password, 10)).lastInsertRowid;
  setSessionCookie(res, newSession(id));
  res.redirect("/dashboard?ok=" + encodeURIComponent("Welcome aboard! Your account is ready."));
});

app.post("/logout", (req, res) => {
  const token = req.cookies[config.cookieName];
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.clearCookie(config.cookieName);
  res.redirect("/?ok=" + encodeURIComponent("Logged out. See you soon."));
});

// ── user dashboard ───────────────────────────────────────
app.get("/dashboard", requireAuth, (req, res) => {
  const services = db.prepare("SELECT id, slug, name, short, price_from, price_unit FROM services WHERE active = 1 ORDER BY id").all();
  const orders = db
    .prepare(
      `SELECT o.*, s.name AS service_name FROM orders o
       JOIN services s ON s.id = o.service_id
       WHERE o.user_id = ? ORDER BY o.id DESC`
    )
    .all(req.user.id);
  res.render("pages/dashboard", {
    active: "",
    services,
    orders,
    meta: { title: `My dashboard | ${config.brand.name}`, description: "Request services and track your orders." },
  });
});

app.post("/dashboard/request", requireAuth, (req, res) => {
  const service = db.prepare("SELECT id FROM services WHERE id = ? AND active = 1").get(req.body.service_id);
  const details = (req.body.details || "").trim();
  if (!service || details.length < 10) {
    return res.redirect("/dashboard?err=" + encodeURIComponent("Pick a service and tell us a little about your business (at least a line or two)."));
  }
  db.prepare("INSERT INTO orders (user_id, service_id, details, status) VALUES (?, ?, ?, 'Pending')").run(
    req.user.id, service.id, details
  );
  res.redirect("/dashboard?ok=" + encodeURIComponent("Request received! We will confirm the plan and timeline shortly."));
});

// ── admin ────────────────────────────────────────────────
app.get("/admin", requireAdmin, (req, res) => {
  const stats = {
    users: db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'user'").get().c,
    orders: db.prepare("SELECT COUNT(*) c FROM orders").get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'Pending'").get().c,
    leads: db.prepare("SELECT COUNT(*) c FROM leads WHERE handled = 0").get().c,
  };
  const recent = db
    .prepare(
      `SELECT o.id, o.status, o.created_at, u.name AS user_name, s.name AS service_name
       FROM orders o JOIN users u ON u.id = o.user_id JOIN services s ON s.id = o.service_id
       ORDER BY o.id DESC LIMIT 8`
    )
    .all();
  res.render("admin/dashboard", { active: "admin", stats, recent, meta: { title: `Admin | ${config.brand.name}`, description: "Admin dashboard." } });
});

app.get("/admin/orders", requireAdmin, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, s.name AS service_name
       FROM orders o JOIN users u ON u.id = o.user_id JOIN services s ON s.id = o.service_id
       ORDER BY o.id DESC`
    )
    .all();
  res.render("admin/orders", { active: "admin", orders, statuses: ORDER_STATUSES, meta: { title: `Orders | Admin | ${config.brand.name}`, description: "Manage orders." } });
});

app.post("/admin/orders/:id/status", requireAdmin, (req, res) => {
  const status = req.body.status;
  if (!ORDER_STATUSES.includes(status)) {
    return res.redirect("/admin/orders?err=" + encodeURIComponent("That status is not valid. No change made."));
  }
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.redirect("/admin/orders?ok=" + encodeURIComponent("Order status updated."));
});

app.get("/admin/users", requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC").all();
  res.render("admin/users", { active: "admin", users, meta: { title: `Users | Admin | ${config.brand.name}`, description: "Manage users." } });
});

app.get("/admin/leads", requireAdmin, (req, res) => {
  const leads = db.prepare("SELECT * FROM leads ORDER BY id DESC").all();
  res.render("admin/leads", { active: "admin", leads, meta: { title: `Leads | Admin | ${config.brand.name}`, description: "Contact form leads." } });
});

app.post("/admin/leads/:id/toggle", requireAdmin, (req, res) => {
  db.prepare("UPDATE leads SET handled = 1 - handled WHERE id = ?").run(req.params.id);
  res.redirect("/admin/leads?ok=" + encodeURIComponent("Lead updated."));
});

app.get("/admin/services", requireAdmin, (req, res) => {
  const services = db.prepare("SELECT * FROM services ORDER BY id").all();
  res.render("admin/services", { active: "admin", services, meta: { title: `Services | Admin | ${config.brand.name}`, description: "Manage services and pricing." } });
});

app.get("/admin/services/:id/edit", requireAdmin, (req, res) => {
  const s = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
  if (!s) return res.redirect("/admin/services");
  s.features = JSON.parse(s.features).join("\n");
  res.render("admin/service-edit", { active: "admin", service: s, meta: { title: `Edit service | Admin | ${config.brand.name}`, description: "Edit service." } });
});

app.post("/admin/services/:id", requireAdmin, (req, res) => {
  const s = (v) => (v === undefined || v === null ? "" : String(v)).trim();
  const name = s(req.body.name), short = s(req.body.short), description = s(req.body.description);
  if (!name || !short || !description) {
    return res.redirect("/admin/services/" + req.params.id + "/edit?err=" + encodeURIComponent("Name, short line and description are required."));
  }
  const features = JSON.stringify(s(req.body.features).split("\n").map((l) => l.trim()).filter(Boolean));
  db.prepare(
    `UPDATE services SET name = ?, short = ?, description = ?, price_from = ?, price_unit = ?,
     price_note = ?, timeline = ?, badge = ?, features = ?, active = ? WHERE id = ?`
  ).run(
    name, short, description, parseInt(req.body.price_from, 10) || 0,
    s(req.body.price_unit), s(req.body.price_note), s(req.body.timeline),
    s(req.body.badge) || null, features, req.body.active ? 1 : 0, req.params.id
  );
  res.redirect("/admin/services?ok=" + encodeURIComponent("Service updated."));
});

// ── errors ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("pages/404", {
    active: "",
    meta: { title: "Page not found | " + config.brand.name, description: "The page you are looking for does not exist." },
  });
});

app.listen(PORT, () => {
  console.log(`\n  ${config.brand.name} running at http://localhost:${PORT}`);
  console.log(`  Admin login: ${config.adminSeed.email} / ${config.adminSeed.password}\n`);
});

// Database layer: Node's built-in node:sqlite (no native deps, no build tools).
// The DB file is created automatically on first run. No external services.
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const config = require("./config");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "growlocal.db");

const SERVICES = [
  {
    slug: "short-form-video-editing",
    name: "Short-Form Video Editing",
    short: "Reels and Shorts that stop the scroll",
    description:
      "Short video is where customers spend their time. We edit scroll-stopping Reels, Shorts and video ads for your business, cut to hold attention in the first three seconds and built to turn viewers into enquiries.",
    price_from: 800,
    price_unit: "per reel",
    price_note: "Monthly retainers from \u20B910,000 for 10 to 15 reels",
    timeline: "First draft in 48 hours",
    badge: "Most popular",
    features: JSON.stringify([
      "Hook-first editing for the opening 3 seconds",
      "Captions and kinetic text overlays",
      "Trending audio and clean sound design",
      "Cover frame with title text",
      "2 revision rounds included",
    ]),
  },
  {
    slug: "whatsapp-business-automation",
    name: "WhatsApp Business Setup + Automation",
    short: "Turn everyday chats into customers on autopilot",
    description:
      "Your customers already live on WhatsApp. We set up your business profile, product catalog and smart auto-replies, so enquiries get answered instantly and no lead ever goes cold, even after hours.",
    price_from: 3000,
    price_unit: "one-time setup",
    price_note: "Advanced FAQ and lead-capture bots from \u20B98,000",
    timeline: "Live in 3 days",
    badge: "High demand",
    features: JSON.stringify([
      "Business profile and product catalog setup",
      "Quick replies, labels and broadcast lists",
      "Automatic greeting and away messages",
      "Click-to-WhatsApp ad-ready configuration",
      "Live training call for you and your team",
    ]),
  },
  {
    slug: "social-media-management",
    name: "Social Media Management",
    short: "A full month of content, completely handled",
    description:
      "Posting consistently is what grows a page, and it is also what busy owners never have time for. We plan, design and publish your content calendar every month, in a voice your customers relate to.",
    price_from: 8000,
    price_unit: "per month",
    price_note: "Single-platform starter plans available",
    timeline: "Content calendar ready in 5 days",
    badge: null,
    features: JSON.stringify([
      "12 to 16 posts per month",
      "Reels, carousels and story creatives",
      "Caption writing and hashtag sets",
      "Festival and offer campaign creatives",
      "Monthly performance report in plain words",
    ]),
  },
  {
    slug: "business-websites",
    name: "Simple Business Websites",
    short: "A fast website that brings enquiries",
    description:
      "Most local businesses still have no proper website, which means every Google search sends customers to a competitor. We build clean, fast, mobile-first websites that load quickly and convert visitors into calls and WhatsApp chats.",
    price_from: 12000,
    price_unit: "one-time",
    price_note: "Most projects land between \u20B912,000 and \u20B918,000",
    timeline: "Live in 7 days",
    badge: null,
    features: JSON.stringify([
      "5-page website built for your business",
      "Mobile-first responsive design",
      "WhatsApp chat button and enquiry forms",
      "Google Maps and customer reviews section",
      "Basic SEO setup so Google can find you",
    ]),
  },
  {
    slug: "google-business-profile",
    name: "Google Business Profile + Local SEO",
    short: "Show up when nearby customers search",
    description:
      "When someone nearby searches for what you sell, Google shows a short list of businesses. We claim, verify and optimise your free Google Business Profile, then keep it active with posts and review replies, so you rank in that list.",
    price_from: 2000,
    price_unit: "one-time setup",
    price_note: "Ongoing management from \u20B93,000 per month",
    timeline: "Fully optimised in 2 days",
    badge: "Quick win",
    features: JSON.stringify([
      "Profile claim and verification assistance",
      "Photos, services and keyword-rich description",
      "Ready-to-use review reply templates",
      "Weekly posts and photo uploads",
      "Local ranking starter checklist",
    ]),
  },
  {
    slug: "lead-generation",
    name: "Lead Generation",
    short: "A steady pipeline of real enquiries",
    description:
      "Likes do not pay bills, enquiries do. We build a simple lead machine for your business: a capture page, click-to-WhatsApp follow-up and ad creatives, then hand you a clean list of interested customers every week.",
    price_from: 8000,
    price_unit: "per month",
    price_note: "One-time setup plus monthly management",
    timeline: "First leads within 2 weeks",
    badge: null,
    features: JSON.stringify([
      "Lead capture page or smart form",
      "Click-to-WhatsApp follow-up flow",
      "Ad copy and creatives in your language",
      "Weekly lead list delivered in a sheet",
      "Monthly optimisation report",
    ]),
  },
  {
    slug: "pitch-deck-design",
    name: "Pitch-Deck Design",
    short: "Decks that win rooms",
    description:
      "Whether it is a franchise pitch, a workshop or an investor meeting, a sharp deck does half the talking for you. We design clear, confident presentations with strong structure, visuals and clean typography.",
    price_from: 3000,
    price_unit: "per deck",
    price_note: "Investor and franchise decks from \u20B910,000",
    timeline: "Delivered in 3 days",
    badge: null,
    features: JSON.stringify([
      "10 to 15 fully custom slides",
      "Story structure and narrative flow",
      "Charts, icons and supporting visuals",
      "Design matched to your brand",
      "2 revision rounds included",
    ]),
  },
];

function init() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short TEXT NOT NULL,
      description TEXT NOT NULL,
      price_from INTEGER NOT NULL,
      price_unit TEXT NOT NULL,
      price_note TEXT NOT NULL,
      timeline TEXT NOT NULL,
      badge TEXT,
      features TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id),
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      business TEXT,
      message TEXT NOT NULL,
      handled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seed(db);
  return db;
}

function seed(db) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM services").get().c;
  if (count === 0) {
    const ins = db.prepare(
      `INSERT INTO services (slug, name, short, description, price_from, price_unit, price_note, timeline, badge, features)
       VALUES (@slug, @name, @short, @description, @price_from, @price_unit, @price_note, @timeline, @badge, @features)`
    );
    for (const s of SERVICES) ins.run(s);
  }

  const mkUser = (name, email, password, role) => {
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (exists) return exists.id;
    const hash = bcrypt.hashSync(password, 10);
    return db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)").run(name, email, hash, role).lastInsertRowid;
  };

  mkUser(config.adminSeed.name, config.adminSeed.email, config.adminSeed.password, "admin");

  if (process.env.SEED_DEMO !== "false") {
    const demoId = mkUser(config.demoSeed.name, config.demoSeed.email, config.demoSeed.password, "user");
    const orderCount = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE user_id = ?").get(demoId).c;
    if (orderCount === 0) {
      const svc = (slug) => db.prepare("SELECT id FROM services WHERE slug = ?").get(slug).id;
      db.prepare("INSERT INTO orders (user_id, service_id, details, status) VALUES (?, ?, ?, ?)").run(
        demoId, svc("short-form-video-editing"),
        "Gym in Bhopal. 12 reels per month, Hindi captions, focus on membership offers.", "In Progress"
      );
      db.prepare("INSERT INTO orders (user_id, service_id, details, status) VALUES (?, ?, ?, ?)").run(
        demoId, svc("google-business-profile"),
        "Salon, single location. Profile claimed, needs photos and review replies.", "Completed"
      );
    }
  }
}

module.exports = { init };

// ─────────────────────────────────────────────────────────────
// BRAND CONFIG: rename the whole business in ONE place.
// Every page, email string, title and footer reads from here.
// ─────────────────────────────────────────────────────────────
module.exports = {
  brand: {
    name: "GrowLocal",
    tagline: "Digital growth services for local businesses",
    email: "hello@growlocal.in",
    phone: "+91 90000 00000",
    city: "Bhopal, India",
    hours: "Mon to Sat, 10am to 7pm IST",
    // Placeholder public URL. Set SITE_URL in the environment (or change this)
    // when deploying so canonical tags, sitemap and robots use the real domain.
    siteUrl: "https://growlocal.in",
  },

  // Seeded on first run. Change these in production and delete the
  // demo client, or set SEED_DEMO=false in the environment.
  adminSeed: { name: "Site Admin", email: "admin@growlocal.in", password: "Admin@123" },
  demoSeed: { name: "Demo Client", email: "client@growlocal.in", password: "Client@123" },

  sessionDays: 7,
  cookieName: "gl_session",
};

# GrowLocal — Full-Stack Business Website

A complete, deployable website for a digital services studio serving local businesses
(coaches, gyms, salons, clinics, institutes, shops). Multi-page marketing site +
real backend: accounts, service requests, order tracking, contact leads, and a full
admin panel. Built with Node.js + Express + SQLite. Zero external services, zero
native dependencies.

## Quick start

```bash
cd linkedin-business-site
npm install
npm start
```

Open http://localhost:3000. The SQLite database file is created automatically at
`data/growlocal.db` on first run, pre-seeded with 7 services, an admin account,
and demo data.

## Login credentials (seeded)

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@growlocal.in  | Admin@123  |
| Demo client | client@growlocal.in | Client@123 |

Change these immediately in production (edit `config.js` seed values, delete the
demo user from the admin panel, or set `SEED_DEMO=false`).

## What's inside

**Public pages:** Home, Services, Service detail (per service), Sample Work,
Pricing, About, Contact (saves leads to the DB), Login, Signup, 404/403 pages.

**Customer area** (`/dashboard`, login required): profile card, request-a-service
form (creates an order), order list with live status tracking.

**Admin panel** (`/admin`, admin login required): stats dashboard (customers,
orders, pending, new leads), order management with status updates, user list,
contact-lead inbox with handled toggle, and full service/pricing content editing
(name, description, price, timeline, features, visibility).

**Design:** dark vibrant theme with aurora gradients, kinetic typography,
scroll reveals, animated counters, marquee strips, parallax blobs, card
spotlights, hover micro-interactions and page-transition wipes. Fully responsive
with a mobile menu. Honors `prefers-reduced-motion`.

**SEO:** unique title + meta description per page, Open Graph + Twitter cards,
canonical links, one `h1` per page, semantic HTML, JSON-LD (ProfessionalService /
Service / LocalBusiness), `sitemap.xml`, `robots.txt`, descriptive alt/aria
labels on visuals.

## Rename the brand

Everything reads from one file: **`config.js`** → `brand.name`, `tagline`,
`email`, `phone`, `city`, `hours`, `siteUrl`. Change it there and the whole site
updates.

## Assumptions made (change freely)

The site was built while the owner was offline, so these placeholder choices
were picked with best judgment and are all one-line changes in `config.js`:

- **Brand name:** GrowLocal (placeholder, rename in `config.js`).
- **Contact details:** `hello@growlocal.in`, `+91 90000 00000`, Bhopal, India,
  "Mon to Sat, 10am to 7pm IST". Replace with real details before launch.
- **Public URL:** `https://growlocal.in` is used for canonical links, OG tags,
  sitemap and robots until you deploy — then set the `SITE_URL` env var (or
  edit `brand.siteUrl`) to the real domain.
- **Prices:** taken from the LinkedIn demand-gap research (reels from ₹800,
  retainers from ₹10,000). Adjust in the admin panel, no code needed.
- **OG share image:** a simple branded `public/og.svg` is served at
  `/og.svg` and referenced in the meta tags.
- **Google Fonts** (Inter + Space Grotesk) load from the Google CDN; if they
  fail (offline), the CSS falls back to system fonts cleanly.

## QA report (30 Sept 2026, verified on a live server)

Every item below was tested against a running instance, not just read in code.
Bugs found during QA were fixed and re-tested:

- **Pages:** all 17 public pages + 7 service-detail routes return 200, each
  with a unique title, unique meta description, exactly one `h1`, OG tags,
  Twitter card tags, canonical + `og:url` + share image, and JSON-LD where
  relevant. `sitemap.xml` and `robots.txt` valid. 404 page renders on unknown
  URLs; `/admin` without login returns 403; `/dashboard` without login
  redirects to login.
- **Auth:** signup → login → logout works; duplicate email, wrong password,
  short password, and bad email are all rejected with friendly messages.
  Sessions are stored in SQLite and survive server restarts. Users can only
  see their own orders; non-admins get 403 on every `/admin/*` route.
- **Orders:** request-a-service creates an order → visible in admin orders →
  admin changes status (Pending / In Progress / Completed / Cancelled) →
  customer sees the new status. Invalid status values are rejected.
- **Leads:** contact form saves a lead → visible in admin inbox → handled
  toggle works. Empty/invalid submissions rejected.
- **Admin editor:** editing a service's price in the admin panel updates the
  service page and pricing page live; missing-field submissions no longer
  crash (hardened during QA).
- **Browser QA (headless Chromium, desktop 1440px + mobile 390px):** zero
  console errors and zero failed requests on every page; scroll-reveal
  animations fire on 100% of `.reveal` elements; animated counters complete;
  marquee strip animates; parallax and page-transition wipe elements present;
  mobile burger menu opens and closes correctly. (Note: Google Fonts requests
  failed inside the offline test sandbox; the site falls back to system fonts
  and loads normally.)
- **Fresh install:** clean copy → `npm install` (78 packages, ~6s) →
  `node server.js` → database auto-created and seeded → home, service pages,
  signup, dashboard, admin login all pass.
- **Copy:** all UI text is clean professional English, no Hindi mix, no
  em/en dashes, no banned AI-phrase patterns. (Human-tone verification was a
  rigorous manual review; no AI-detector tool was reachable from this
  environment, so that is stated honestly rather than claimed.)

### Known limitations (before real production / payments)

- No CSRF tokens, no rate limiting, no email verification, no password reset.
- Order flow is request-based; no payment is processed.
- Change the seeded admin/demo passwords before launch.
- SQLite is fine for small-to-medium traffic; back up the DB file.

## Configuration (env vars)

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | HTTP port |
| `SITE_URL` | `config.brand.siteUrl` (`https://growlocal.in`), else `http://localhost:PORT` | Canonical base URL (canonical tags, OG, sitemap, robots, JSON-LD) |
| `DB_PATH` | `data/growlocal.db` | SQLite file location |
| `SEED_DEMO` | `true` | Set `false` to skip the demo client + demo orders |

## Deploy

**Render.com:** New Web Service → connect repo → Build: `npm install` →
Start: `npm start`. Add a persistent disk mounted at `/opt/render/project/src/data`
(or set `DB_PATH` to the disk path) so the SQLite file survives deploys. Set
`SITE_URL` to your public URL.

**Railway:** New project → deploy from repo → Start command `npm start`.
Add a volume mounted at `/app/data` and set `DB_PATH=/app/data/growlocal.db`,
`SITE_URL` to your domain.

**Any VPS (Ubuntu):**
```bash
# Node 22+ required (uses the built-in node:sqlite module)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
cd linkedin-business-site && npm install
PORT=3000 SITE_URL=https://yourdomain.com node server.js
```
For production, run behind a process manager (`pm2 start server.js`) and a
reverse proxy (nginx/Caddy) with HTTPS. SQLite handles small-to-medium traffic
fine; the app is stateless except the DB file, so back that file up.

## Tech notes

- Passwords hashed with bcrypt (10 rounds). Sessions are random 256-bit tokens
  stored in SQLite, sent as `HttpOnly`, `SameSite=Lax` cookies, 7-day expiry.
- All user input is validated server-side; EJS output is HTML-escaped.
- Not included (add before handling real payments): CSRF tokens, rate limiting,
  email verification, password reset flow, and a payment gateway. The order flow
  is request-based: no money moves through the site.

## Project structure

```
server.js            Express app: routes, auth, sessions, SEO (sitemap/robots)
db.js                SQLite schema + seed data (services, admin, demo)
config.js            Brand config — rename the business in one place
views/partials/      head (SEO tags), nav, footer, admin sidebar
views/pages/         home, services, service-detail, work, pricing, about,
                     contact, login, signup, dashboard, 404, 403
views/admin/         dashboard, orders, users, leads, services, service-edit
public/css/style.css Full design system + animations
public/js/main.js    Reveals, counters, parallax, kinetic type, transitions
data/                SQLite DB file (auto-created, gitignored in real use)
```

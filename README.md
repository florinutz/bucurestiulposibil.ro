<p align="center">
  <img src="public/BP-logo-site.png" alt="Bucureștiul Posibil" width="200" />
</p>

<h1 align="center">Bucureștiul Posibil</h1>

<p align="center">
  <strong>Reimagining Bucharest, one street at a time.</strong>
  <br />
  An interactive civic engagement platform where citizens explore, propose, and vote on urban transformations for a more livable Bucharest.
  <br /><br />
  <a href="https://bucurestiulposibil.ro">bucurestiulposibil.ro</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-deployed-orange?logo=cloudflare" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/Sanity-CMS-red?logo=sanity" alt="Sanity CMS" />
</p>

---

## What is this?

**Bucureștiul Posibil** (Possible Bucharest) is a map-based platform that lets people explore 360° panoramic visualizations of reimagined streets, propose new locations for urban improvements, and vote on community-submitted ideas.

The project grew from a simple observation: Bucharest's streets are designed for cars, not people. What if we could show citizens what their neighborhoods could look like with wider sidewalks, bike lanes, green spaces, and pedestrian zones?

### Three modes, one mission

| Mode | Route | What it does |
|------|-------|--------------|
| **Tour** | `/` | Explore 12 reimagined locations through interactive 360° panoramic videos |
| **Propose** | `/propune` | Drop a pin on the map and submit your own idea for urban improvement |
| **Vote** | `/vot` | Cast your vote on community proposals to help prioritize what gets built |

## Tour locations

The platform features visualizations of real Bucharest locations reimagined with new urbanist principles:

- **Pietonala Obor** -- Pedestrian corridor connecting the market to the metro
- **Magheru** -- Boulevard redesign with protected bike lanes and restored facades
- **Parc Opera** -- Green oasis at a major intersection
- **UNIStrada** -- University gathering space replacing a parking lot
- **Sf. Stefan** -- Neighborhood square opened up for people
- **Vladeasa** -- Safe school street inspired by Paris
- **Uranus** -- Velostrada model for secondary streets
- **Episcopiei** -- Extended pedestrian zone behind the Athenaeum
- **Natiunile Unite** -- Total reimagining of a gridlocked intersection
- **Splaiul Unirii** -- Reclaiming the Dambovita riverbank
- **Giulesti** -- Neighborhood market revitalization
- **Baneasa** -- Market extension with shade and gathering space

Each location includes a 360° YouTube video walkthrough so you can look around the reimagined space.

## Tech stack

```
Next.js 15 + React 19          -- app framework
TypeScript                      -- type safety
Tailwind CSS + Styled Components -- styling
Leaflet                         -- interactive maps
Sanity.io                       -- headless CMS + admin studio
Cloudflare Workers + D1         -- edge deployment + SQLite database
OpenNext                        -- Next.js-to-Workers adapter
Vitest + Playwright             -- unit + e2e testing
```

## Getting started

### Prerequisites

- Node.js 18+
- A [Cloudflare](https://cloudflare.com) account (for Workers & D1)
- A [Sanity](https://sanity.io) project

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database setup

```bash
npm run db:migrate           # create schema
npm run db:seed              # seed with initial data
npm run db:migrate:voting    # add voting tables
npm run db:voting:mark-pins  # enable voting on pins
```

### Sanity CMS

The admin studio is available at `/admin`. To sync content between Sanity and the local D1 database:

```bash
npm run sanity:sync          # sync to local D1
npm run sanity:sync:remote   # sync to production D1
npm run sanity:list:approved # list approved locations
```

### Deploy

```bash
npm run build && npm run deploy
```

This builds the Next.js app via OpenNext and deploys it to Cloudflare Workers.

## How voting works

The voting system uses browser fingerprinting to enforce one vote per person across all locations. No accounts required -- citizens just click and vote. Fingerprints are composed of session data, screen resolution, timezone, and other browser attributes to prevent ballot stuffing while keeping the experience frictionless.

Vote data is stored in Cloudflare D1 (edge SQLite), and the Sanity webhook pipeline ensures only moderator-approved locations appear on the voting map.

## Project structure

```
src/
  app/
    page.tsx                  # tour mode (home)
    propune/                  # proposal mode
    vot/                      # voting mode
    [slug]/                   # dynamic location pages
    admin/                    # Sanity Studio
    api/                      # API routes (geopoints, voting, webhooks)
  components/
    shared/                   # map layout, controls, modals
    tour/                     # tour-specific UI
    proposal/                 # proposal-specific UI
    voting/                   # voting-specific UI
  lib/                        # stores, fingerprinting, hooks
  sanity/                     # schemas, client config
  data/                       # static tour pin data
public/
  locatii/                    # location images
  postcards/                  # postcard-style renders
```

## Scripts reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run test` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:voting:stats` | View voting statistics |
| `npm run sanity:sync` | Sync Sanity content to local D1 |

## Contributing

This is a civic project. If you care about making Bucharest more livable, contributions are welcome -- whether that's code, design, urban planning expertise, or just spreading the word.

## License

All urban visualizations and panoramic content are property of the Bucurestiul Posibil project.

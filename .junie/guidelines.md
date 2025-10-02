# Bucureștiul Posibil - Developer Guidelines

## Project Context
Interactive citizen-engagement platform for urban improvements in Bucharest. Citizens propose locations via map → Sanity CMS moderation → Cloudflare D1 sync → public voting system.

**Stack**: Next.js 15 + React 19 + TypeScript + Leaflet + Sanity CMS + Cloudflare D1 + Workers

## Critical Development Workflows

### Data Flow Architecture
```
User Proposal → Sanity (pending) → Human Approval → Webhook → D1 Sync → Map Display
Voting: D1 Query (is_votable=TRUE) → User Vote → Fingerprint Anti-fraud → Vote Count Update
```

### Pre-Development Checklist
1. **Test baseline**: `npm run test:run` must show 34/34 passing
2. **Type generation**: `npm run cf-typegen` after Cloudflare binding changes
3. **Interface consistency**: Both `D1Pin` interfaces must match:
   - `src/types/geopoint.ts` (main)
   - `src/lib/locationStore.ts` (local)

### Database Schema Management Protocol
1. **Base schema**: `schema.sql` (22 lines) - core geopoints table
2. **Voting extension**: `migrations/001_add_voting_support.sql` - adds `is_votable` + votes table
3. **Migration commands**:
   - Local: `npm run db:migrate` + `npm run db:migrate:voting`
   - Production: `npm run db:migrate:remote` + `npm run db:migrate:voting:remote`
4. **Schema changes require**:
   - Update both D1Pin interfaces simultaneously
   - Modify webhook field mapping in `sanity-webhook/route.ts`
   - Add corresponding tests

### API Development Patterns

#### Endpoint Structure
- **Proposals**: `/api/propose-point` → Sanity (pending status)
- **Webhook**: `/api/sanity-webhook` → HMAC verification → D1 sync (approved only)
- **Display**: `/api/geopoints` (proposals), `/api/voting/geopoints` (votable)
- **Voting**: `/api/voting/vote` → fingerprint check → vote recording

#### Security Requirements
- **Webhook HMAC**: Signature verification mandatory for Sanity sync
- **IP logging**: Auto-captured for all proposals (spam prevention)
- **Voting anti-fraud**: Unique constraint on (geopoint_id, browser_fingerprint)
- **Input validation**: Server-side validation for all user inputs

### Component Architecture

#### Map System (`src/components/shared/`)
- **MapLayout.tsx**: UI orchestration, modals, `mode` prop toggles behavior
- **MapCore.tsx**: Leaflet integration, pin rendering, bounds enforcement
- **MapControls.tsx**: Search (700ms debounce), GPS (30s timeout), help

#### Modal Patterns
- ESC key handling via useEffect in parent component
- Focus management for accessibility
- Backdrop click dismissal

## Quality Standards & Testing

### Build Validation Pipeline (All Required)
```bash
npm run test:run        # 34/34 tests must pass
npm run lint           # Zero ESLint errors
npm run check          # TypeScript + build validation
npm run build:cloudflare  # Cloudflare Workers build
```

### Test Coverage
- **propose-point**: 11 tests (validation, Sanity integration)
- **sanity-webhook**: 14 tests (HMAC, D1 sync, error handling)
- **MapCore**: 9 tests (UI interactions, pin placement)

### TypeScript Enforcement
- **No `any` types**: ESLint rule `@typescript-eslint/no-explicit-any`
- **Interface exports**: Required in `src/types/geopoint.ts`
- **Type generation**: `wrangler types` integration via `cf-typegen`

## Data Integrity Rules

### Sanity → D1 Sync
- **Only approved pins** appear in D1 (webhook enforces)
- **Webhook is source of truth** for sync operations
- **All proposals start pending** (no exceptions)
- **Status changes**: pending → approved → D1 upsert, approved → rejected → D1 delete

### Voting System
- **Single vote per location per fingerprint** (database constraint)
- **Metadata collection**: IP, User-Agent, screen resolution, timezone
- **Client enforcement**: localStorage + fingerprint for UX
- **Server validation**: 409 response for duplicate attempts

## Database Operations

### Common Scripts
```bash
# Development
npm run db:count                 # Record counts
npm run db:list                  # Recent 10 entries
npm run db:shell                 # Interactive D1 shell

# Voting Management
npm run db:voting:mark-pins      # Mark pins as votable
npm run db:voting:stats          # Vote statistics

# Production (append :remote)
npm run db:count:remote
npm run db:backup:remote
```

### Sanity Integration
```bash
npm run sanity:list:approved     # List approved Sanity docs
npm run sanity:sync:remote       # Manual sync to production D1
```

## Common Issues & Troubleshooting

### Map Not Loading
- Verify SSR disabled for Leaflet components
- Check Leaflet CSS inclusion
- Confirm bounds: 44.330819,25.933960 to 44.552407,26.258057

### Webhook Failures
- **Signature mismatch**: Verify SANITY_WEBHOOK_SECRET in environment
- **D1 sync errors**: Check Cloudflare binding configuration
- **Network issues**: Webhook URL must be accessible from Sanity

### Voting Issues
- **409 responses**: Expected for duplicate votes (same fingerprint + location)
- **Missing votes**: Check `is_votable = TRUE` on geopoints
- **Fingerprint inconsistency**: Browser fingerprint generation in `src/lib/browserFingerprint.ts`

### Build Failures
- **Type errors**: Run `npm run cf-typegen` first
- **ESLint violations**: No `any` types allowed
- **Test failures**: Check MSW mocks in `src/test/mocks/server.ts`

## Never Do This
- ❌ Use `any` types (ESLint enforced)
- ❌ Skip webhook HMAC verification
- ❌ Allow direct D1 writes (bypass Sanity moderation)
- ❌ Commit failing tests
- ❌ Modify D1 schema without updating both interfaces

## Critical File Dependencies
- `wrangler.jsonc`: Cloudflare config, D1 bindings, domain routing
- `src/types/geopoint.ts`: Central type definitions
- `src/sanity/schemaTypes/geopoint.ts`: Sanity schema with workflow fields
- `schema.sql` + `migrations/001_add_voting_support.sql`: Complete DB schema

This project follows a strict moderation workflow where all user content is human-reviewed before public display, with sophisticated anti-fraud measures for the voting system.
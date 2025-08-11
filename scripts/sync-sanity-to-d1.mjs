#!/usr/bin/env node

// Sanity utility CLI: list entries or sync them into Cloudflare D1
// Usage:
//   node scripts/sync-sanity-to-d1.mjs list [--status=approved|pending|rejected|draft|all] [--limit=100] [--json]
//   node scripts/sync-sanity-to-d1.mjs sync [--ids=id1,id2,...] [--remote]
// 
// Sync behavior:
//   - Without --ids: Full sync (updates existing, adds missing approved, removes non-approved)
//   - With --ids: Syncs only specified pins (any status)
// Requirements:
//   - ENV: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN
//   - wrangler installed (as devDependency here)

import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const VALID_STATUSES = new Set(['approved', 'pending', 'rejected', 'draft', 'all'])

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  if (!command || !['list', 'sync'].includes(command)) {
    printHelp()
    process.exit(1)
  }

  const flags = parseFlags(rest)
  const status = flags.status || (command === 'list' ? 'all' : 'approved')
  const limit = flags.limit ? Number(flags.limit) : undefined
  const useRemote = Boolean(flags.remote)
  const outputJson = Boolean(flags.json)
  const idsCsv = typeof flags.ids === 'string' ? flags.ids : undefined
  const ids = idsCsv ? idsCsv.split(',').map(s => s.trim()).filter(Boolean) : undefined

  if (!VALID_STATUSES.has(status)) {
    console.error(`Invalid --status: ${status}. Valid: approved, pending, rejected, draft, all`)
    process.exit(1)
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_TOKEN

  if (!projectId || !dataset || !token) {
    console.error('Missing required env vars. Please set: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN')
    process.exit(1)
  }

  const { createClient } = await import('@sanity/client')
  const sanity = createClient({ projectId, dataset, apiVersion: '2025-01-12', token, useCdn: false })

  if (command === 'list') {
    const pins = await fetchPins(sanity, { status, limit })
    if (outputJson) {
      console.log(JSON.stringify(pins, null, 2))
    } else {
      printPinsTable(pins)
    }
    return
  }

  // sync
  if (ids && ids.length > 0) {
    console.log(`Syncing ${ids.length} pin(s) by id...`)
    const pins = await fetchPinsByIds(sanity, ids)
    if (!Array.isArray(pins) || pins.length === 0) {
      console.log('No pins found for the provided IDs.')
      return
    }
    await syncPinsToD1(pins, useRemote)
    console.log(`Done. Synced ${pins.length} pins by ID.`)
  } else {
    console.log('Performing full synchronization...')
    
    // 1. Get all pins from Sanity (all statuses)
    console.log('1/4 Fetching all pins from Sanity...')
    const allSanityPins = await fetchPins(sanity, { status: 'all' })
    const approvedSanityPins = allSanityPins.filter(p => p.status === 'approved')
    console.log(`Found ${allSanityPins.length} total pins (${approvedSanityPins.length} approved)`)
    
    // 2. Get all pins currently in D1
    console.log('2/4 Fetching existing pins from D1...')
    const existingD1Pins = await getExistingD1Pins(useRemote)
    console.log(`Found ${existingD1Pins.length} existing pins in D1`)
    
    // 3. Determine operations needed
    const approvedSanityIds = new Set(approvedSanityPins.map(p => p._id))
    const existingD1Ids = new Set(existingD1Pins.map(p => p.id))
    
    const toUpsert = approvedSanityPins // All approved pins should be in D1
    const toDelete = existingD1Pins.filter(d1Pin => !approvedSanityIds.has(d1Pin.id))
    
    console.log(`3/4 Operations planned:`)
    console.log(`  - Upsert: ${toUpsert.length} approved pins`)
    console.log(`  - Delete: ${toDelete.length} non-approved pins`)
    
    // 4. Execute operations
    console.log('4/4 Executing synchronization...')
    
    // Delete non-approved pins first
    if (toDelete.length > 0) {
      await deletePinsFromD1(toDelete.map(p => p.id), useRemote)
      console.log(`Deleted ${toDelete.length} non-approved pins from D1`)
    }
    
    // Upsert approved pins
    if (toUpsert.length > 0) {
      await syncPinsToD1(toUpsert, useRemote)
      console.log(`Upserted ${toUpsert.length} approved pins to D1`)
    }
    
    console.log(`Done. Full synchronization completed.`)
  }
}

async function fetchPins(sanity, { status, limit }) {
  let filter = ''
  if (status && status !== 'all') {
    filter = ` && status == "${status}"`
  }
  const limitClause = typeof limit === 'number' && Number.isFinite(limit) ? `| order(_createdAt desc)[0...${Math.max(0, limit)}]` : ''

  const query = `*[_type == "pin"${filter}]${limitClause}{
    _id,
    title,
    status,
    "slug": slug.current,
    location{lat, lng},
    description,
    submittedBy{name, email, ip},
    approvedAt,
    approvedBy,
    _createdAt,
    _updatedAt
  }`

  const pins = await sanity.fetch(query)
  return pins
}

async function fetchPinsByIds(sanity, ids) {
  const query = `*[_type == "pin" && _id in $ids]{
    _id,
    title,
    status,
    "slug": slug.current,
    location{lat, lng},
    description,
    submittedBy{name, email, ip},
    approvedAt,
    approvedBy,
    _createdAt,
    _updatedAt
  }`
  const pins = await sanity.fetch(query, { ids })
  return pins
}

async function getExistingD1Pins(useRemote) {
  try {
    const cmd = `wrangler d1 execute dots --command="SELECT id FROM geopoints"${useRemote ? ' --remote' : ''} --json`
    const output = execSync(cmd, { encoding: 'utf8' })
    const result = JSON.parse(output)
    
    // Handle wrangler output format: { success: true, results: [...] }
    if (result.success && Array.isArray(result.results)) {
      return result.results.map(row => ({ id: row.id }))
    }
    console.warn('Unexpected D1 query result format:', result)
    return []
  } catch (err) {
    console.error('Failed to fetch existing D1 pins:', err.message)
    return []
  }
}

async function syncPinsToD1(pins, useRemote) {
  const batchSize = 50
  const tempBaseDir = mkdtempSync(join(tmpdir(), 'sanity-sync-'))
  
  try {
    for (let i = 0; i < pins.length; i += batchSize) {
      const batch = pins.slice(i, i + batchSize)
      const sqlStatements = batch.map(toUpsertSQL).join('\n')
      const filePath = join(tempBaseDir, `upsert-batch-${i}.sql`)
      writeFileSync(filePath, sqlStatements, 'utf8')

      const cmd = `wrangler d1 execute dots --file="${filePath}"${useRemote ? ' --remote' : ''}`
      try {
        execSync(cmd, { stdio: 'inherit' })
      } catch (err) {
        console.error(`Failed executing D1 upsert batch ${i}:`, err.message)
        throw err
      } finally {
        try { unlinkSync(filePath) } catch {}
      }
    }
  } finally {
    // Clean up temp directory
    try {
      execSync(`rm -rf "${tempBaseDir}"`)
    } catch {}
  }
}

async function deletePinsFromD1(pinIds, useRemote) {
  if (!pinIds.length) return
  
  const batchSize = 100
  const tempBaseDir = mkdtempSync(join(tmpdir(), 'sanity-delete-'))
  
  try {
    for (let i = 0; i < pinIds.length; i += batchSize) {
      const batch = pinIds.slice(i, i + batchSize)
      const placeholders = batch.map(() => '?').join(', ')
      const deleteSQL = `DELETE FROM geopoints WHERE id IN (${placeholders});`
      
      // For DELETE with IN clause, we need to create a more complex SQL
      const sqlStatements = batch.map(id => `DELETE FROM geopoints WHERE id = '${id.replaceAll("'", "''")}';`).join('\n')
      
      const filePath = join(tempBaseDir, `delete-batch-${i}.sql`)
      writeFileSync(filePath, sqlStatements, 'utf8')

      const cmd = `wrangler d1 execute dots --file="${filePath}"${useRemote ? ' --remote' : ''}`
      try {
        execSync(cmd, { stdio: 'inherit' })
      } catch (err) {
        console.error(`Failed executing D1 delete batch ${i}:`, err.message)
        throw err
      } finally {
        try { unlinkSync(filePath) } catch {}
      }
    }
  } finally {
    // Clean up temp directory
    try {
      execSync(`rm -rf "${tempBaseDir}"`)
    } catch {}
  }
}

function esc(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

function toUpsertSQL(pin) {
  const id = esc(pin._id)
  const title = esc(pin.title)
  const slug = esc(pin.slug || '')
  const lat = esc(pin.location?.lat ?? null)
  const lng = esc(pin.location?.lng ?? null)
  const description = esc(pin.description ?? null)
  const submittedByName = esc(pin.submittedBy?.name ?? null)
  const createdAt = esc(pin._createdAt)
  const updatedAt = esc(pin._updatedAt)
  const approvedAt = esc(pin.approvedAt ?? null)
  const approvedBy = esc(pin.approvedBy ?? null)

  return `INSERT OR REPLACE INTO geopoints (
    id, title, slug, lat, lng, description, submitted_by_name, created_at, updated_at, approved_at, approved_by
  ) VALUES (
    ${id}, ${title}, ${slug}, ${lat}, ${lng}, ${description}, ${submittedByName}, ${createdAt}, ${updatedAt}, ${approvedAt}, ${approvedBy}
  );`
}

function parseFlags(args) {
  const flags = {}
  for (let i = 0; i < args.length; i += 1) {
    const part = args[i]
    if (!part.startsWith('--')) continue
    const eqIdx = part.indexOf('=')
    if (eqIdx > -1) {
      const key = part.slice(2, eqIdx)
      const value = part.slice(eqIdx + 1)
      flags[key] = value
    } else {
      const key = part.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        i += 1
      } else {
        flags[key] = true
      }
    }
  }
  return flags
}

function printPinsTable(pins) {
  if (!pins.length) {
    console.log('No results')
    return
  }
  console.log(`Count: ${pins.length}`)
  console.log('')
  for (const p of pins) {
    const coords = p?.location ? `${p.location.lat?.toFixed(5)}, ${p.location.lng?.toFixed(5)}` : 'n/a'
    console.log(`- ${p.title} [${p.status}] @ ${coords}  id=${p._id}`)
  }
}

function printHelp() {
  console.log(`Sanity utility CLI\n\n` +
    `Commands:\n` +
    `  list [--status=approved|pending|rejected|draft|all] [--limit=100] [--json]\n` +
    `  sync [--ids=id1,id2,...] [--remote]\n\n` +
    `Sync behavior:\n` +
    `  - Without --ids: Full sync (updates existing, adds missing approved, removes non-approved)\n` +
    `  - With --ids: Syncs only specified pins (any status)\n\n` +
    `Examples:\n` +
    `  node scripts/sync-sanity-to-d1.mjs list --status=approved --limit=20\n` +
    `  node scripts/sync-sanity-to-d1.mjs sync                    # Full sync\n` +
    `  node scripts/sync-sanity-to-d1.mjs sync --remote           # Full sync (remote)\n` +
    `  node scripts/sync-sanity-to-d1.mjs sync --ids=abc123,def456 --remote\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
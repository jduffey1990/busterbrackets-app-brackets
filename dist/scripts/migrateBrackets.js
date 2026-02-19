"use strict";
// src/scripts/migrateBrackets.ts
//
// One-time migration: converts flat string[] brackets to StructuredBracket format.
//
// Safety features:
//   - Detects region from entry prefix (e/w/s/m), never assumes index order
//   - Validates every bracket before writing (63 entries, valid prefixes, etc.)
//   - Dry-run mode by default — set DRY_RUN=false to actually write
//   - Logs every bracket's conversion for manual review
//
// Usage:
//   DRY_RUN=true  npx ts-node src/scripts/migrateBrackets.ts   # preview
//   DRY_RUN=false npx ts-node src/scripts/migrateBrackets.ts   # commit
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_service_1 = require("../controllers/mongodb.service");
const DRY_RUN = ((_a = process.env.DRY_RUN) !== null && _a !== void 0 ? _a : 'true') !== 'false';
// ─── Helpers ─────────────────────────────────────────────────────────
const REGION_PREFIX_MAP = {
    e: 'east',
    w: 'west',
    s: 'south',
    m: 'midwest',
};
function getPrefix(entry) {
    return entry.charAt(0);
}
function getRegionName(entry) {
    return REGION_PREFIX_MAP[getPrefix(entry)] || null;
}
/**
 * Convert a flat 63-element bracket array to a StructuredBracket.
 */
function flatToStructured(flat) {
    if (flat.length !== 63) {
        throw new Error(`Expected 63 entries, got ${flat.length}`);
    }
    // ── Step 1: Parse the 4 region blocks (indices 0–55) ──
    // Each block is 14 contiguous entries for one region.
    // We detect which region by checking the prefix of the first entry in each block.
    const regionBlocks = {};
    for (let blockStart = 0; blockStart < 56; blockStart += 14) {
        const block = flat.slice(blockStart, blockStart + 14);
        const regionName = getRegionName(block[0]);
        if (!regionName) {
            throw new Error(`Invalid prefix "${getPrefix(block[0])}" at index ${blockStart}`);
        }
        // Validate all entries in this block share the same prefix
        const prefix = getPrefix(block[0]);
        for (let i = 0; i < block.length; i++) {
            if (getPrefix(block[i]) !== prefix) {
                throw new Error(`Mixed prefixes in block starting at index ${blockStart}: ` +
                    `expected "${prefix}" but found "${getPrefix(block[i])}" at offset ${i} ("${block[i]}")`);
            }
        }
        if (regionBlocks[regionName]) {
            throw new Error(`Duplicate region block detected for "${regionName}"`);
        }
        regionBlocks[regionName] = block;
    }
    // Verify we got all 4 regions
    for (const name of ['east', 'west', 'south', 'midwest']) {
        if (!regionBlocks[name]) {
            throw new Error(`Missing region block for "${name}"`);
        }
    }
    // ── Step 2: Split each region block into rounds ──
    function parseRegion(block) {
        return {
            round32: block.slice(0, 8),
            sweet16: block.slice(8, 12),
            elite8: block.slice(12, 14),
        };
    }
    const eastParsed = parseRegion(regionBlocks['east']);
    const westParsed = parseRegion(regionBlocks['west']);
    const southParsed = parseRegion(regionBlocks['south']);
    const midwestParsed = parseRegion(regionBlocks['midwest']);
    // ── Step 3: Parse the finals section (indices 56–62) ──
    const finalsSection = flat.slice(56, 63);
    // [0..3] = 4 region champs, [4..5] = 2 semifinal winners, [6] = champion
    const regionChamps = finalsSection.slice(0, 4);
    const semifinals = finalsSection.slice(4, 6);
    const champion = finalsSection[6];
    // Map each region champ to its region by prefix
    const champMap = {};
    for (const champ of regionChamps) {
        const region = getRegionName(champ);
        if (!region) {
            throw new Error(`Invalid region champ prefix: "${champ}"`);
        }
        // In rare edge cases the same-prefix team could appear twice (e.g. two east teams in finals)
        // But that can't happen in a valid bracket — each region sends exactly one champ
        if (champMap[region]) {
            throw new Error(`Duplicate region champ for "${region}": "${champ}" and "${champMap[region]}"`);
        }
        champMap[region] = champ;
    }
    // Validate we have a champ for each region
    for (const name of ['east', 'west', 'south', 'midwest']) {
        if (!champMap[name]) {
            throw new Error(`No region champion found for "${name}" in finals section`);
        }
    }
    // ── Step 4: Assemble the StructuredBracket ──
    return {
        east: Object.assign(Object.assign({}, eastParsed), { regionChamp: champMap['east'] }),
        west: Object.assign(Object.assign({}, westParsed), { regionChamp: champMap['west'] }),
        south: Object.assign(Object.assign({}, southParsed), { regionChamp: champMap['south'] }),
        midwest: Object.assign(Object.assign({}, midwestParsed), { regionChamp: champMap['midwest'] }),
        finals: {
            teams: regionChamps,
            semifinals,
            champion,
        },
    };
}
// ─── Main migration ─────────────────────────────────────────────────
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n🏀 Bracket Migration Script`);
        console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🔥 LIVE (writing to DB)'}\n`);
        const dbService = mongodb_service_1.DatabaseService.getInstance();
        try {
            yield dbService.connect();
            const db = dbService.getDb();
            const collection = db.collection('brackets');
            // Fetch all brackets (the raw documents, since they still have the old format)
            const brackets = yield collection.find({}).toArray();
            console.log(`Found ${brackets.length} brackets to migrate.\n`);
            let successCount = 0;
            let errorCount = 0;
            for (const doc of brackets) {
                const id = doc._id.toString();
                const name = doc.name || '(unnamed)';
                try {
                    // Check if already migrated (bracket is an object, not an array)
                    if (!Array.isArray(doc.bracket)) {
                        console.log(`  ⏭  [${id}] "${name}" — already structured, skipping`);
                        successCount++;
                        continue;
                    }
                    const flat = doc.bracket;
                    const structured = flatToStructured(flat);
                    // Also migrate offshootBracket if it exists and is a flat array
                    let offshootStructured = null;
                    if (Array.isArray(doc.offshootBracket) && doc.offshootBracket.length === 63) {
                        offshootStructured = flatToStructured(doc.offshootBracket);
                    }
                    console.log(`  ✅ [${id}] "${name}"`);
                    console.log(`     East champ: ${structured.east.regionChamp}`);
                    console.log(`     West champ: ${structured.west.regionChamp}`);
                    console.log(`     South champ: ${structured.south.regionChamp}`);
                    console.log(`     Midwest champ: ${structured.midwest.regionChamp}`);
                    console.log(`     Champion: ${structured.finals.champion}`);
                    if (!DRY_RUN) {
                        const updateFields = {
                            bracket: structured,
                            updatedAt: new Date(),
                        };
                        if (offshootStructured) {
                            updateFields.offshootBracket = offshootStructured;
                        }
                        yield collection.updateOne({ _id: doc._id }, { $set: updateFields });
                        console.log(`     → Written to DB`);
                    }
                    successCount++;
                }
                catch (err) {
                    errorCount++;
                    console.error(`  ❌ [${id}] "${name}" — ERROR: ${err.message}`);
                }
            }
            console.log(`\n─── Summary ───`);
            console.log(`  Total:    ${brackets.length}`);
            console.log(`  Success:  ${successCount}`);
            console.log(`  Errors:   ${errorCount}`);
            if (DRY_RUN) {
                console.log(`\n  ℹ️  This was a dry run. To commit changes, run with DRY_RUN=false`);
            }
            else {
                console.log(`\n  ✅ Migration complete!`);
            }
        }
        catch (error) {
            console.error('Migration failed:', error);
        }
        finally {
            yield dbService.disconnect();
        }
    });
}
migrate().catch(console.error);

# Level critic — level 17 (Ticker Plunge)

- Run: static
- Screenshots sent to critic: false
- Mechanical flags: background-recycled (background type 'bastion' already used by levels 11, 16; build report must claim a new composition device)
- Telemetry: static run, no capture
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 0
- Concept gate: FAIL (missing: novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom)

## Quality panel

- unavailable (no API key or static run); mechanical pass only.

## News fidelity

- Brief: Level 17 — Ticker Plunge (news-to-level)
- Gate: FAIL
- Row "Value plunges, index falls" -> not-judged
- Row "AI data-center spending boom" -> not-judged
- Row "Panic spreads through names" -> not-judged
- Row "Investors must decide: hold or exit" -> not-judged
- Needs human: panel-unavailable

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [concept:incomplete-brief] (concept) owner: skills/level-creator/SKILL.md
   - Evidence: build brief fails the concept gate: missing novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom
   - Smallest fix: Complete the missing concept artefacts in the build brief (novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom), then re-run npm run critic:concept.
   - Recheck: Concept gate passes (npm run critic:concept) before any art or build spend.
2. [background-recycled] (mechanical) owner: skills/level-art-creator/SKILL.md
   - Evidence: background type 'bastion' already used by levels 11, 16; build report must claim a new composition device
   - Smallest fix: Add a new composition device for the reused background and claim it in the build report.
   - Recheck: Re-run the full critic (npm run critic:level); "background-recycled" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-17/shots.json

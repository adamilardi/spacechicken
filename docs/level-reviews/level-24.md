# Level critic — level 24 (Clutch Crown)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":24,"outcome":"gate-open","durationSec":71.6,"deaths":2,"deathSpots":[2977,2727],"maxX":6020,"hazardTypesSeen":["laser","drone","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (stored combined verdict — re-derivation: quality FAIL on panel math but the cheap diagnosis is uncorroborated, fidelity FAIL on three independent grounds, route coverage partial; still not an approval)
- Loop: 4 (prior top flaw: missing-elements) — LOOP LIMIT REACHED: hand to the user, do not lower the gate
- Pilot runs: 2; repeated flaws across runs: cheap (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: pipeline-ran-full. Gate-open run (71.6s, 2 deaths, no page errors, screenshots sent, 6-beat manifest retained; on-disk JPG filenames match the manifest). Limits: the old capture records no still kinds — 05-hazard-boss (x=6400) and 06-finale (x=6350) both exceed maxX 6020, so both are staged/teleported stills, not gameplay frames — no per-run retention (pilotRuns 2 but only the final outcome plus the repeatedFlaws intersection survives), positions polled every 150ms with death spots approximated from the prior position, no death cause/phase/input/visibility data, and judged-beat coverage is partial by construction: the old `selectPanelShots(..., 4)` judged 4 of the 6 beats per panel pass, deterministically opener/setpiece-countdownBoard/hazard-laser/finale — omitting BOTH the 04-hazard-drone death-cluster beat (x=2600) and the 05-hazard-boss signature-encounter beat (x=6400) from every panel pass; per-pass subsets were unrecorded (`evidenceSeen` did not exist). `hazardTypesSeen` unions snapshot types across staged and gameplay capture — it includes "boss" though the pilot never reached x=6400 — so it cannot attribute deaths or prove encounters.
- Completion / route coverage: PARTIAL. Outcome gate-open with maxX 6020 against crownX 6550: the final 530px, including the Champion King arena (boss x=6400) and the crown approach, is unverified in gameplay. Gate-open does not verify the crown. All four checkpoints (1500/3100/4700/5500) were passed. The two deaths (x=2977, 2727 — 250px apart on the middle rank, just before the x=3100 checkpoint) form no 200px cluster and are cited, not diagnosed: no cause/phase/input/visibility data exists. Alternate branches/tiers visited are unrecorded (old capture), so off-route sections are unverified.
- Mechanical checks: clear. No flags: 3 platform keys (bastionDeck/labDeck/vaultDeck, dominant share 0.46 — a visual-variety heuristic that never blocks quality), no clone-similarity comparator fired (nothing to convert — no clone finding is invented), and the finale carries 2 hazards with 1 visible in a frozen still (finaleVisible true — but that still is staged, x=6350 > maxX).
- Quality: FAIL on stored panel math, but the cheap diagnosis is uncorroborated (see investigation). 3/4 personas name `cheap` (structural), flawless 1 < 3, fairness mean 1.43 < 1.5 floor, novelty 1.49 < 1.5 floor — `panelPassed` with news floors verified false. But the panel never saw the drone beat nearest the deaths, the deaths carry no encounter evidence, and the four personas are four model perspectives on one retained summary, not four playtests. No level edit is ordered before encounter evidence lands. The novelty miss (0.01) sits inside observed run variance (see below): re-measure on rerun, do not redesign for it. Independent of fidelity.
- Fidelity: FAIL on three independent grounds (re-derived by running the fixed `fidelityGate` with confirmed=[]): unsupported=2 rows (>1 allowance: the comeback row firmly unsupported at 0.94 plus the Geneva row unsupported at 0.26), needsHuman holds 4 keys (element:rapid clock plus 3 rows), and mechanic 2.32 < 2.5 gate. Everything else passes (3 shown including both signature elements, 0 contradicted, no signature element missing/unsupported, universe shown, visual 3.21, flaw none). No stored `human.json` exists for level-24, so all four needs-human keys are genuinely unconfirmed.
- Overall: ITERATE/REWORK stands, on quality-panel math (uncorroborated cheap + fairness floor), fidelity (unsupported rows + mechanic + needs-human), and partial route coverage. No level edit is ordered before the evidence lands — not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=2.0 fair=1.5 read=2.3 novel=1.5 pace=2.0 theme=2.2 flaw=cheap -> iterate
- Vic (contra veteran): fun=2.1 fair=1.4 read=2.2 novel=1.5 pace=2.0 theme=2.4 flaw=none -> iterate
- Sam (casual newcomer): fun=2.1 fair=1.4 read=2.0 novel=1.5 pace=2.0 theme=2.3 flaw=cheap -> iterate
- Lex (speedrunner): fun=2.3 fair=1.5 read=2.2 novel=1.5 pace=2.2 theme=2.4 flaw=cheap -> iterate
- Means: fun=2.14 fair=1.43 read=2.17 novel=1.49 pace=2.06 theme=2.31
- News floor failures: novelty mean 1.49 < news floor 1.5 — recorded as calibration context, not a design defect (see below)
- Novelty repeatability: per-persona novelty is 1.46/1.48/1.47/1.54 — a 0.08 spread against a 0.0125 miss, with Lex passing the floor individually — from a single retained capture generation and one panel pass. Worse for a bare threshold read, the build record (`docs/level-builds/24.md:63`) logged novelty 1.51 (a pass) on this same level at an earlier loop: a 0.02 swing across captures crosses the threshold both ways. The 1.49 is a measurement with uncertainty; it re-measures on the evidence rerun and carries no fix entry.
- Judged-beat coverage (old `selectPanelShots(..., 4)` over the 6-beat manifest): re-running the old selection deterministically yields 01-opener, 02-setpiece-countdownBoard, 03-hazard-laser, 06-finale — the 04-hazard-drone beat (x=2600, nearest the x=2727/2977 deaths) and the 05-hazard-boss beat (x=6400, the signature encounter) were omitted from every panel pass. Stored evidence records no per-pass subset or per-beat judgments (`evidenceSeen` did not exist). The rerun batches all 6 beats. The panel that voted `cheap` 3/4 never saw the death-cluster beat.

## News fidelity

- Brief: Level 24 — Clutch Crown (news-to-level, boss theme)
- Gate: FAIL (three independent grounds: unsupported=2, needs-human=4, mechanic 2.32 < 2.5 — see re-derivation)
- Element "Champion King" [signature]: shown (noul=0.89)
- Element "chessboard ranks" [signature]: shown (noul=0.72)
- Element "knight piece": shown (noul=0.97)
- Element "rapid clock": faint (noul=0.46) — brief maps it to "plate + beat"; the countdownBoard setpiece beat (x=900) WAS in the judged subset, so a human read of the retained still can settle it
- Row "Sindarov's attacking victory over the reigning star decided the showdown" [signature] -> supports (confidence=0.26) — needs-human; and the encounter itself (boss x=6400) is gameplay-unverified
- Row "He overturned a 2.5-point deficit on the final day" -> unsupported (confidence=0.94) — firm, not a needs-human item; but the enrage mechanic is temporal (faster, shorter-telegraph leaps + tint at half HP) while the boss was never reached in gameplay (maxX 6020 < 6400) and the boss beat was never judged: frozen staged stills cannot show it either way. Evidence-first remedy below, not a bare redesign order.
- Row "18 rapid games over three days against four elite rivals" -> supports (confidence=0.49) — needs-human
- Row "The Geneva title match against Gukesh is next" -> unsupported (confidence=0.26) — needs-human AND unsupported; its mechanic (NEXT_LEVEL 1, outside the campaign chain per the brief) is not observable in-level at all
- Space Chicken universe: shown (noul=0.92)
- Needs human: element:rapid clock; row:Sindarov's attacking victory over the reigning star decided the showdown; row:18 rapid games over three days against four elite rivals; row:The Geneva title match against Gukesh is next
- No stored `evidence/level-24/human.json` exists: all four keys await a first named-human read, not a re-read.

## Audit re-derivation: uncorroborated cheap, firm-but-unverifiable comeback verdict, partial route

- Gate math (fixed functions, verified by running them read-only): `panelPassed` with news floors returns false (flawless 1<3, structural 3, fairness 1.43<1.5, novelty floor miss). `fidelityGate` with confirmed=[] returns passed:false with unsupported=2 and needsHuman=[element:rapid clock + 3 rows]; the mechanic clause (2.32<2.5) fails independently. `selectPanelShots` over the 6-beat manifest returns opener/setpiece-countdownBoard/hazard-laser/finale. No files were written by this verification.
- Withdrawn prescription: the stored rank-1 fix ("Fix the clustered death spot: widen the tell window...") is withdrawn as a level edit — it prescribes a tell change for deaths with no cause/phase/visibility data, evidenced by a drone beat the panel never saw, 127–377px from deaths whose positions are themselves 150ms-poll approximations. It returns as INV-1: encounter evidence first, named-encounter prescription only if the capture attributes the deaths.
- Route correction: gate-open at x=6020 is recorded as a partial route, not a near-complete one — the 530px from maxX to crownX 6550, the boss arena, and the crown approach are unverified, and the two finale-area stills are staged/teleported (x > maxX).
- Loop note: loop 4 with the limit reached stands as the design-revision count. Under the fixed `nextRevisionLoop`, the evidence rerun below runs against an unchanged level, so it is calibration capture, not loop 5 — it must not advance the loop or lower the gate.

## Investigation (open)

- INV-1 (death-cluster encounter evidence — must precede any cheap fix): what killed the pilot at x=2727 and x=2977 (250px apart, middle rank before the x=3100 checkpoint)? Two retained deaths with no hazard ID, cause, phase, input history, telegraph visibility, or replay footage; the nearest beat (04-hazard-drone, x=2600) was never shown to the panel; `hazardTypesSeen` is a staged+gameplay union that cannot attribute.
  - Smallest next capture: a bounded rerun under the fixed generator with exact death/cause events, visible telegraph duration, hazard phase, checkpoint replay time, input history, and encounter stills across x=2600–3100, re-judged with the full 6-beat sheet. Prescribe hazard/tell changes only if that capture attributes both deaths to a named encounter with cause data.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/24.md node scripts/level-critic.mjs 24`
- INV-2 (boss-encounter evidence for the comeback row and mechanic fidelity — must precede any redesign): does the final-day swing read when the fight is actually captured? The comeback row is firmly unsupported (0.94), but the enrage mechanic (faster, shorter-telegraph leaps + enrage tint at half HP, comet pod at the arena door) is temporal: the boss was never reached in gameplay, the boss beat was never judged, and frozen staged stills cannot show phase behavior. Mechanic 2.32 < 2.5 trails on the two unsupported rows.
  - Smallest next capture: boss-fight gameplay evidence across the HP threshold (both phases, measured telegraph durations, enrage tint, comet pod, full-beat re-judge). If the row still reads unsupported with the fight captured, apply the explicit design remedies in fix rank 2 (deficit legibility, enrage readability, Geneva legibility) — one bounded change with measurable acceptance, not a rebuild.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/24.md node scripts/level-critic.mjs 24`
- INV-3 (the 4 needs-human keys — part of the gate block): do element:rapid clock (faint 0.46, judged subset included its countdownBoard beat) and the 3 low-confidence rows (0.26/0.49/0.26) read as shown/supports to a named human reviewer? No stored human.json exists; nothing is confirmed.
  - Smallest next capture: a human opens the retained stills, confirms or overrides each of the 4 keys, and records the judgments in human.json with reviewerType human and per-claim shot basis; then the same bounded rerun re-judges the full beat sheet. Order no level edit before the confirmations land.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/24.md node scripts/level-critic.mjs 24`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap → investigation, NOT a level edit] (investigation — suspected, uncorroborated) owner: rerun + human reviewer (docs/level-reviews/evidence/level-24/human.json)
   - Evidence: 3/4 personas named "cheap" and repeatedFlaws holds cheap across 2 pilot runs, but the two retained deaths (x=2977, 2727; 150ms-poll approximations 250px apart before the x=3100 checkpoint) carry no hazard ID, cause, phase, input history, telegraph visibility, or replay footage. Evidence-quality exception to `isCorroboratedFlaw`: the votes plus the repeat would satisfy the coded rule, but the repeat is a label intersection without retained per-run telemetry, so the claim stays uncorroborated pending the INV-1 capture; the nearest beat (04-hazard-drone.jpg, x=2600) was deterministically omitted from every panel pass by the old selectPanelShots(..., 4) (judged: opener/setpiece-countdownBoard/hazard-laser/finale); hazardTypesSeen is a staged+gameplay union (includes "boss" though maxX 6020 < boss x=6400) and attributes nothing.
   - Smallest fix: Bounded encounter-evidence capture only — rerun the fixed generator for exact death/cause events, telegraph duration, hazard phase, checkpoint replay time, input history, and encounter stills across x=2600–3100 with the full 6-beat sheet judged. Prescribe hazard/tell changes only if that capture attributes both deaths to a named encounter with cause data.
   - Recheck: Re-run the full critic with NEWS_BRIEF; both deaths attribute to a named encounter with cause/event basis (or a named capture defect replaces this investigation) before any "cheap" level edit is ordered.
2. [unsupported-comeback + mechanic-fidelity → evidence-first remedy] (fidelity — firm verdict on missing behavior evidence) owner: rerun first, then skills/level-creator/SKILL.md only if the re-judge still fails
   - Evidence: comeback row firmly unsupported (0.94, not a needs-human item) and mechanic 2.32 < 2.5 gate, but the judged evidence cannot show the behavior: the boss was never reached in gameplay (maxX 6020 < boss x=6400), the 05-hazard-boss beat was omitted from every panel pass, and the enrage mechanic (faster, shorter-telegraph leaps + tint at half HP) is temporal — frozen staged stills cannot prove phase behavior either way. The Geneva row's mechanic (NEXT_LEVEL 1, outside the campaign chain per the brief) is additionally unobservable in-level.
   - Smallest fix: Capture first (INV-2: boss-fight gameplay across the HP threshold with measured telegraph durations, enrage tint, comet pod, full-beat re-judge). If the comeback row still reads unsupported with the fight captured, apply explicit design remedies, one bounded change: (a) deficit legibility — the countdownBoard/scoreboard narrates the 2.5-point deficit-to-swing arc in-level; (b) enrage readability — enrage tint plus a measurable tell window before every swing-phase leap; (c) Geneva legibility — a finale "road to Geneva" beat (plate/text/beacon) so the next-match fact is observable without leaving the campaign chain.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the comeback row re-judges supports on captured fight evidence and mechanicMean >= 2.5, or a named defect with shot/event basis (not a stock template) replaces this entry.
3. [needs-human] (fidelity — part of the gate block) owner: human reviewer (docs/level-reviews/evidence/level-24/human.json)
   - Evidence: element:rapid clock is faint (noul=0.46) and rows "Sindarov's attacking victory..." (0.26), "18 rapid games..." (0.49), "The Geneva title match..." (0.26) sit under the 0.8 confidence gate; no stored human.json exists for level-24, so all four keys are unconfirmed. The fixed fidelityGate with confirmed=[] returns passed:false with needsHuman=[4 keys].
   - Smallest fix: A named human opens the retained stills, confirms or overrides each of the 4 keys, and records the judgments in human.json with reviewerType human and per-claim shot basis.
   - Recheck: Re-run the full critic with NEWS_BRIEF; needsHuman must be empty for the fidelity gate.
4. [novelty-floor → calibration, NOT a design fix] (quality — measurement uncertainty) owner: rerun (no level edit)
   - Evidence: novelty mean 1.49 misses the 1.5 floor by 0.0125 while per-persona novelty spans 1.46–1.54 (Lex passes individually) and the build record logged 1.51 (pass) on this same level at an earlier loop — threshold-crossing variance across captures from a single retained capture generation and one panel pass.
   - Smallest fix: None — re-measure novelty on the INV-1/INV-2 evidence rerun with full beats recorded; order no design change for a 0.01 miss inside observed variance.
   - Recheck: Re-run the full critic with NEWS_BRIEF; novelty re-measures with its per-persona spread and capture generation recorded, and any persistent shortfall names the repeated decision/route evidence behind it.

Evidence: docs/level-reviews/evidence/level-24/shots.json

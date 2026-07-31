# Portrait polish loops 13–14

## Loop 13 — heroic composition and readable faces

Self-critique:

- The previous portraits shared a mostly upright bust crop, so weapons and poses
  did not separate all nineteen generals quickly enough at hand-card size.
- Faces had gradients and features, but too few large value planes to hold up at
  the compact render size.
- Repainting every procedural portrait during each board frame would be an
  avoidable animation cost once the art became more detailed.

Changes:

- Added nineteen per-general action profiles with distinct camera crops, torso
  lean, shoulder line, weapon diagonal, scale, offset, and signature gesture.
- Added an explicit five-plane face pass: far temple, brow-to-nose wedge, near
  cheek, jaw, and chin/bounce planes. Expression geometry now uses stronger
  brow, eye, and mouth extremes.
- Added heroic back silhouettes, broken material highlights, foreground
  atmosphere, and compact signature silhouettes.
- Added a 96-entry LRU portrait-surface cache. Static art is rendered at 1.75x
  for hand cards and 2x for detail cards; live selection, shield, stats, and
  borders remain outside the cache.

## Loop 14 — compact restraint and inspector hierarchy

Self-critique:

- The compact signature silhouette initially used 0.78 alpha and competed with
  the real weapon pose, producing a doubled, overdrawn foreground.
- The detail inspector needed the portrait to read before card metadata while
  keeping its nonblocking 318px footprint.

Changes:

- Reduced the compact signature accent to 0.56 alpha so it remains a fast
  recognition cue without becoming a second opaque weapon.
- Increased art allocation to 58% on hand cards and 52% in preview cards, and
  enlarged the pinned preview to 158x224 while preserving the 318px panel.

## Verification

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 32/32 passing
- `npx eslint public/systems/board-ui/index.js public/systems/board-ui/board-ui.test.mjs`: clean
- Gallery contracts verify nineteen unique action angles/signatures, five face
  planes, material/atmosphere passes, cache behavior, and inspector proportions.
- Visual browser capture was attempted, but no in-app browser target was
  available in this agent session.

## Loop 15 — art5 gallery facial anatomy pass

First gallery critique (parent IAB, `art5-mid`):

- Compared with art4, Liu Bei, Zhuge Liang, Sima Yi, Cao Cao, Sun Quan, and
  Zhou Yu were distinguishable without their labels.
- The new six-family feature construction removed the repeated rounded
  triangular nose and puppet-mouth read.
- The compact face guard remained intact on Guan Yu's crescent blade and Sun
  Shangxiang's bow, with no excessive silhouette clipping and console output 0.
- Dian Wei and Zhang Liao still had lower-face ink that was too thick and long.
  Wei eyes and nose bridges needed a very small warm focal accent.

Changes after the first critique:

- Added six nose/philtrum/mouth families plus individual overrides for Cao Cao,
  Sima Yi, Dian Wei, Zhang Liao, Sun Quan, Zhou Yu, and Huang Gai.
- Reattached moustaches below the philtrum instead of sharing a nose-height
  starting line. Shortened Dian Wei's square beard and Zhang Liao's trim beard.
- Reduced Dian Wei's mouth/outline scale to 0.80/0.82 and Zhang Liao's to
  0.83/0.84.
- Replaced constant-width arm strokes and rectangular hands with tapered
  forearms, a curved palm/thumb pad, three knuckle arcs, and a visible grip.
- Desaturated and lowered the rainy Wei background while selectively increasing
  face and weapon saturation. Added a sub-pixel warm catchlight and nose-bridge
  key to Wei portraits.
- Reduced Dian Wei and Huang Gai camera crop from 1.19/1.18 to 1.11.
- Kept the verified 1.28x1.46 compact face exclusion mask unchanged.

Final verification:

- Second gallery critique (parent IAB): Dian Wei and Zhang Liao's exaggerated
  lower-face lines were visibly reduced, Wei facial focus improved, console
  output remained 0, and the art5 loop passed.
- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 37/37 passing
- `npx eslint public/systems/board-ui/index.js public/systems/board-ui/board-ui.test.mjs --max-warnings=0`
- Portrait cache hit/miss/paint contracts remain covered.

## Loop 16 — interaction micro-motion

- Added per-instance hand pose state driven by an exact critically damped step.
  Lift, scale, fan angle, pointer tilt, hover mix, and sweep converge over a
  145ms response without frame-rate-dependent lerps.
- Frame delta is clamped to 34ms, preventing a background-tab return from
  throwing cards past their target. Reduced-motion snaps all motion fields and
  clears their velocity immediately.
- Hover follows pointer position with at most ±2.5 degrees of tilt. A restrained
  art and frame light sweep is drawn after the cached portrait, keeping all
  dynamic feedback outside the portrait surface cache.
- Inspector previews slide 28px while fading/scaling in over 145ms. Closing
  clears `inspection` before a 120ms visual settle, so panel and close hitboxes
  disappear immediately.
- Hand, board, and end-turn presses use a 96ms compression/rebound curve. The
  pulse starts on pointer down but contains no dispatch or activation call;
  gameplay activation remains solely on the existing pointer-up path.
- Hand hit regions remain on the original 116x166 fan geometry, independent of
  animated lift, scale, or tilt. First-click inspection, five-card board slots,
  presentation locks, and static portrait caching remain unchanged.

Verification:

- Parent IAB capture passed at 0/60/150/220ms: the card settled from its fan
  origin into lift/scale, the panel became fully readable after slide/fade, and
  pointer transfer between overlapping Sun Shangxiang and Zhou Yu cards changed
  lift and panel side without a stale or duplicate preview. Target selection,
  close button, Escape, and console output 0 also passed.
- Motion convergence, dt clamp, reduced-motion snapping, inspector lifecycle,
  immediate hitbox release, visual-only press behavior, static hand targets,
  and cache separation are covered.
- `node --test public/systems/board-ui/board-ui.test.mjs`: 42/42 passing
- `node --check` and ESLint: clean

## Loop 17 — stale hover after hand reflow

Problem:

- After a second-click card play, the old pointer hover retained a hand index.
  When the remaining hand reflowed beneath the stationary pointer, that index
  resolved to a different instance and opened its inspector without intent.

Fix:

- The player hand now has an instance-identity signature. Any draw, removal, or
  reorder invalidates passive hand hover and its preview transition.
- Passive hand hover remains blocked until logical pointer coordinates travel
  at least 0.75px. Same-coordinate synthetic pointermove events cannot rearm it.
- Explicit pointer-up clicks remain unchanged, keyboard hover carries a separate
  input source, and touch continues to use the existing click/drag path.
- The guard does not depend on reduced-motion and does not alter animated pose,
  static hit geometry, portrait caching, or presentation locks.

Verification:

- Added regression coverage for identity reflow, sub-threshold pointer events,
  real pointer rearming, keyboard source separation, and explicit click-only
  activation.
- `node --test public/systems/board-ui/board-ui.test.mjs`: 44/44 passing
- `node --check` and ESLint: clean

### Follow-up — resolved selection prompt priority

- Selection instructions now carry a `selection-prompt` purpose, distinct from
  invalid, combat, card-play, and FX feedback.
- Completing or cancelling a selection clears only that prompt. `attack:start`
  also clears it defensively before publishing the combat accessibility cue.
- Invalid-target feedback and all newer result messages remain untouched, so a
  stale “select an enemy” instruction cannot outlive the resolved attack.
- Regression suite: 45/45 passing; syntax and ESLint clean.

### Follow-up — player vital gem occlusion

- The selected/hovered hand overlay still draws above the player portrait, but
  the health and active armor gems are now composited once more at the very end.
- Each gem receives a small opaque protective backing so a raised card cannot
  turn health `18` into a misleading `11`.
- The overlay draws no hero artwork and registers no hit region; card emphasis,
  static hitboxes, damage latches, and shield/health timing remain unchanged.
- The refined composition contract remains covered in the 45/45 passing suite.

## Loop 18 — sparse-hand hero-safe layout

- One- and two-card hands now use a dedicated left-side fan center at logical
  x=490. A single card sits at x=490; two cards retain the existing 76px spread
  at x=452/528 and the existing shallow fan tilt.
- This keeps the card top, cost gem, portrait, and name clear of the player hero,
  health/armor gems, and right-side mana rail before hover lift. Because the
  sparse cards lie left of board center, their inspector continues to open on
  the right.
- Three-, four-, and five-card fan coordinates are byte-for-byte equivalent to
  the previous layout. Static 116x166 hit targets, hover springs, selected-card
  overlay order, and final vital-gem overlay are unchanged.
- Regression geometry covers one- and two-card hands at 979x856 and 768x720,
  including at least 8 CSS pixels of separation from the opposite inspector,
  player portrait, and protected armor gem.

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 47/47 passing
- `npx eslint public/systems/board-ui/index.js --max-warnings=0`

## Loop 19 — art v6 depth, grip, and material pass

- All nineteen action profiles now carry weapon-local grip contacts. A new
  foreground grip pass paints cool far fingertips, a warm palm, four separated
  hooked fingers, and an opposing thumb after the shaft, so the weapon remains
  visible through the finger gaps instead of floating beside a mitten.
- Face rendering now progresses through value masses, five skull planes, sparse
  warm/cool skin microstructure, then features. Detail portraits add capped
  cheek pores and tapered beard roots; compact portraits retain only the broad
  nose, cheek, and jaw temperature cues.
- Silk gains long directional fibers, leather gets sparse pores and creases,
  raw iron receives sharp cross-light scratches, lacquer has a narrow glaze,
  and wood receives curved grain rings. Compact counts are held to two or three
  marks per material.
- A fog shelf and broken back rim separate the subject from the scene. Two
  compact or five detail foreground fragments establish a third depth plane.
- The portrait surface key and deterministic seed advance to `paint-v6`; the
  96-entry LRU and dynamic-overlay separation are unchanged.

## Loop 20 — defensive-rule silhouette and named lifecycle feedback

- `수호` now uses a warm horizontal battlement/gate silhouette at the card
  footing. `방패` remains a cool cyan vertical diamond plus active frame glow
  or gray cracked spent state, preventing the two defensive rules from sharing
  the same shield-shaped visual language.
- `card:play` and `minion:death` feedback extracts names from the rules engine's
  direct and nested payload shapes. Named events read `관우 · 전장에
  나섰습니다.` or `장비 · 쓰러졌습니다.`; absent names retain the existing
  localized fallback.
- Inspector keyword definitions and active/spent shield wording are unchanged.

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 48/48 passing
- `npm.cmd run lint`: clean
- Browser gallery capture remained blocked by the active browser-tab policy;
  parent-side automated checks independently reproduced the green suite.

## Loop 21 — cached tactile tabletop depth

- The Red Cliffs tabletop now has four code-only, transparent depth planes:
  recessed wood/bronze relief, paired-shadow strategic-map contours, pre-baked
  lantern and brazier light, and a directional silk/varnish sheen.
- Oversized neutral bronze corner brackets, rivets, deterministic rail wear,
  an inset playmat lip, and cloud-and-wave side carvings establish near, middle,
  and far material planes without using faction logos or external assets.
- Map relief moves at most 3.2 logical px horizontally and 1.8 px vertically
  with the pointer. The sheen responds in the opposite direction; reduced
  motion fixes both at zero offset and a stable half-strength highlight.
- Every gradient and texture is rasterized exactly once during board
  initialization. The unmoving wood/bronze plane is baked into the base
  background immediately, leaving only three cached transparent blits in the
  frame loop. All new layers render before card hit regions are rebuilt. No
  gameplay hitbox, card geometry, inspector footprint, or event-owned combat FX
  is changed.
- Structural regression coverage verifies exact parallax bounds, reduced-motion
  snapping, all four cached surfaces, zero gradient allocation in the dynamic
  environment function, and zero environment hit-region registration.

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 49/49 passing
- Browser discovery returned no available backend in this agent task. Parent
  should visually check the 979x856 and 768x720 live board, especially corner
  fixture weight, map-contour contrast, and card/inspector separation.

## Loop 22 — bounded backing store, portrait cache, and idle cadence

- Backing-store dimensions now follow the actual CSS stage size multiplied by
  the clamped device pixel ratio, with independent X/Y render transforms and a
  0.5–2.0 bound. At DPR2 the 979x856 host renders 1958x1100 instead of
  2730x1536 (about 1.95x fewer pixels); the 768x720 host renders 1536x864
  (about 3.16x fewer pixels). Logical coordinates, CSS geometry, and hitboxes
  remain 1365x768.
- Portrait cache identity now uses stable semantic profiles instead of animated
  0.1px dimensions: HAND 96x66.4, BOARD 103x86, and DETAIL 131x117.
  Development-gallery crops are explicitly isolated as HAND 96x66.4 and
  GALLERY 250x126. All profile aspect ratios remain within 0.008 of their
  target draw rectangles.
- A ten-card, 41-step hover sweep produces ten unique portrait keys rather than
  hundreds. The full nineteen-card production plus gallery warm set has 95
  distinct keys, fitting inside the existing 96-entry LRU without warm-cache
  eviction.
- Time-critical combat, toast, pointer, selection, inspector, thinking, press,
  and hand-spring states still request the next animation frame immediately.
  Ambient-only boards redraw every 100ms; reduced-motion idle boards stop
  scheduling entirely until render, event, resize, keyboard, or pointer
  invalidation. Expired press records are pruned even if their card left play.
- Board frames now reuse the most recently rendered state snapshot. The
  expensive rules-engine getter is used only for initial fallback and once at
  an event boundary, preventing a full game-state deep clone on every board
  frame without leaving event handlers on a stale pre-action snapshot.
- Inspector wrapping and keyword measurement are held in a bounded 64-entry
  LRU, removing repeated `measureText` work during a stationary preview.

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 52/52 passing
- scoped board-ui ESLint: clean
- Parent should run the fake-2D lifecycle harness and full repository regression
  because this agent's browser backend remains unavailable.

## Loop 23 - art7 individual likeness and painterly depth

- All nineteen generals now have an independent art7 sitting profile spanning
  brow arch/break, eye set/width, gaze, nose length/ridge, mouth width/tilt,
  jaw occlusion, skin roughness, scar, wrinkle map, warm/cool pigment, and hair
  edge softness. Full-profile fingerprints are 19/19 unique.
- A cached anatomical brush pass follows the existing five value planes. Seven
  broad strokes establish temple, socket, nose, cheek, nasolabial, jaw, and
  chin depth in HAND; DETAIL expands deterministically to 19-30 total strokes.
  Skin pores vary with roughness and remain omitted from compact portraits.
- Hair and beard now have separate soft/crisp edge response, root occlusion,
  flyaway, and rim behaviour. Silk, lacquer, raw iron, leather, wood, and
  feather each receive a unique softness/specular/occlusion/breakup response.
- Desaturated far lights and aerial haze create background depth of field. A
  restrained blurred near-fragment pass separates foreground weapon/hand from
  the scene. The compact gaze, brow interruption, iconic scar, nose ridge, and
  weapon signature are repainted after near DOF so the 96x66.4 HAND crop keeps
  its silhouette and tactical read.
- Every new stroke uses seeded noise and is baked only by
  `paintPortraitUncached`. The cache revision advances to `paint-v7`; semantic
  HAND/BOARD/DETAIL/GALLERY profiles, the 96-entry LRU, the 95-key full-roster
  warm set, adaptive backing store, and idle scheduler remain unchanged.

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 56/56 passing,
  including a balanced fake-2D paint of all 19 HAND and 19 DETAIL surfaces
- scoped board-ui ESLint: clean
- `git diff --check -- public/systems/board-ui`: clean
- Browser rendering remains unavailable in this agent; parent should compare
  the 19-card gallery at HAND and DETAIL sizes before accepting the art pass.

## Loop 24 - inspector glossary normalization

- Inspector content now distinguishes raw combat keywords from `출전`/`유언`
  trigger rows. It removes only an exact `키워드 — 정의` segment from the
  ability copy, leaving every effect, random-target fallback, target condition,
  and fizzle sentence unchanged.
- The normalizer prefers inline or runtime glossary text. If the host omits the
  glossary option, it safely derives only a raw card keyword followed by one
  complete period-terminated glossary sentence; punctuation near-misses remain
  untouched. This covers the production card-data wording even though its
  glossary differs from board-ui's short fallback definitions.
- Pure-keyword cards now omit the `능력` heading and block entirely. Mixed
  cards retain the mechanical effect once and move the definition to its
  `발동 · 키워드` row. Ability-only cards are byte-for-byte unchanged.
- Accessibility narration follows the same normalized ability text but reads
  each visible keyword label and definition exactly once, including the
  runtime `방패 소모` state.
- Layout height no longer reserves phantom ability-line spacing. Font fallback
  extends to 15px and 14px, keyword heading/row gaps tighten by 2px/1px, and
  flavor height matches its actual 17px + 23px cursor advances. At conservative
  Hangul widths of 0.95em and 1.0em, the tallest production card is 전위 at
  352px inside the unchanged 355px budget.

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 60/60 passing
- production integration covers all 19 card-data texts and glossary entries
- scoped board-ui ESLint: clean

## Loop 25 - art8 articulated figures and narrative depth

- The existing nineteen action profiles now drive a second anatomical profile:
  shoulder breadth, ribcage depth, waist taper, independent near/far elbow
  timing and bend, palm foreshortening, grip pitch, finger curl, orbital depth,
  and cheek projection. All 19 figure fingerprints are unique.
- Weapon grip points are transformed through the weapon scale/rotation/offset
  and inverse torso rotation before the arms are painted. Sleeves now bend
  through those real grip targets instead of sharing weapon-class endpoints.
  Near/far palms compress independently; full-detail hands add hooked fingers,
  interphalangeal joints, knuckle marks, and alternating warm/cool depth.
- Robe silhouettes respond to action shoulder slope and figure breadth.
  Clavicle, sternum, ribcage, and armor-bounce planes distinguish scholars,
  archers, rulers, and heavy warriors without changing faction colour grammar.
- A clipped art8 face pass strengthens the orbit, nose cast shadow, projected
  cheek, mouth under-plane, and chin bounce while retaining all art7 identity
  landmarks. A restrained narrative midground adds wakes/rigging, cavalry dust
  and lances, constellation paths, or smoke depth according to each scene.
- All additions remain inside cached portrait painting. The cache revision is
  `paint-v8`; semantic HAND/BOARD/DETAIL/GALLERY buckets are unchanged. The
  full canonical warm set remains 95 keys inside the 96-entry LRU.

Measured ranges:

- shoulder breadth 0.8221-1.2164; ribcage depth 0.8728-1.2400
- near elbow bend 0.0495-0.2000; far elbow bend 0.0491-0.1403
- near palm depth 0.6992-0.8926; far palm depth 0.5738-0.6970
- face orbit depth 0.5624-0.8278; cheek projection 0.7072-0.9039
- fake-2D 19-card HAND/GALLERY cold paint: 38 surfaces in 45.246ms median
  across 7 fresh modules; warm replay median 0.272ms with 38 cache hits,
  0 evictions, 0 non-finite calls,
  and balanced save/restore across 39 contexts

Verification:

- `node --check public/systems/board-ui/index.js`
- `node --test public/systems/board-ui/board-ui.test.mjs`: 65/65 passing
- scoped board-ui ESLint: clean
- production 19 plus token, unregistered, and definition-only fallback
  portraits pass HAND/DETAIL/active/damaged/death uncached regression
- `git diff --check -- public/systems/board-ui`: clean

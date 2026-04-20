# The Legend of Shank

A 2D retro top-down action-adventure built for the browser — NES-Zelda-inspired,
every sprite drawn procedurally, every note of chiptune music synthesized at
runtime. No external assets, no build step for the player, no dependencies at
runtime beyond a browser.

Built as a multi-team parallel-agent project: seven feature teams worked
concurrently on branches, each PR reviewed and squash-merged.

```
 ┌──────────────────────────────────────────────┐
 │  OVERWORLD       [minimap]                   │
 │  ♥ ♥ ♥                    ×00  ×0  ×00       │
 ├──────────────────────────────────────────────┤
 │  .T .. .. .. .. .. T. .. .. T. T. T. T. T.   │
 │                                              │
 │                 🗡                           │
 │       *                    ‖ sign            │
 │  ═══════════════ path ═══════                │
 │       *                                      │
 │       ▞ cave                                 │
 │                                              │
 │  TT TT TT TT TT     TT TT TT TT TT TT TT     │
 └──────────────────────────────────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/IngeniousIdiocy/zelda-like
cd zelda-like
npm install
npm run dev
# → open http://127.0.0.1:5180/
```

Click the canvas once to give it keyboard focus, then press **Enter** to start.

---

## Gameplay

### Controls

| Key             | Action                                |
| --------------- | ------------------------------------- |
| Arrows / WASD   | Move (4-dir)                          |
| Z / J           | Sword                                 |
| X / K           | Use selected item (bomb/bow/boomerang)|
| C / L           | Cycle selected item                   |
| Enter           | Start / pause / confirm dialog        |
| M               | Mute audio                            |

### Walkthrough

1. **Start** — title screen → Enter. You spawn in the overworld center room
   (`ov_2_2`) with 3 hearts and no sword.
2. **Find the sword** — walk down-left to the cave entrance (stone archway).
   Inside, walk up to the old man to trigger his dialog. Press Z twice to
   close it and receive the sword.
3. **Walk back out** — step onto the stairs tile to warp back to the overworld.
4. **Explore** — the overworld is a 4×4 grid of 16 screens. Walk off any edge
   (through the tree openings) to cross into a neighbour room. Bushes can be
   cut with the sword, enemies drop rupees / hearts / bombs / keys.
5. **Combat** — sword swings damage enemies in front of you. At **full hearts**
   the sword fires a beam projectile.
6. **Dungeon 1** — from the start, go north to `ov_1_2` and find the stairs
   tile that warps you into the dungeon.
7. **Dungeon path** — entry → corridor → key room (chest with a key) →
   corridor → pre-hall (locked boss door, consumes the key) → boss room.
8. **Boss fight** — Aquamentus shoots 3-way fireballs. ~12 sword hits to kill.
   On death, heart container drops and the treasure-room door unlocks.
9. **Triforce** — walk onto it in the treasure room → victory.

### Dungeon Map

```
               [d1_keyroom]         ← chest → key
                    │
[d1_combat1] ── [d1_h1] ── [d1_entry]   ← overworld stairs arrive here
                    │
               [d1_h2]
                    │
[d1_combat2] ── [d1_prehall]         ← locked door, needs key
                    │
               [d1_boss]              ← Aquamentus (3-way fireball)
                    │
             [d1_treasure]            ← Triforce = victory
```

---

## Deployment

### Local dev server (hot reload)

```bash
npm run dev            # vite on http://127.0.0.1:5180
```

### Production build (static files)

```bash
npm run build          # outputs to ./dist
npm run preview        # serves ./dist locally to verify
```

The `dist/` folder is fully self-contained static HTML + JS — no backend. Host
it anywhere that serves static files (GitHub Pages, Netlify, an `nginx` block,
a `python3 -m http.server`). Every asset is generated at runtime: tiles are
drawn procedurally, music is synthesized via Web Audio, the font is a 5×7
bitmap baked into `src/engine/renderer.js`. No textures or audio files to bundle.

### Browser requirements

- ES2020 modules (any modern Chrome/Firefox/Safari/Edge).
- Web Audio API (music + SFX start on the first keypress to comply with
  browser autoplay policies — no action required from the user).
- Canvas 2D with `imageSmoothingEnabled = false` for crisp pixels.

---

## Software Architecture

### Module layout

```
                        ┌────────────────────┐
                        │   contracts.js      │  ← single source of truth:
                        │ (tile IDs, typedefs,│    no runtime code, only
                        │  DIR/EVT/ITEM enums)│    constants + JSDoc types
                        └──────────▲─────────┘
                                   │ imported by every other module
   ┌──────────────┬────────────┬──┴────┬────────────┬──────────────┐
   │              │            │       │            │              │
┌──┴────┐ ┌───────┴──┐ ┌───────┴──┐ ┌──┴────┐ ┌─────┴───┐ ┌────────┴──┐
│engine/│ │ world/   │ │entities/ │ │combat/│ │  ui/    │ │  audio/   │
│       │ │          │ │          │ │       │ │         │ │           │
│ loop  │ │ world    │ │ player   │ │proj-  │ │ hud     │ │ audio     │
│ input │ │ rooms    │ │ enemies/ │ │  ectile│ │ dialog  │ │ tracks    │
│render │ │ tileset  │ │  octorok │ │bombs  │ │ title   │ │           │
│camera │ │          │ │  moblin  │ │pickups│ │ pause   │ │           │
│events │ │          │ │  keese   │ │chest  │ │ gameover│ │           │
│ rng   │ │          │ │  boss    │ │system │ │ victory │ │           │
│       │ │          │ │  oldman  │ │(glue) │ │         │ │           │
└───────┘ └──────────┘ └──────────┘ └───────┘ └─────────┘ └───────────┘
                                                                 │
                                                                 │
                         ┌───────────────────┐                   │
                         │     main.js       │ ←─────────────────┘
                         │  (integration)    │
                         │  wires everyone   │
                         │  via events bus + │
                         │  factory adapters │
                         └───────────────────┘
```

Every module depends only on `contracts.js` plus files inside its own
directory. This lets seven parallel teams build concurrently without touching
each other’s files. `main.js` is the only place where subsystems meet.

### The event bus — how subsystems talk

`engine/events.js` is a tiny pub/sub. Every cross-subsystem signal flows
through it — no direct imports between features.

```
Player ──emit('PLAYER_ATTACK' {x,y,w,h,dir,damage})──►  main.js bridge
                                                             │
                                                    (re-emits lowercase)
                                                             ▼
                                                        Combat system
                                                             │
                                                 ┌───────────┴───────────┐
                                                 ▼                       ▼
                                           damage enemies          cut bushes
                                                                   (replaceTile)

Player ──emit('PLAYER_USE_ITEM' {item,x,y,dir})──►  main.js bridge
                                                             │
                                                             ▼
                                                        Combat system
                                                             │
                                                             ├─► spawn bomb / arrow / boomerang
                                                             └─► decrement state.bombs/arrows

Enemy ──emit('enemy_killed' {kind,x,y})───────────────────►  Combat
                                                             │
                                                             └─► RNG → spawn pickup drop
                                                                       (rupee/heart/key/bomb)

Pickup ──emit(EVT.ITEM_PICKED {item,value})───────────────►  (any listener)
                                                              state mutated by the pickup
                                                              itself on touch (rupees++, etc.)

NPC    ──emit(EVT.DIALOG_OPEN {text, onClose})────────────►  UI/Dialog system
                                                             │
                                                             ├─► state.mode = 'dialog'
                                                             │    typewriter animation
                                                             └─► on dismiss → onClose() → hasSword=true

World  ──emit(EVT.ROOM_CHANGED {room, entryEdge})─────────►  Audio  (swap music track)
                                                          ►  main   (flag visited room for minimap)

(anywhere) ──emit(EVT.SFX, 'rupee' | {id:'rupee'})────────►  Audio  (plays SFX; accepts both shapes)
```

### Game loop

`engine/loop.js` wraps RAF with a clamped `dt`. `main.js` drives:

```
                 requestAnimationFrame
                          │
                          ▼
                 ┌────────────────────┐
                 │     update(dt)     │
                 └──────────┬─────────┘
                            │
   ┌────────────────────────┼────────────────────────┐
   │                        │                        │
   ▼                        ▼                        ▼
audio.resume()          ui.update(dt,             input.endFrame()
on first key            input, world)             clears *Pressed
                                                  edge flags
                            │
             mode = 'playing'? ──────────┐
                            │yes          │no (title/paused/
                            ▼             │ dialog/gameover)
                 world.update(dt)         │
                   ├─ entities.update     │
                   ├─ filter dead         │
                   └─ player-on-warp      │
                                          │
                 checkEdgeTransition() ◄──┤ (skipped when paused/etc.)
                                          │
                 camera.follow(player)    │
                            │             │
                            ▼             ▼
                 ┌──────────────────────────────┐
                 │          render()            │
                 └──────────────┬───────────────┘
                                │
                                ├─► renderer.clear()
                                ├─► beginWorld(camera)      (scale ×2 + HUD offset + cam translate)
                                │       drawRoomTiles()
                                │       entities sorted by y.render()
                                │       player.render()
                                │   endWorld()
                                └─► ui.draw(ctx, world)      (hud + dialog / pause / gameover overlay)
```

### Contracts-first design

`src/contracts.js` is the API every team agreed on before writing a line of
implementation. It defines:

- **Geometry constants** — `TILE=16`, `ROOM_W=16`, `ROOM_H=11`, `SCREEN_W`,
  `SCREEN_H`, `HUD_H`, `VIEW_SCALE=2`, `CANVAS_W=512`, `CANVAS_H=448`.
- **Tile IDs** (`T.GRASS`, `T.TREE`, `T.BRICK`, `T.DOOR_LOCKED_N`, …) with
  `isSolidTile(id)` as the single authority on collision.
- **Direction enum** `DIR.UP/DOWN/LEFT/RIGHT` + `DIR_VEC` lookup.
- **Event names** `EVT.ENEMY_KILLED`, `EVT.ROOM_CHANGED`, `EVT.DIALOG_OPEN`,
  `EVT.SFX`, etc.
- **JSDoc typedefs** for `Entity`, `Room`, `World`, `GameState`, `EventBus`,
  `InputState` — the shapes every module must conform to.
- **Utility** `aabb(a, b)`, `clamp(v, lo, hi)`, `px2tile(p)`, `tile2px(t)`.

### World / rooms / spawns

```
createWorld({ events, state, player })
    │
    ├── .rooms         Map<id, Room>   (16 overworld + 9 dungeon + 1 cave)
    ├── .room          current Room
    ├── .entities      Entity[]         (includes player)
    ├── .tileAt(x,y)   px → tile id
    ├── .rectSolid(x,y,w,h,ignore)   ← used by player + enemies
    ├── .spawn(e)
    ├── .registerFactory(kind, fn)   ← enemies/pickups/chest/etc register here
    ├── .replaceTile(tx,ty,id)       ← added by main.js; used for bush cutting
    ├── .enterRoom(id, entryEdge?)   ← warp + spawn entities + emit ROOM_CHANGED
    └── .update(dt)                   ← update entities + reap dead + warp check

Room = {
  id, kind: 'overworld'|'dungeon',
  tiles: Uint8Array(ROOM_W * ROOM_H),
  north?, south?, east?, west?,    ← neighbor room ids
  warps:  [{x, y, toRoom, toX, toY}],
  spawns: [{x, y, kind, opts?}],    ← kind matches a registered factory
  music:  'overworld'|'dungeon'|'boss',
}
```

### Directory structure

```
zelda-like/
├── index.html                 ← single canvas + keyboard-controls strip
├── package.json               ← vite is the only dev dep; zero runtime deps
├── vite.config.js
├── src/
│   ├── main.js                ← integration: boot, factory adapters,
│   │                              event bridges, edge-of-screen transitions
│   ├── contracts.js           ← shared API (constants, enums, JSDoc types)
│   ├── engine/
│   │   ├── events.js          ← Map<string, Set<fn>> pub/sub
│   │   ├── input.js           ← window keydown/up with edge-triggered *Pressed
│   │   ├── loop.js            ← RAF w/ clamped dt
│   │   ├── camera.js          ← follow() with clamp + linear screen transition
│   │   ├── renderer.js        ← canvas 2D + 5×7 bitmap font
│   │   └── rng.js             ← mulberry32 + randInt + pick
│   ├── world/
│   │   ├── world.js           ← createWorld(), registerFactory, rectSolid
│   │   ├── rooms.js           ← allRooms() merges overworld + dungeon + cave
│   │   └── tileset.js         ← drawTile(ctx, id, x, y, {frame}) procedural
│   ├── data/
│   │   ├── overworld.js       ← 4×4 grid = 16 rooms, tile art via makeTiles()
│   │   ├── dungeon1.js        ← 9 dungeon rooms + cave_oldman
│   │   └── items.js           ← shared dialog / sign text constants
│   ├── entities/
│   │   ├── player.js          ← 4-dir move, sword swing, item cycle, invuln
│   │   ├── playerArt.js       ← procedural pixel Link sprite
│   │   └── enemies/
│   │       ├── base.js        ← makeEnemyBase(), contactDamage(), onDeath()
│   │       ├── octorok.js     (rock projectiles)
│   │       ├── moblin.js      (arrows)
│   │       ├── keese.js       (flying, erratic)
│   │       ├── zora.js        (fireball turret)
│   │       ├── stalfos.js     (melee chase)
│   │       ├── boss_aquamentus.js  (3-way fireball, 12 hp)
│   │       ├── npc.js         (old man, dialog → sword grant)
│   │       └── index.js       ← registerEnemyFactories(world)
│   ├── combat/
│   │   ├── projectile.js      ← swordBeam/arrow/rock/fireball/boomerang/explosion
│   │   ├── bombs.js           ← placeable bomb w/ fuse
│   │   ├── pickups.js         ← rupee/heart/fairy/key/bomb/heartContainer/triforce
│   │   ├── chest.js           ← open-on-interact
│   │   └── system.js          ← installCombatSystem(world,events,state) — event glue
│   ├── ui/
│   │   ├── font.js            ← 5×7 bitmap font helper (own copy, no engine dep)
│   │   ├── hud.js             ← level label, minimap, hearts, counters
│   │   ├── dialog.js          ← typewriter text box listening on DIALOG_OPEN
│   │   ├── title.js           ← animated starfield + blinking subtitle
│   │   ├── pause.js           ← inventory grid, cursor, item select
│   │   ├── gameover.js        ← "GAME OVER" + respawn on Enter
│   │   ├── victory.js         ← animated Triforce
│   │   └── index.js           ← createUi(ctx, events, state) dispatches by state.mode
│   └── audio/
│       ├── tracks.js          ← 6 original chiptune tracks (note arrays)
│       └── audio.js           ← createAudio(events) — WebAudio synth + step sequencer
├── test/
│   └── e2e.py                 ← Playwright: 39 assertions, 20 feature areas
└── README.md                  ← you are here
```

---

## Testing

End-to-end Playwright suite at `test/e2e.py`. Run against a local dev server:

```bash
# terminal 1
npm run dev

# terminal 2
python3 -m venv .venv && source .venv/bin/activate
pip install playwright && playwright install chromium
python test/e2e.py
```

The suite asserts 39 behaviors across 20 areas — title flow, 4-dir movement,
all 4 edge transitions, cave → sword grant, sword swing, bush cut, enemy
spawn + kill, rupee pickup, dungeon entry, chest → key, boss fight, triforce
→ victory, pause menu, item cycle, bomb place+explode, game-over+respawn,
mute, audio-context, and room coverage (all 16 overworld + 9 dungeon rooms
defined). Current result: **39/39 pass, 0 page errors.**

---

## Development workflow

This project was built as a fan-out of seven parallel agent teams. Each team
worked in its own git worktree on its own feature branch, opened a PR, and
had the PR reviewed + squash-merged. The workflow:

```
               main
    ╱     ╱    │    ╲      ╲     ╲
   ╱     ╱     │     ╲      ╲     ╲
 feat/  feat/ feat/  feat/  feat/  feat/  feat/
engine  world player enemies combat ui    audio
  │      │     │      │       │     │      │
  PR#1   PR#6  PR#2   PR#3    PR#4  PR#7   PR#5
  │      │     │      │       │     │      │
  └──────┴─────┴──────┴───────┴─────┴──────┘
                       │
                (all squash-merged to main)
                       │
                    feat/integration
                       │
                       PR#8  (main.js + cross-PR bug fixes)
                       │
                     main
```

Contracts-first meant every team only imported from `contracts.js` plus files
inside its own directory, so there were zero file conflicts between PRs. The
only cross-cutting fixes (event-name case, SFX payload shape, player-entity
reposition setter, warp re-trigger suppression) landed in the integration PR.

### Adding a new enemy

1. Drop `src/entities/enemies/my_enemy.js` conforming to the `Entity`
   typedef in `contracts.js`.
2. Export a `createMyEnemy(events, state, opts)` factory.
3. Register it in `src/entities/enemies/index.js` and add its signature to
   the factory adapter block in `src/main.js`.
4. Reference it by kind string in any `Room.spawns[]` entry in the data files.

### Adding a new room

1. Edit `src/data/overworld.js` or `src/data/dungeon1.js`.
2. Call `makeTiles([...])` with an 11-row × 16-col char array and the legend.
3. Add neighbour IDs (`north`/`south`/`east`/`west`) to wire up edge
   transitions.
4. Populate `spawns` with enemies/chests/signs/etc. — any kind that’s
   registered with the world.

### Adding a new event

Add a `EVT.MY_EVENT` constant in `contracts.js` so every team shares the
name. Emit with `events.emit(EVT.MY_EVENT, payload)`. Listen with
`events.on(EVT.MY_EVENT, handler)`. The bus will swallow handler exceptions
and log them rather than break the emit loop.

---

## License & credits

Original chiptune melodies, all pixel art drawn procedurally at runtime, all
code MIT-licensed. Gameplay is inspired by the NES *Legend of Zelda* (1986)
but contains no assets or music from that title.

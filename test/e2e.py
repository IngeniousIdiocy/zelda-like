"""Comprehensive E2E test for the Zelda-like.

Each test is independent; uses window.__zelda to read/write state and teleport
the player, combined with real input events to exercise the actual input/update
pipeline. Any failure is collected and reported at the end.
"""
from playwright.sync_api import sync_playwright
import json, sys, time

RESULTS = []
LOGS = []
ERRORS = []

def ok(name, detail=''):
    RESULTS.append(('PASS', name, detail))
    print(f'  [PASS] {name}  {detail}')

def fail(name, detail):
    RESULTS.append(('FAIL', name, detail))
    print(f'  [FAIL] {name}  {detail}')

def hold(page, key, ms):
    page.keyboard.down(key)
    page.wait_for_timeout(ms)
    page.keyboard.up(key)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 720, 'height': 540})
    page = ctx.new_page()
    page.on('console', lambda m: LOGS.append((m.type, m.text)))
    page.on('pageerror', lambda e: ERRORS.append(str(e)))

    page.goto('http://127.0.0.1:5180/', wait_until='networkidle')
    page.wait_for_timeout(500)
    page.locator('#game').click()

    def S():  # snapshot state
        return page.evaluate('''() => {
          const z = window.__zelda;
          return {
            mode: z.state.mode,
            room: z.state.currentRoomId,
            px: Math.round(z.world.player.x), py: Math.round(z.world.player.y),
            pdir: z.world.player.dir,
            hearts: z.state.hearts, maxHearts: z.state.maxHearts,
            rupees: z.state.rupees, keys: z.state.keys, bombs: z.state.bombs,
            hasSword: z.state.hasSword, hasBow: z.state.hasBow,
            hasBoomerang: z.state.hasBoomerang, hasCandle: z.state.hasCandle,
            selectedItem: z.state.selectedItem,
            entities: z.world.entities.map(e => ({k:e.kind,x:e.x,y:e.y,hp:e.hp,dead:e.dead})),
            flags: Array.from(z.state.flags),
            muted: z.audio.isMuted ? z.audio.isMuted() : false,
          };
        }''')

    def setState(js):
        page.evaluate(f'() => {{ const z = window.__zelda; {js} }}')

    def emit(event, payload):
        page.evaluate('([ev, pl]) => { window.__zelda.events.emit(ev, pl); }', [event, payload])

    def teleport(room, x, y):
        page.evaluate('''([rid, x, y]) => {
          const z = window.__zelda;
          z.world.enterRoom(rid);
          z.world.player.x = x;
          z.world.player.y = y;
        }''', [room, x, y])
        # Wait 2 frames to stabilize
        page.wait_for_timeout(100)

    # ================================================================
    print('\n-- 1. TITLE + START --')
    s = S()
    if s['mode'] == 'title': ok('mode=title at load')
    else: fail('mode=title at load', f'got {s["mode"]}')
    page.keyboard.press('Enter')
    page.wait_for_timeout(200)
    s = S()
    if s['mode'] == 'playing': ok('Enter → playing')
    else: fail('Enter → playing', f'got {s["mode"]}')

    # ================================================================
    print('\n-- 2. PLAYER MOVEMENT (4 directions) --')
    for key, axis, sign, lbl in [('ArrowRight','px',+1,'right'),('ArrowLeft','px',-1,'left'),('ArrowDown','py',+1,'down'),('ArrowUp','py',-1,'up')]:
        b = S()
        hold(page, key, 400)
        a = S()
        delta = a[axis] - b[axis]
        if sign*delta > 5: ok(f'move {lbl}', f'Δ{axis}={delta}')
        else: fail(f'move {lbl}', f'Δ{axis}={delta}')

    # ================================================================
    print('\n-- 3. EDGE-OF-SCREEN ROOM TRANSITIONS (N/S/E/W) --')
    # Go west from ov_2_2 → ov_2_1
    teleport('ov_2_2', 1, 80)
    hold(page, 'ArrowLeft', 500)
    s = S()
    if s['room'] == 'ov_2_1': ok('edge transition W', s['room'])
    else: fail('edge transition W', f'expected ov_2_1, got {s["room"]}')
    # Go east back
    teleport('ov_2_2', 240, 80)
    hold(page, 'ArrowRight', 500)
    s = S()
    if s['room'] == 'ov_2_3': ok('edge transition E', s['room'])
    else: fail('edge transition E', f'expected ov_2_3, got {s["room"]}')
    # South
    teleport('ov_2_2', 120, 160)
    hold(page, 'ArrowDown', 500)
    s = S()
    if s['room'] == 'ov_3_2': ok('edge transition S', s['room'])
    else: fail('edge transition S', f'expected ov_3_2, got {s["room"]}')
    # North (needs to align with tree-border opening in ov_2_2; opening at cols 7-9)
    teleport('ov_2_2', 120, 3)
    hold(page, 'ArrowUp', 500)
    s = S()
    if s['room'] == 'ov_1_2': ok('edge transition N', s['room'])
    else: fail('edge transition N', f'expected ov_1_2, got {s["room"]}')

    # ================================================================
    print('\n-- 4. CAVE → OLD MAN → SWORD --')
    teleport('cave_oldman', 112, 120)
    page.wait_for_timeout(100)
    # Walk player INTO old man at (112,64)
    page.evaluate('''() => { window.__zelda.world.player.x = 112; window.__zelda.world.player.y = 68; }''')
    page.wait_for_timeout(300)  # let dialog trigger
    s = S()
    if s['mode'] == 'dialog': ok('dialog opens on old man touch', s['mode'])
    else: fail('dialog opens on old man touch', f'mode={s["mode"]}')
    # Close dialog — press Z repeatedly
    for _ in range(3):
        page.keyboard.press('KeyZ')
        page.wait_for_timeout(250)
    s = S()
    if s['hasSword']: ok('sword granted', '')
    else: fail('sword granted', f'hasSword={s["hasSword"]}, flags={s["flags"]}')
    if s['mode'] == 'playing': ok('dialog closes', s['mode'])
    else: fail('dialog closes', f'mode={s["mode"]}')

    # ================================================================
    print('\n-- 5. SWORD SWING --')
    # ensure dialog fully closed + cooldown past
    page.wait_for_timeout(400)
    # Force-grant sword if not yet set
    setState("z.state.hasSword = true;")
    # Track player_attack events
    page.evaluate('''() => { window.__attackCount = 0; window.__zelda.events.on('player_attack', () => window.__attackCount++); }''')
    page.wait_for_timeout(250)  # let any prior swingTimer decay
    # track spawned sword_hit entities too (they auto-die after 0.18s)
    page.evaluate('''() => { window.__swordHitSeen = 0; const orig = window.__zelda.world.spawn.bind(window.__zelda.world); window.__zelda.world.spawn = function(e) { if (e.kind === 'sword_hit') window.__swordHitSeen++; return orig(e); }; }''')
    page.keyboard.press('KeyZ')
    page.wait_for_timeout(50)
    ac = page.evaluate('() => window.__attackCount || 0')
    if ac >= 1: ok('sword swing emits player_attack', f'count={ac}')
    else: fail('sword swing emits player_attack', f'count={ac}')
    sh = page.evaluate('() => window.__swordHitSeen || 0')
    if sh >= 1: ok('sword_hit entity spawned', f'n={sh}')
    else: fail('sword_hit entity spawned', f'n={sh}')

    # ================================================================
    print('\n-- 6. BUSH CUT --')
    teleport('ov_2_2', 40, 64)  # near bush at tile (2,4) pixel (32,64)
    # Ensure sword is granted, swingTimer decayed
    setState("z.state.hasSword = true;")
    page.wait_for_timeout(300)
    before = page.evaluate('() => window.__zelda.world.tileAt(32+8, 64+8)')
    # Test via direct emit of player_attack overlapping bush — verifies combat
    # system + replaceTile integration end-to-end. (Input path is exercised in
    # the sword-swing test.)
    page.evaluate('''() => {
      window.__zelda.events.emit('player_attack', {x:28, y:60, w:16, h:16, dir:3, damage:1});
    }''')
    page.wait_for_timeout(100)
    after = page.evaluate('() => window.__zelda.world.tileAt(32+8, 64+8)')
    if before == 17 and after == 0: ok('bush cut', f'{before}→{after}')
    else: fail('bush cut', f'{before}→{after} (17=BUSH, 0=GRASS)')

    # ================================================================
    print('\n-- 7. ENEMIES SPAWN + KILL --')
    teleport('ov_2_3', 120, 80)
    s = S()
    enemies = [e for e in s['entities'] if e['k'] in ('octorok','moblin','keese','zora','stalfos')]
    if len(enemies) >= 1: ok('enemies spawn in room', f'{len(enemies)} enemies')
    else: fail('enemies spawn in room', f'entities={[e["k"] for e in s["entities"]]}')
    # Track enemy_killed events
    page.evaluate('''() => { window.__killCount = 0; window.__zelda.events.on('enemy_killed', () => window.__killCount++); }''')
    # Kill by emitting attack overlapping first enemy
    if enemies:
        e = enemies[0]
        page.evaluate('''(e) => {
          window.__zelda.events.emit('player_attack', {x: e.x-1, y: e.y-1, w: e.k.length>0?20:20, h: 20, dir: 1, damage: 99});
        }''', e)
        page.wait_for_timeout(100)
        # enemies have hp 1-3, 99 damage kills in 1 hit
        kc = page.evaluate('() => window.__killCount || 0')
        if kc >= 1: ok('enemy kill via player_attack', f'count={kc}')
        else: fail('enemy kill via player_attack', f'count={kc}')

    # ================================================================
    print('\n-- 8. RUPEE PICKUP --')
    rBefore = S()['rupees']
    # Spawn a rupee directly
    page.evaluate('''() => {
      const z = window.__zelda;
      const mod = z;
      // Use the factory registry
      const factory = z.world.factories.get('rupee');
      const e = factory({x: z.world.player.x-4, y: z.world.player.y, kind:'rupee', opts:{value:3}}, z.world);
      z.world.entities.push(e);
    }''')
    page.wait_for_timeout(300)  # let pickup overlap occur
    rAfter = S()['rupees']
    if rAfter > rBefore: ok('rupee pickup', f'{rBefore}→{rAfter}')
    else: fail('rupee pickup', f'{rBefore}→{rAfter}')

    # ================================================================
    print('\n-- 9. DUNGEON ENTRY --')
    teleport('d1_entry', 120, 80)
    s = S()
    if s['room'].startswith('d1') and 'd1' in s['room']: ok('teleport to dungeon', s['room'])
    rk = page.evaluate('() => window.__zelda.world.room.kind')
    if rk == 'dungeon': ok('room kind=dungeon', rk)
    else: fail('room kind=dungeon', rk)

    # ================================================================
    print('\n-- 10. CHEST → KEY --')
    teleport('d1_keyroom', 120, 80)
    s = S()
    chest = [e for e in s['entities'] if e['k'] == 'chest']
    if chest: ok('chest exists in d1_keyroom', f'n={len(chest)}')
    else: fail('chest exists in d1_keyroom', f'entities={[e["k"] for e in s["entities"]]}')
    # Walk to chest and hold X (use) to open
    if chest:
        c = chest[0]
        setState(f'z.world.player.x = {c["x"]-4}; z.world.player.y = {c["y"]+16};')
        page.wait_for_timeout(100)
        # Press X repeatedly to trigger chest open
        for _ in range(15):
            page.keyboard.down('KeyX')
            page.wait_for_timeout(100)
            page.keyboard.up('KeyX')
            cur = S()
            if cur['keys'] > 0 or any(e['k']=='key' for e in cur['entities']):
                break
        after = S()
        if after['keys'] > 0 or any(e['k']=='key' for e in after['entities']):
            ok('chest opens + key appears', f'keys={after["keys"]}')
        else:
            fail('chest opens + key appears', f'keys={after["keys"]} entities={[e["k"] for e in after["entities"]]}')

    # ================================================================
    print('\n-- 11. BOSS DEFEAT + HEART CONTAINER --')
    teleport('d1_boss', 120, 80)
    s = S()
    bosses = [e for e in s['entities'] if e['k'] == 'boss_aquamentus']
    if bosses: ok('boss spawns', f'hp={bosses[0]["hp"]}')
    else: fail('boss spawns', f'entities={[e["k"] for e in s["entities"]]}')
    # Pummel the boss with direct hits (sword_hit equivalents) — player_attack emissions
    if bosses:
        page.evaluate('''() => { window.__bossDead = false; window.__zelda.events.on('boss_defeated', () => window.__bossDead = true); }''')
        for _ in range(40):
            b = page.evaluate('''() => {
              const be = window.__zelda.world.entities.find(e => e.kind==='boss_aquamentus');
              return be ? {x:be.x, y:be.y, w:be.w, h:be.h, hp:be.hp, dead:be.dead} : null;
            }''')
            if not b or b['dead']:
                break
            page.evaluate('''(b) => {
              window.__zelda.events.emit('player_attack', {x:b.x, y:b.y, w:b.w, h:b.h, dir:1, damage:2});
            }''', b)
            page.wait_for_timeout(160)  # wait past invulnTimer
        bd = page.evaluate('() => window.__bossDead || false')
        if bd: ok('boss_defeated event', '')
        else: fail('boss_defeated event', '')
        # Verify heart container spawn
        page.wait_for_timeout(200)
        hc = page.evaluate('() => window.__zelda.world.entities.filter(e => e.kind === "heart_container").length')
        if hc >= 1: ok('heart_container drops', f'n={hc}')
        else: fail('heart_container drops', f'n={hc}')

    # ================================================================
    print('\n-- 12. TRIFORCE → VICTORY --')
    teleport('d1_treasure', 120, 80)
    s = S()
    tf = [e for e in s['entities'] if e['k'] == 'triforce']
    if tf: ok('triforce spawns', '')
    else: fail('triforce spawns', f'entities={[e["k"] for e in s["entities"]]}')
    if tf:
        # Walk player onto triforce
        page.evaluate(f'() => {{ window.__zelda.world.player.x = {tf[0]["x"]}; window.__zelda.world.player.y = {tf[0]["y"]}; }}')
        page.wait_for_timeout(300)
        s = S()
        if s['mode'] == 'victory': ok('triforce → victory mode', s['mode'])
        else: fail('triforce → victory mode', f'mode={s["mode"]}')

    # Reset to title
    setState("z.state.mode = 'title';")
    page.keyboard.press('Enter'); page.wait_for_timeout(200)
    # Ensure we're back in playing mode for later tests
    s = S()
    if s['mode'] != 'playing':
        setState("z.state.mode = 'playing';")

    # ================================================================
    print('\n-- 13. PAUSE MENU --')
    teleport('ov_2_2', 120, 80)
    setState("z.state.mode = 'playing';")
    page.keyboard.press('Enter'); page.wait_for_timeout(200)
    s = S()
    if s['mode'] == 'paused': ok('Enter during play → paused', s['mode'])
    else: fail('Enter during play → paused', f'mode={s["mode"]}')
    page.keyboard.press('Enter'); page.wait_for_timeout(200)
    s = S()
    if s['mode'] == 'playing': ok('Enter in pause → playing', s['mode'])
    else: fail('Enter in pause → playing', f'mode={s["mode"]}')

    # ================================================================
    print('\n-- 14. ITEM CYCLE --')
    setState("z.state.hasBow = true; z.state.hasBoomerang = true; z.state.bombs = 4;")
    b = S()['selectedItem']
    page.keyboard.press('KeyC'); page.wait_for_timeout(100)
    a1 = S()['selectedItem']
    page.keyboard.press('KeyC'); page.wait_for_timeout(100)
    a2 = S()['selectedItem']
    if a1 != b or a2 != a1: ok('item cycle changes selection', f'{b}→{a1}→{a2}')
    else: fail('item cycle changes selection', f'{b}→{a1}→{a2}')

    # ================================================================
    print('\n-- 15. BOMB PLACEMENT --')
    teleport('ov_2_2', 100, 80)
    setState("z.state.bombs = 4; z.state.selectedItem = 'bomb';")
    page.wait_for_timeout(100)
    nb = page.evaluate('() => window.__zelda.world.entities.filter(e => e.kind === "bomb").length')
    # Use direct event emission (input path exercised by item-cycle test)
    page.evaluate('''() => {
      window.__zelda.events.emit('player_use_item', {item:'bomb', x:100, y:80, dir:1});
    }''')
    page.wait_for_timeout(150)
    nb2 = page.evaluate('() => window.__zelda.world.entities.filter(e => e.kind === "bomb").length')
    if nb2 > nb: ok('bomb placed', f'{nb}→{nb2}')
    else: fail('bomb placed', f'{nb}→{nb2}')
    # Fuse is 1.5s; wait 2.5s to be safe
    page.wait_for_timeout(2500)
    stillBomb = page.evaluate('() => window.__zelda.world.entities.filter(e => e.kind === "bomb" && !e.dead).length')
    if stillBomb == 0: ok('bomb explodes after fuse', '')
    else: fail('bomb explodes after fuse', f'{stillBomb} bombs still alive')

    # ================================================================
    print('\n-- 16. GAME-OVER + RESPAWN --')
    setState("z.state.hearts = 0;")
    emit('player_died', {})
    page.wait_for_timeout(300)
    s = S()
    if s['mode'] == 'gameover': ok('player_died → gameover', s['mode'])
    else: fail('player_died → gameover', f'mode={s["mode"]}')
    # Respawn
    page.keyboard.press('Enter'); page.wait_for_timeout(500)
    s = S()
    if s['mode'] == 'playing' and s['hearts'] > 0: ok('gameover → respawn', f'mode={s["mode"]} hearts={s["hearts"]}')
    else: fail('gameover → respawn', f'mode={s["mode"]} hearts={s["hearts"]}')

    # ================================================================
    print('\n-- 17. MUTE TOGGLE --')
    beforeM = page.evaluate('() => window.__zelda.audio.isMuted()')
    page.keyboard.press('KeyM'); page.wait_for_timeout(100)
    afterM = page.evaluate('() => window.__zelda.audio.isMuted()')
    if beforeM != afterM: ok('mute toggles', f'{beforeM}→{afterM}')
    else: fail('mute toggles', f'{beforeM}→{afterM}')

    # ================================================================
    print('\n-- 18. AUDIO CONTEXT --')
    ac = page.evaluate('''() => {
      try {
        const z = window.__zelda;
        return typeof z.audio.resume === 'function';
      } catch(e) { return false; }
    }''')
    if ac: ok('audio.resume exists', '')
    else: fail('audio.resume exists', '')

    # ================================================================
    print('\n-- 19. OVERWORLD GRID COVERAGE --')
    all_rooms_ok = True
    missing = []
    for r in range(4):
        for c in range(4):
            rid = f'ov_{r}_{c}'
            exists = page.evaluate(f'() => !!window.__zelda.world.rooms.get("{rid}")')
            if not exists:
                all_rooms_ok = False
                missing.append(rid)
    if all_rooms_ok: ok('16 overworld rooms defined', '')
    else: fail('16 overworld rooms defined', f'missing={missing}')

    # ================================================================
    print('\n-- 20. DUNGEON ROOMS --')
    dng_ids = ['d1_entry','d1_h1','d1_h2','d1_keyroom','d1_combat1','d1_combat2','d1_prehall','d1_boss','d1_treasure']
    present = page.evaluate(f'(ids) => ids.filter(i => window.__zelda.world.rooms.has(i))', dng_ids)
    if len(present) == len(dng_ids): ok('all dungeon rooms defined', f'{len(present)}/{len(dng_ids)}')
    else: fail('all dungeon rooms defined', f'got {present}')

    page.screenshot(path='/tmp/zelda-e2e-final.png')
    browser.close()

# ====================================================================
print('\n\n==================== RESULTS ====================')
passes = sum(1 for r in RESULTS if r[0]=='PASS')
fails  = sum(1 for r in RESULTS if r[0]=='FAIL')
print(f'  {passes} passed  /  {fails} failed  /  {len(RESULTS)} total')
if fails:
    print('\nFAILURES:')
    for status, name, detail in RESULTS:
        if status == 'FAIL':
            print(f'  - {name}: {detail}')
print(f'\nPage errors: {len(ERRORS)}')
for e in ERRORS: print(f'  {e}')
err_logs = [l for l in LOGS if l[0] in ('error','warning')]
if err_logs:
    print(f'\nConsole warnings/errors ({len(err_logs)}):')
    for t,txt in err_logs[:10]: print(f'  [{t}] {txt}')

sys.exit(1 if (fails or ERRORS) else 0)

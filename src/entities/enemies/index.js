// index.js — registers all enemy factories with the world's spawn system
import { createOctorok } from './octorok.js';
import { createMoblin }  from './moblin.js';
import { createKeese }   from './keese.js';
import { createZora }    from './zora.js';
import { createStalfos } from './stalfos.js';
import { createBossAquamentus } from './boss_aquamentus.js';
import { createOldMan }  from './npc.js';

const FACTORIES = {
  octorok:          createOctorok,
  moblin:           createMoblin,
  keese:            createKeese,
  zora:             createZora,
  stalfos:          createStalfos,
  boss_aquamentus:  createBossAquamentus,
  npc_oldman:       createOldMan,
};

/**
 * registerEnemyFactories(world)
 * Registers each enemy factory with the world's spawn system.
 * Supports world.registerFactory(kind, fn) or world.spawnFactories.set(kind, fn).
 */
export function registerEnemyFactories(world) {
  for (const [kind, fn] of Object.entries(FACTORIES)) {
    if (typeof world.registerFactory === 'function') {
      world.registerFactory(kind, fn);
    } else if (world.spawnFactories && typeof world.spawnFactories.set === 'function') {
      world.spawnFactories.set(kind, fn);
    } else {
      console.warn(`[enemies] world has no factory registration API — could not register '${kind}'`);
    }
  }
}

export {
  createOctorok,
  createMoblin,
  createKeese,
  createZora,
  createStalfos,
  createBossAquamentus,
  createOldMan,
};

import type { EcosystemId, EcosystemPlugin } from '../types/ecosystem-plugin.js';

export interface PluginRegistry {
  register(plugin: EcosystemPlugin): void;
  get(ecosystem: EcosystemId): EcosystemPlugin;
  getAll(): readonly EcosystemPlugin[];
}

/** Wires ecosystem id to plugin instance. The rest of the pipeline only ever talks to this. */
export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<EcosystemId, EcosystemPlugin>();

  return {
    register(plugin: EcosystemPlugin): void {
      plugins.set(plugin.id, plugin);
    },
    get(ecosystem: EcosystemId): EcosystemPlugin {
      const plugin = plugins.get(ecosystem);
      if (!plugin) {
        throw new Error(`No plugin registered for ecosystem "${ecosystem}"`);
      }
      return plugin;
    },
    getAll(): readonly EcosystemPlugin[] {
      return [...plugins.values()];
    },
  };
}

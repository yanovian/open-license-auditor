import type { EcosystemPlugin } from '../types/ecosystem-plugin.js';
import { createCargoPlugin } from './cargo/cargo-plugin.js';
import { createComposerPlugin } from './composer/composer-plugin.js';
import { createGoPlugin } from './go/go-plugin.js';
import { createGradlePlugin } from './gradle/gradle-plugin.js';
import { createMavenPlugin } from './maven/maven-plugin.js';
import { createNpmPlugin } from './npm/npm-plugin.js';
import { createNugetPlugin } from './nuget/nuget-plugin.js';
import { createPipPlugin } from './pip/pip-plugin.js';
import { createRubygemsPlugin } from './rubygems/rubygems-plugin.js';

/**
 * The single place a new ecosystem gets wired in. Adding support for another package manager
 * means writing one plugin module and adding one line here, nothing else in the pipeline
 * needs to change.
 */
export function createAllPlugins(): EcosystemPlugin[] {
  return [
    createNpmPlugin(),
    createCargoPlugin(),
    createMavenPlugin(),
    createPipPlugin(),
    createGoPlugin(),
    createGradlePlugin(),
    createRubygemsPlugin(),
    createNugetPlugin(),
    createComposerPlugin(),
  ];
}

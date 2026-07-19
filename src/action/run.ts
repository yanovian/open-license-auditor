import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createLicenseClassifier } from '../core/classification/license-classifier.js';
import { createActionsCache } from '../core/cache/actions-cache.js';
import type { Cache } from '../core/cache/cache.js';
import { createMemoryCache } from '../core/cache/memory-cache.js';
import type { ResolvedConfig } from '../core/config/config-schema.js';
import { loadConfig } from '../core/config/config-loader.js';
import { listRepoFiles } from '../core/discovery/list-repo-files.js';
import { discoverManifests } from '../core/discovery/scan-repo.js';
import { detectUnsupportedEcosystems } from '../core/discovery/unsupported-ecosystems.js';
import { postPrComment } from '../core/github/pr-commenter.js';
import type { Logger } from '../core/logging/logger.js';
import { createAllPlugins } from '../core/plugins/all-plugins.js';
import { createPluginRegistry, type PluginRegistry } from '../core/plugins/registry.js';
import { buildPrComment } from '../core/reporting/pr-comment-builder.js';
import { buildReport } from '../core/reporting/report-builder.js';
import { someNode } from '../core/resolution/tree-utils.js';
import type { PackageManifest } from '../core/types/manifest.js';
import type { AuditReport, SkippedByConfigNote } from '../core/types/report.js';
import { readActionInputs } from './inputs.js';
import { applyFailOnThreshold, setActionOutputs } from './outputs.js';

const REPORT_FILENAME = 'open-license-auditor-report.json';

/** Every plugin is always registered so detection can see what's in the repo; whether a
 * detected manifest actually gets resolved is decided afterward, by config, in run(). */
function createFullRegistry(): PluginRegistry {
  const registry = createPluginRegistry();
  for (const plugin of createAllPlugins()) {
    registry.register(plugin);
  }
  return registry;
}

interface ManifestPartition {
  readonly enabled: PackageManifest[];
  readonly skippedByConfig: SkippedByConfigNote[];
}

function partitionManifestsByConfig(
  manifests: readonly PackageManifest[],
  config: ResolvedConfig,
): ManifestPartition {
  const enabled: PackageManifest[] = [];
  const skippedByConfig: SkippedByConfigNote[] = [];

  for (const manifest of manifests) {
    const isEnabled = config.ecosystems[manifest.ecosystem] ?? true;
    if (isEnabled) {
      enabled.push(manifest);
    } else {
      skippedByConfig.push({
        ecosystem: manifest.ecosystem,
        language: manifest.language,
        manifestFilePath: manifest.manifestFilePath,
      });
    }
  }

  return { enabled, skippedByConfig };
}

interface CacheHandle {
  readonly cache: Cache;
  persist(): Promise<void>;
}

/** Actions cache persists across workflow runs; memory cache only lasts this one run. */
async function initializeCache(cacheEnabled: boolean): Promise<CacheHandle> {
  if (!cacheEnabled) {
    return { cache: createMemoryCache(), persist: async () => undefined };
  }
  const persistentCache = await createActionsCache();
  return { cache: persistentCache, persist: () => persistentCache.save() };
}

async function writeReportToDisk(report: AuditReport, repoRoot: string): Promise<string> {
  const reportPath = path.join(repoRoot, REPORT_FILENAME);
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

function reportHasAnyProblem(report: AuditReport): boolean {
  return report.manifests.some((manifestReport) =>
    someNode(manifestReport.dependencies, (node) => node.classification !== 'ok'),
  );
}

async function maybePostComment(
  report: AuditReport,
  inputs: ReturnType<typeof readActionInputs>,
): Promise<void> {
  if (!inputs.commentOnPr) {
    return;
  }
  if (inputs.commentOnlyOnProblems && !reportHasAnyProblem(report)) {
    return;
  }

  const commentBody = buildPrComment(report, inputs.severityFilter);
  await postPrComment(commentBody, {
    githubToken: inputs.githubToken,
    updateExistingComment: inputs.updateExistingComment,
  });
}

export async function run(logger: Logger): Promise<void> {
  const inputs = readActionInputs();
  const repoRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();

  const config = await loadConfig(path.join(repoRoot, inputs.configPath));
  const registry = createFullRegistry();
  const classifier = createLicenseClassifier(config.licenses);
  const { cache, persist } = await initializeCache(inputs.cacheEnabled);

  logger.info('Scanning repository for package manager files');
  const repoFiles = await listRepoFiles(repoRoot, config.ignorePaths);
  const allManifests = discoverManifests(repoFiles, registry);
  const { enabled, skippedByConfig } = partitionManifestsByConfig(allManifests, config);
  const unsupported = detectUnsupportedEcosystems(repoFiles);
  logger.info(
    `Found ${enabled.length} manifest(s) to check` +
      (skippedByConfig.length > 0 ? `, ${skippedByConfig.length} skipped by config` : '') +
      (unsupported.length > 0 ? `, ${unsupported.length} unsupported` : ''),
  );

  const report = await buildReport(enabled, {
    registry,
    ctx: { repoRoot, cache },
    classifier,
    coverage: { skippedByConfig, unsupported },
  });
  await persist();
  const reportPath = await writeReportToDisk(report, repoRoot);

  setActionOutputs(report, reportPath);
  await maybePostComment(report, inputs);
  applyFailOnThreshold(report, inputs.failOn);
}

import type { LicenseClassifier } from '../classification/license-classifier.js';
import { flattenUniqueNodes, mapTree } from '../resolution/tree-utils.js';
import type { DependencyNode, LicenseInfo } from '../types/dependency-node.js';
import type { EcosystemPlugin, ResolutionContext } from '../types/ecosystem-plugin.js';
import type { PackageManifest } from '../types/manifest.js';
import type { PluginRegistry } from '../plugins/registry.js';
import type {
  AuditReport,
  ManifestReport,
  SkippedByConfigNote,
  UnsupportedEcosystemNote,
} from '../types/report.js';

export interface CoverageNotes {
  readonly skippedByConfig?: readonly SkippedByConfigNote[];
  readonly unsupported?: readonly UnsupportedEcosystemNote[];
}

export interface BuildReportOptions {
  readonly registry: PluginRegistry;
  readonly ctx: ResolutionContext;
  readonly classifier: LicenseClassifier;
  readonly coverage?: CoverageNotes;
}

export async function buildReport(
  manifests: readonly PackageManifest[],
  options: BuildReportOptions,
): Promise<AuditReport> {
  const { registry, ctx, classifier, coverage = {} } = options;
  const manifestReports: ManifestReport[] = [];

  for (const manifest of manifests) {
    const plugin = registry.get(manifest.ecosystem);
    const rawTree = await plugin.resolveDependencyGraph(manifest, ctx);
    const licensedTree = await enrichTreeWithLicenses(rawTree, plugin, ctx);
    const classifiedTree = classifyTree(licensedTree, classifier);
    manifestReports.push({ manifest, dependencies: classifiedTree });
  }

  return {
    generatedAt: new Date().toISOString(),
    manifests: manifestReports,
    skippedByConfig: coverage.skippedByConfig ?? [],
    unsupported: coverage.unsupported ?? [],
  };
}

async function enrichTreeWithLicenses(
  tree: readonly DependencyNode[],
  plugin: EcosystemPlugin,
  ctx: ResolutionContext,
): Promise<DependencyNode[]> {
  const uniqueNodes = flattenUniqueNodes(tree);
  const licenseByKey = new Map<string, LicenseInfo>();

  await Promise.all(
    uniqueNodes.map(async (node) => {
      licenseByKey.set(node.key, await plugin.lookupLicense(node, ctx));
    }),
  );

  return mapTree(tree, (node) => ({
    ...node,
    license: licenseByKey.get(node.key) ?? node.license,
  }));
}

function classifyTree(
  tree: readonly DependencyNode[],
  classifier: LicenseClassifier,
): DependencyNode[] {
  return mapTree(tree, (node) => ({
    ...node,
    classification: classifier.classify(node.license.canonicalId),
  }));
}

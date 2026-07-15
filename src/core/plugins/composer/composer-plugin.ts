import { normalizeLicenseString } from '../../classification/spdx-normalize.js';
import { buildDependencyTreeFromLockfile } from '../../resolution/lockfile-tree-builder.js';
import { mapTree } from '../../resolution/tree-utils.js';
import type { DependencyNode, LicenseInfo } from '../../types/dependency-node.js';
import type { EcosystemPlugin, ResolutionContext } from '../../types/ecosystem-plugin.js';
import type { PackageManifest } from '../../types/manifest.js';
import { detectComposerManifests, readComposerLockData } from './composer-lock-parser.js';

function toLicenseInfo(rawLicense: string | null): LicenseInfo {
  return {
    raw: rawLicense,
    canonicalId: normalizeLicenseString(rawLicense),
    source: rawLicense ? 'lockfile-metadata' : 'unknown',
  };
}

/**
 * Composer has no deps.dev support at all. Its full dependency tree and every package's
 * license both come from composer.lock alone, so resolveDependencyGraph already fills in the
 * correct license for each node; lookupLicense just returns what is already there.
 */
export function createComposerPlugin(): EcosystemPlugin {
  return {
    id: 'composer',
    language: 'PHP',

    detectManifests(repoFiles: readonly string[]): PackageManifest[] {
      return detectComposerManifests(repoFiles);
    },

    async resolveDependencyGraph(
      manifest: PackageManifest,
      ctx: ResolutionContext,
    ): Promise<DependencyNode[]> {
      const { packages, licenseByPackageKey } = await readComposerLockData(manifest, ctx.repoRoot);
      const tree = buildDependencyTreeFromLockfile(packages, 'composer', manifest.id);

      return mapTree(tree, (node) => ({
        ...node,
        license: toLicenseInfo(licenseByPackageKey.get(`${node.name}@${node.version}`) ?? null),
      }));
    },

    async lookupLicense(node: DependencyNode): Promise<LicenseInfo> {
      return node.license;
    },
  };
}

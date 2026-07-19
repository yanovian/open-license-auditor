import { readdir } from 'node:fs/promises';
import path from 'node:path';

const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'vendor',
  'dist',
  'build',
  'target',
  '.venv',
  'coverage',
]);

/** Recursively lists every file in a repo, as paths relative to repoRoot, skipping build output
 * and dependency directories that would otherwise slow discovery down for no benefit, plus
 * whatever extra path prefixes the config asks to ignore. */
export async function listRepoFiles(
  repoRoot: string,
  ignorePaths: readonly string[] = [],
): Promise<string[]> {
  const files: string[] = [];
  await walkDirectory(repoRoot, repoRoot, files, ignorePaths);
  return files;
}

async function walkDirectory(
  repoRoot: string,
  currentDir: string,
  files: string[],
  ignorePaths: readonly string[],
): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = path.relative(repoRoot, path.join(currentDir, entry.name));
    if (isIgnoredPath(relativePath, ignorePaths)) {
      continue;
    }
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIR_NAMES.has(entry.name)) {
        await walkDirectory(repoRoot, path.join(currentDir, entry.name), files, ignorePaths);
      }
      continue;
    }
    if (entry.isFile()) {
      files.push(relativePath);
    }
  }
}

/** Matches if relativePath is, or is inside, one of the configured ignore prefixes. Directories
 * are pruned at this check too, so an ignored path is never even walked into. */
function isIgnoredPath(relativePath: string, ignorePaths: readonly string[]): boolean {
  const normalized = relativePath.split(path.sep).join('/');
  return ignorePaths.some((prefix) => {
    const normalizedPrefix = prefix.replace(/\/+$/, '');
    return normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`);
  });
}

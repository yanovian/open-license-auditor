import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listRepoFiles } from './list-repo-files.js';

describe('listRepoFiles', () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await mkdtemp(path.join(tmpdir(), 'ola-list-repo-files-'));
    await mkdir(path.join(repoRoot, 'examples', 'nested'), { recursive: true });
    await mkdir(path.join(repoRoot, 'src'), { recursive: true });
    await writeFile(path.join(repoRoot, 'package.json'), '{}');
    await writeFile(path.join(repoRoot, 'src', 'index.ts'), '');
    await writeFile(path.join(repoRoot, 'examples', 'package.json'), '{}');
    await writeFile(path.join(repoRoot, 'examples', 'nested', 'go.mod'), '');
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  it('lists every file when no paths are ignored', async () => {
    const files = await listRepoFiles(repoRoot);

    expect(files.sort()).toEqual(
      ['package.json', 'src/index.ts', 'examples/package.json', 'examples/nested/go.mod'].sort(),
    );
  });

  it('skips a directory matching an ignored path prefix, including its contents', async () => {
    const files = await listRepoFiles(repoRoot, ['examples']);

    expect(files.sort()).toEqual(['package.json', 'src/index.ts'].sort());
  });

  it('does not treat one path as a prefix of another with the same start', async () => {
    await mkdir(path.join(repoRoot, 'examples-extra'), { recursive: true });
    await writeFile(path.join(repoRoot, 'examples-extra', 'file.txt'), '');

    const files = await listRepoFiles(repoRoot, ['examples']);

    expect(files).toContain('examples-extra/file.txt');
  });
});

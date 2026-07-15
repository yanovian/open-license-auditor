import type { DependencyNode } from '../types/dependency-node.js';

const EM_DASH = '—';

/** Guards every generated comment against slipping in an em dash, per project style rules. */
export function assertNoEmDash(text: string): void {
  if (text.includes(EM_DASH)) {
    throw new Error('Generated PR comment text must not contain an em dash');
  }
}

export function renderTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyRows = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerRow, separatorRow, ...bodyRows].join('\n');
}

function licenseLabel(node: DependencyNode): string {
  return node.license.canonicalId ?? node.license.raw ?? 'unknown';
}

export function renderDependencyTree(nodes: readonly DependencyNode[], depth = 0): string {
  return nodes
    .map((node) => {
      const indent = '  '.repeat(depth);
      const line = `${indent}- ${node.name}@${node.version} (${licenseLabel(node)})`;
      const childLines = renderDependencyTree(node.children, depth + 1);
      return childLines.length > 0 ? `${line}\n${childLines}` : line;
    })
    .join('\n');
}

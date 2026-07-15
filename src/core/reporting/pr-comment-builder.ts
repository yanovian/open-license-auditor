import type { Classification, DependencyNode } from '../types/dependency-node.js';
import type { AuditReport, ManifestReport } from '../types/report.js';
import type { SeverityFilter } from '../types/severity.js';
import { assertNoEmDash, renderDependencyTree, renderTable } from './markdown-formatter.js';

export interface ProblemRow {
  readonly name: string;
  readonly version: string;
  readonly ecosystem: string;
  readonly license: string;
  readonly classification: Classification;
  readonly manifestPath: string;
}

const DISCLAIMER =
  'This is an automated check. License detection can be wrong, and a license can change ' +
  'between versions of a package. Always confirm with the actual license file before making ' +
  'a legal decision.';

const FOOTER =
  'Scanned by [Open License Auditor](https://github.com/marketplace/actions/open-license-auditor). ' +
  'See the [license classification guide](https://github.com/yanovian/open-license-auditor/blob/master/_docs/license-classification.md) ' +
  'for what counts as risky and why.';

// GitHub rejects PR comments over 65536 characters. A very large dependency tree can exceed
// that in its full map alone, so the map is dropped in favor of a note if the comment would
// otherwise be rejected; the problem table above it is never truncated.
const GITHUB_COMMENT_CHARACTER_LIMIT = 65536;
const TRUNCATION_NOTICE =
  'The full dependency map was too large to include here. Download the full JSON report from ' +
  'this workflow run to see everything.';

function matchesSeverityFilter(
  classification: Classification,
  severityFilter: SeverityFilter,
): boolean {
  if (severityFilter === 'none') {
    return false;
  }
  if (severityFilter === 'both') {
    return classification !== 'ok';
  }
  return classification === severityFilter;
}

function collectProblemRowsForManifest(
  manifestReport: ManifestReport,
  severityFilter: SeverityFilter,
  seenKeys: Set<string>,
  rows: ProblemRow[],
): void {
  const manifestPath = manifestReport.manifest.manifestFilePath;

  function visit(nodes: readonly DependencyNode[]): void {
    for (const node of nodes) {
      const dedupeKey = `${node.key}:${manifestPath}`;
      const isNewProblem =
        node.classification !== null &&
        matchesSeverityFilter(node.classification, severityFilter) &&
        !seenKeys.has(dedupeKey);

      if (isNewProblem && node.classification !== null) {
        seenKeys.add(dedupeKey);
        rows.push({
          name: node.name,
          version: node.version,
          ecosystem: node.ecosystem,
          license: node.license.canonicalId ?? node.license.raw ?? 'unknown',
          classification: node.classification,
          manifestPath,
        });
      }
      visit(node.children);
    }
  }

  visit(manifestReport.dependencies);
}

function collectProblemRows(report: AuditReport, severityFilter: SeverityFilter): ProblemRow[] {
  const rows: ProblemRow[] = [];
  const seenKeys = new Set<string>();

  for (const manifestReport of report.manifests) {
    collectProblemRowsForManifest(manifestReport, severityFilter, seenKeys, rows);
  }

  return rows;
}

function buildFullMapSection(report: AuditReport): string {
  const sections = report.manifests.map((manifestReport) => {
    const { manifest, dependencies } = manifestReport;
    return `**${manifest.language}** (\`${manifest.manifestFilePath}\`)\n\n${renderDependencyTree(dependencies)}`;
  });

  return `<details>\n<summary>Full dependency map</summary>\n\n${sections.join('\n\n')}\n\n</details>`;
}

function buildProblemTable(rows: readonly ProblemRow[]): string {
  return renderTable(
    ['Dependency', 'Version', 'Ecosystem', 'License', 'Severity', 'Found in'],
    rows.map((row) => [
      row.name,
      row.version,
      row.ecosystem,
      row.license,
      row.classification,
      `\`${row.manifestPath}\``,
    ]),
  );
}

/**
 * Lists anything that was not checked and why: a supported ecosystem disabled in the user's
 * config, or a package manager this tool has no plugin for at all. Returns null when there is
 * nothing to report, so this section only ever appears when it says something useful.
 */
function buildCoverageNoteSection(report: AuditReport): string | null {
  if (report.skippedByConfig.length === 0 && report.unsupported.length === 0) {
    return null;
  }

  const skippedLines = report.skippedByConfig.map(
    (note) =>
      `- ${note.language} (\`${note.manifestFilePath}\`) was skipped. It is disabled in your config.`,
  );
  const unsupportedLines = report.unsupported.map(
    (note) =>
      `- ${note.language} (${note.packageManager}) is not yet supported. Found \`${note.manifestFilePath}\`.`,
  );

  return ['### Not checked', ...skippedLines, ...unsupportedLines].join('\n');
}

function buildProblemBody(report: AuditReport, problemRows: readonly ProblemRow[]): string {
  const header = '## Open License Auditor';
  const summary = `Found ${problemRows.length} problem${problemRows.length === 1 ? '' : 's'} that need a look.`;
  const table = buildProblemTable(problemRows);
  const coverageNote = buildCoverageNoteSection(report);
  const sections = [
    header,
    summary,
    table,
    buildFullMapSection(report),
    coverageNote,
    DISCLAIMER,
    FOOTER,
  ];
  const fullBody = sections.filter((section) => section !== null).join('\n\n');

  if (fullBody.length <= GITHUB_COMMENT_CHARACTER_LIMIT) {
    return fullBody;
  }

  return [header, summary, table, TRUNCATION_NOTICE, coverageNote, DISCLAIMER, FOOTER]
    .filter((section) => section !== null)
    .join('\n\n');
}

/** Builds the full PR comment body: direct problem list first, full map collapsed by default. */
export function buildPrComment(report: AuditReport, severityFilter: SeverityFilter): string {
  const problemRows = collectProblemRows(report, severityFilter);

  let body: string;
  if (problemRows.length === 0) {
    const coverageNote = buildCoverageNoteSection(report);
    const sections = [
      '## Open License Auditor',
      'No problems found.',
      coverageNote,
      DISCLAIMER,
      FOOTER,
    ];
    body = sections.filter((section) => section !== null).join('\n\n');
  } else {
    body = buildProblemBody(report, problemRows);
  }

  assertNoEmDash(body);
  return body;
}

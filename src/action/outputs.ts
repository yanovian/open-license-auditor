import * as core from '@actions/core';
import { someNode } from '../core/resolution/tree-utils.js';
import type { Classification } from '../core/types/dependency-node.js';
import type { AuditReport } from '../core/types/report.js';
import type { FailOnLevel } from '../core/types/severity.js';

function reportHasClassification(report: AuditReport, classification: Classification): boolean {
  return report.manifests.some((manifestReport) =>
    someNode(manifestReport.dependencies, (node) => node.classification === classification),
  );
}

export function setActionOutputs(report: AuditReport, reportPath: string): void {
  core.setOutput('has-critical', reportHasClassification(report, 'critical'));
  core.setOutput('has-warning', reportHasClassification(report, 'warning'));
  core.setOutput('report-path', reportPath);
}

/** Fails the Action's run if the audit found anything at or above the configured threshold. */
export function applyFailOnThreshold(report: AuditReport, failOn: FailOnLevel): void {
  if (failOn === 'none') {
    return;
  }

  const hasCritical = reportHasClassification(report, 'critical');
  if (failOn === 'critical' && hasCritical) {
    core.setFailed('License audit found a critical license issue.');
    return;
  }

  const hasWarning = reportHasClassification(report, 'warning');
  if (failOn === 'warning' && (hasCritical || hasWarning)) {
    core.setFailed('License audit found a warning or critical license issue.');
  }
}

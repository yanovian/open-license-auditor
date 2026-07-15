import * as core from '@actions/core';
import type { FailOnLevel, SeverityFilter } from '../core/types/severity.js';

export interface ActionInputs {
  readonly configPath: string;
  readonly severityFilter: SeverityFilter;
  readonly failOn: FailOnLevel;
  readonly commentOnPr: boolean;
  readonly commentOnlyOnProblems: boolean;
  readonly updateExistingComment: boolean;
  readonly githubToken: string;
  readonly cacheEnabled: boolean;
}

const SEVERITY_FILTER_VALUES: readonly SeverityFilter[] = ['critical', 'warning', 'both', 'none'];
const FAIL_ON_VALUES: readonly FailOnLevel[] = ['warning', 'critical', 'none'];

export function readActionInputs(): ActionInputs {
  return {
    configPath: core.getInput('config-path') || '.github/license-audit.yml',
    severityFilter: parseEnumInput('severity-filter', SEVERITY_FILTER_VALUES, 'both'),
    failOn: parseEnumInput('fail-on', FAIL_ON_VALUES, 'critical'),
    commentOnPr: core.getBooleanInput('comment-on-pr'),
    commentOnlyOnProblems: core.getBooleanInput('comment-only-on-problems'),
    updateExistingComment: core.getBooleanInput('update-existing-comment'),
    githubToken: core.getInput('github-token', { required: true }),
    cacheEnabled: core.getBooleanInput('cache'),
  };
}

function parseEnumInput<T extends string>(
  inputName: string,
  allowedValues: readonly T[],
  fallback: T,
): T {
  const rawValue = core.getInput(inputName) || fallback;
  if (!allowedValues.includes(rawValue as T)) {
    throw new Error(
      `Input "${inputName}" must be one of: ${allowedValues.join(', ')}. Got "${rawValue}".`,
    );
  }
  return rawValue as T;
}

/** What the PR comment shows. 'both' means every warning and critical finding. */
export type SeverityFilter = 'critical' | 'warning' | 'both' | 'none';

/** What makes the Action exit non-zero. 'warning' fails on a warning or a critical finding. */
export type FailOnLevel = 'warning' | 'critical' | 'none';

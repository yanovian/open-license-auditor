import * as core from '@actions/core';

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function createActionsLogger(): Logger {
  return {
    info: (message: string) => core.info(message),
    warn: (message: string) => core.warning(message),
    error: (message: string) => core.error(message),
  };
}

import { describe, expect, it } from 'vitest';
import { loadConfig } from './config-loader.js';

const FIXTURE_PATH = 'tests/fixtures/config/sample-override.yml';

describe('loadConfig', () => {
  it('returns full defaults when no config file exists', async () => {
    const config = await loadConfig('tests/fixtures/config/does-not-exist.yml');

    expect(config.version).toBe(1);
    expect(config.ecosystems).toEqual({});
    expect(config.licenses).toEqual({});
  });

  it('parses and validates a config file', async () => {
    const config = await loadConfig(FIXTURE_PATH);

    expect(config.ecosystems).toEqual({ gradle: false });
    expect(config.licenses.ok).toEqual(['MPL-2.0']);
    expect(config.licenses.critical).toEqual(['MIT']);
  });
});

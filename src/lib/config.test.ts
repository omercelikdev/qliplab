import { describe, it, expect } from 'vitest';
import { CONFIG } from './config';
import pkg from '../../package.json';

describe('CONFIG.APP_VERSION', () => {
  // Regression: config.ts hand-carried a copy of the version and drifted to
  // 0.1.20 while the app shipped 0.1.21, so the About panel and every error
  // report lied about which build the user was running.
  it('matches package.json', () => {
    expect(CONFIG.APP_VERSION).toBe(pkg.version);
  });

  it('is never the injection fallback', () => {
    expect(CONFIG.APP_VERSION).not.toBe('0.0.0');
  });

  it('looks like a semantic version', () => {
    expect(CONFIG.APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

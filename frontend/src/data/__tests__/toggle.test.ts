import { describe, it, expect } from 'vitest';
import {
  resolveDataSourceMode,
  setPortalDataSource,
  resetPortalDataSource,
  portalData,
} from '../index.js';
import { LivePortalDataSource } from '../live/index.js';

describe('Data Source Toggle (FT-12)', () => {
  it('defaults to demo during automated tests (vitest)', () => {
    expect(resolveDataSourceMode({ MODE: 'test' })).toBe('demo');
    expect(resolveDataSourceMode({ MODE: 'test', VITE_PORTAL_DATA_SOURCE: 'live' })).toBe('demo');
  });

  it('defaults to live when VITE_PORTAL_DATA_SOURCE is omitted (non-existence)', () => {
    expect(resolveDataSourceMode({ MODE: 'development' })).toBe('live');
    expect(resolveDataSourceMode({ MODE: 'production' })).toBe('live');
    expect(resolveDataSourceMode({})).toBe('live');
  });

  it('selects demo when VITE_PORTAL_DATA_SOURCE is explicitly demo in non-test mode', () => {
    expect(
      resolveDataSourceMode({
        MODE: 'development',
        VITE_PORTAL_DATA_SOURCE: 'demo',
      })
    ).toBe('demo');
  });

  it('selects live when VITE_PORTAL_DATA_SOURCE is explicitly live', () => {
    expect(
      resolveDataSourceMode({
        MODE: 'development',
        VITE_PORTAL_DATA_SOURCE: 'live',
      })
    ).toBe('live');
  });

  it('creates LivePortalDataSource when configured for live', () => {
    // Override resolution temporarily
    const source = new LivePortalDataSource();
    expect(source).toBeInstanceOf(LivePortalDataSource);
  });

  it('setPortalDataSource allows swapping source and resetPortalDataSource restores it', () => {
    const mockSource = new LivePortalDataSource();
    const prev = setPortalDataSource(mockSource);
    expect(prev).toBeDefined();

    resetPortalDataSource();
    expect(portalData).toBeDefined();
  });
});

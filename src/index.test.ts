import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildExportsMap } from './index';
import path from 'node:path';
import fs from 'node:fs';

describe('buildExportsMap', () => {
  const distPath = '/path/to/dist';
  const pkg = { name: 'my-pkg' };

  beforeEach(() => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
  });

  it('should handle a single entry point', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js';
    });

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, {});

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
    });
  });

  it('should handle multiple entry points', () => {
    const entryNames = ['index', 'feature'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js' || p === '/path/to/dist/feature.js';
    });

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, {});

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './feature': {
        import: './dist/feature.js',
      },
    });
  });

  it('should handle ESM and CJS bundles', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js' || p === '/path/to/dist/index.cjs';
    });

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, {});

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
    });
  });

  it('should handle TypeScript declaration files', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js' || p === '/path/to/dist/index.d.ts';
    });

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, {});

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    });
  });

  it('should handle CSS files', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js';
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.css'] as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, {});

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './style.css': './dist/style.css',
    });
  });

  it('should not generate CSS alias when disabled', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js';
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.css'] as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: false });

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
    });
  });

  it('should use custom CSS alias when provided', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js';
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.css'] as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: { alias: './my-styles.css' } });

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './my-styles.css': './dist/style.css',
      './style.css': './dist/style.css',
    });
  });

  it('should not generate CSS alias when alias is false', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js';
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.css'] as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: { alias: false } });

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './style.css': './dist/style.css',
    });
  });
});
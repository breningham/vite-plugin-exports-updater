import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildExportsMap, collectEntriesFromDist } from './index';
import path from 'node:path';
import fs from 'node:fs';

describe('collectEntriesFromDist', () => {
  const distPath = '/path/to/dist';

  beforeEach(() => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
    vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as any);
  });

  it('should handle custom entry point extensions', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['component.vue', 'index.js'] as any);

    const entryNames = collectEntriesFromDist(distPath, { entryPointExtensions: ['.vue'] });

    expect(entryNames).toEqual(['component']);
  });
});

describe('buildExportsMap', () => {
  const distPath = '/path/to/dist';
  const pkg = { name: 'my-pkg' };

  beforeEach(() => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
    vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as any);
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
      return p === '/path/to/dist/index.js' || p.toString().endsWith('dist');
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.css'] as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: true });

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
      return p === '/path/to/dist/index.js' || p.toString().endsWith('dist');
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
      return p === '/path/to/dist/index.js' || p.toString().endsWith('dist');
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

  it('should handle custom CSS extensions', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js' || p.toString().endsWith('dist');
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.scss'] as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: { extensions: ['.scss'] } });

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './style.scss': {
        sass: './dist/style.scss',
      },
    });
  });

  it('should not generate CSS alias when alias is false', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js' || p.toString().endsWith('dist');
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

  it('should handle SCSS files with sass condition', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return p === '/path/to/dist/index.js' || p.toString().endsWith('dist');
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['style.scss'] as any);
    vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as any);

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: { extensions: ['.scss'] } });

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './style.scss': {
        sass: './dist/style.scss',
      },
    });
  });

  it('should find CSS files in subdirectories', () => {
    const entryNames = ['index'];
    vi.spyOn(path, 'basename').mockReturnValue('my-pkg');
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      const pathStr = p.toString();
      if (pathStr.endsWith('index.js')) return true;
      if (pathStr.endsWith('dist')) return true;
      if (pathStr.endsWith('styles')) return true;
      return false;
    });
    // Mock readdirSync to return a directory and a file
    vi.spyOn(fs, 'readdirSync').mockImplementation((p) => {
      if (p === distPath) {
        return ['styles', 'toplevel.css'] as any;
      }
      if (p === path.join(distPath, 'styles')) {
        return ['nested.css'] as any;
      }
      return [] as any;
    });
    // Mock statSync to identify directories and files
    vi.spyOn(fs, 'statSync').mockImplementation((p) => {
      if (p === path.join(distPath, 'styles')) {
        return { isDirectory: () => true } as any;
      }
      return { isDirectory: () => false } as any;
    });

    const exportsMap = buildExportsMap(entryNames, distPath, pkg, { css: { extensions: ['.css'] } });

    expect(exportsMap).toEqual({
      '.': {
        import: './dist/index.js',
      },
      './toplevel.css': './dist/toplevel.css',
      './styles/nested.css': './dist/styles/nested.css',
    });
  });
});
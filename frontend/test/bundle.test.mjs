import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

test('CLARIO Frontend Build Artifacts Test Suite', async (t) => {
  await t.test('Production bundle.js exists and is valid JavaScript', () => {
    const bundlePath = path.join(distDir, 'bundle.js');
    assert.ok(fs.existsSync(bundlePath), 'bundle.js must exist in dist');
    const stat = fs.statSync(bundlePath);
    assert.ok(stat.size > 10000, 'bundle.js should have valid minified content (>10KB)');
  });

  await t.test('Production bundle.css exists', () => {
    const cssPath = path.join(distDir, 'bundle.css');
    assert.ok(fs.existsSync(cssPath), 'bundle.css must exist in dist');
    const content = fs.readFileSync(cssPath, 'utf8');
    assert.ok(content.includes('--color-teal-primary'), 'bundle.css should include brand tokens');
  });

  await t.test('Production index.html includes correct scripts and accessibility tags', () => {
    const indexPath = path.join(distDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html must exist in dist');
    const html = fs.readFileSync(indexPath, 'utf8');
    assert.ok(html.includes('/bundle.js'), 'index.html must reference /bundle.js');
    assert.ok(html.includes('manifest.webmanifest'), 'index.html must reference webmanifest');
    assert.ok(html.includes('theme-color'), 'index.html must have theme-color meta tag');
    assert.ok(html.includes('<noscript>'), 'index.html must have noscript fallback');
  });

  await t.test('Web manifest contains valid PWA configuration', () => {
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.short_name, 'CLARIO');
    assert.equal(manifest.theme_color, '#123B3A');
  });
});

#!/usr/bin/env node
/**
 * Android build helper — used by npm run android:*
 * Usage: node scripts/android-build.js <variant> <backend> [theme]
 *   variant: debug | release
 *   backend: local | remote
 *   theme:   registered in src/theme/themes/registry.json (defaults to "default")
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [variant, backend, themeArg] = process.argv.slice(2);
if (!variant || !backend) {
  console.error('Usage: node scripts/android-build.js <debug|release> <local|remote> [theme]');
  process.exit(1);
}

const THEMES_DIR = path.join(__dirname, '..', 'src', 'theme', 'themes');
const themeRegistry = JSON.parse(
  fs.readFileSync(path.join(THEMES_DIR, 'registry.json'), 'utf8'),
);
const theme = themeArg || 'default';
const availableThemes = Object.keys(themeRegistry).sort();

// Fail before Gradle starts rather than after a multi-minute build.
if (!Object.prototype.hasOwnProperty.call(themeRegistry, theme)) {
  console.error(`[android-build] Unknown theme "${theme}". Available: ${availableThemes.join(', ')}`);
  process.exit(1);
}

const themeFile = themeRegistry[theme];
if (typeof themeFile !== 'string' || !fs.existsSync(path.join(THEMES_DIR, themeFile))) {
  console.error(`[android-build] Theme "${theme}" has no palette file in the theme registry.`);
  process.exit(1);
}

// Clean Gradle output dirs — prevents stale cached bundles from being used
['android/app/build', 'android/build'].forEach(p => {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) {}
});
console.log('[android-build] Build dirs cleaned');

// Build environment — explicitly inject EXPO_PUBLIC_* vars so Gradle bundler
// always gets the right API URL regardless of which .env file Expo loads
const env = { ...process.env };

// Always remove stale .env.development.local so plain `expo start` after this
// build doesn't pick up leftover remote/local env values
try { fs.unlinkSync('.env.development.local'); } catch (e) {}

if (backend === 'remote') {
  fs.readFileSync('.env.dev', 'utf8').split('\n').forEach(line => {
    const i = line.indexOf('=');
    if (i > 0 && !line.trim().startsWith('#')) {
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  });
}

// Set the selected theme after loading backend env so .env.dev cannot override it.
env.EXPO_PUBLIC_THEME = theme;
console.log(`[android-build] Theme: ${theme}`);

// Run expo
const expoArgs = ['expo', 'run:android'];
if (variant === 'release') {
  expoArgs.push('--variant', 'release', '--no-bundler');
}
console.log(`[android-build] npx ${expoArgs.join(' ')}`);

const result = spawnSync('npx', expoArgs, { stdio: 'inherit', shell: true, env });

// Copy APK next to the original Gradle output with a descriptive name
const apkSrc = `android/app/build/outputs/apk/${variant}/app-${variant}.apk`;
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const themeSuffix = theme === 'default' ? '' : `-${theme}`;
const apkDst = path.join(`android/app/build/outputs/apk/${variant}`, `kalba-${variant}-${backend}${themeSuffix}-${date}.apk`);
if (fs.existsSync(apkSrc)) {
  fs.copyFileSync(apkSrc, apkDst);
  console.log(`\n[android-build] APK ready: ${path.resolve(apkDst)}\n`);
} else if (variant === 'release') {
  console.warn(`[android-build] APK not found at ${apkSrc}`);
}

if (result.error) { console.error(result.error); process.exit(1); }
process.exit(result.status === null ? 1 : result.status);

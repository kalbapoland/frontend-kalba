#!/usr/bin/env node
/**
 * Android build helper — used by npm run android:*
 * Usage: node scripts/android-build.js <variant> <backend>
 *   variant: debug | release
 *   backend: local | remote
 */
const fs = require('fs');
const { spawnSync } = require('child_process');

const [variant, backend] = process.argv.slice(2);
if (!variant || !backend) {
  console.error('Usage: node scripts/android-build.js <debug|release> <local|remote>');
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

// Run expo
const expoArgs = ['expo', 'run:android'];
if (variant === 'release') {
  expoArgs.push('--variant', 'release', '--no-bundler');
}
console.log(`[android-build] npx ${expoArgs.join(' ')}`);

const result = spawnSync('npx', expoArgs, { stdio: 'inherit', shell: true, env });

// Copy APK next to the original Gradle output with a descriptive name
const path = require('path');
const apkSrc = `android/app/build/outputs/apk/${variant}/app-${variant}.apk`;
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const apkDst = path.join(`android/app/build/outputs/apk/${variant}`, `kalba-${variant}-${backend}-${date}.apk`);
if (fs.existsSync(apkSrc)) {
  fs.copyFileSync(apkSrc, apkDst);
  console.log(`\n[android-build] APK ready: ${path.resolve(apkDst)}\n`);
} else if (variant === 'release') {
  console.warn(`[android-build] APK not found at ${apkSrc}`);
}

if (result.error) { console.error(result.error); process.exit(1); }
process.exit(result.status === null ? 1 : result.status);

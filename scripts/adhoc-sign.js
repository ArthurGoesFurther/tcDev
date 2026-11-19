import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * electron-builder signs macOS apps only on macOS. Apple Silicon refuses to run a bundle whose
 * signature no longer matches, so builds made elsewhere get an ad-hoc signature from rcodesign.
 */
export default async function adhocSign({ electronPlatformName, appOutDir, packager }) {
  if (electronPlatformName !== 'darwin' || process.platform === 'darwin') return;
  const app = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  const rcodesign = process.env.RCODESIGN || 'rcodesign';
  try {
    execFileSync(rcodesign, ['sign', app], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(
      'macOS builds outside macOS need rcodesign on PATH (or RCODESIGN=/path/to/rcodesign): ' +
        'https://github.com/indygreg/apple-platform-rs/releases',
    );
  }
}

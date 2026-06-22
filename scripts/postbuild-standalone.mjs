// Post-build packaging for SELF-HOSTING only.
//
// When output:"standalone" is enabled (non-Vercel builds), Next.js emits
// .next/standalone but does not copy static assets, public/, or prisma/ into it.
// These copies make `bun .next/standalone/server.js` runnable. This replaces the
// previous inline `cp -r ...` chain in package.json (also non-portable to Windows).
//
// On Vercel (VERCEL=1) standalone is disabled in next.config.ts, so .next/standalone
// does not exist and this script is a safe no-op — preventing the old `cp` step from
// failing/bloating the Vercel build.
import { cpSync, existsSync } from 'node:fs';

if (process.env.VERCEL) {
  console.log('[postbuild] VERCEL detected — skipping standalone packaging.');
  process.exit(0);
}

if (!existsSync('.next/standalone')) {
  console.log('[postbuild] No .next/standalone output found — nothing to copy.');
  process.exit(0);
}

cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('prisma', '.next/standalone/prisma', { recursive: true });
console.log('[postbuild] Copied static, public, and prisma into .next/standalone.');
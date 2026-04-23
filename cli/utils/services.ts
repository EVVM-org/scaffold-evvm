/**
 * Discover custom services under the project-root `services/` folder.
 *
 * Convention: each direct subdirectory of `services/` is one service, and
 * must contain at least one `.sol` file. The directory name becomes the
 * service's slug (used for the route `/services/<slug>` and the
 * `NEXT_PUBLIC_CUSTOM_<NAME>_ADDRESS` env variable).
 *
 * Optional per-service files:
 *   - `<slug>.sol`        preferred main contract filename
 *   - `Deploy.s.sol`      user-provided Foundry deploy script
 *   - `manifest.json`     UI + deployment annotations (Phase D+)
 *   - `README.md`         docs
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, lstatSync, rmSync, symlinkSync, cpSync } from 'fs';
import { dirname, join, relative } from 'path';

export interface DiscoveredService {
  /** Directory name (also the URL slug). */
  slug: string;
  /** Absolute path to the service directory. */
  path: string;
  /** All `.sol` filenames inside the directory (sorted). */
  solFiles: string[];
  /** Preferred main contract filename if detectable (matches the slug or first .sol). */
  mainContract: string | null;
  /** `true` if the user has provided their own `Deploy.s.sol`. */
  hasDeployScript: boolean;
  /** Parsed contents of `manifest.json`, if present. */
  manifest: Record<string, unknown> | null;
  /** Whether a README exists. */
  hasReadme: boolean;
}

export function servicesRoot(projectRoot: string): string {
  return join(projectRoot, 'services');
}

/**
 * Scan `services/` and return one entry per subdirectory that contains at
 * least one `.sol` file. Directories with no `.sol` are silently skipped.
 */
export function discoverServices(projectRoot: string): DiscoveredService[] {
  const root = servicesRoot(projectRoot);
  if (!existsSync(root)) return [];

  const entries = readdirSync(root, { withFileTypes: true });
  const out: DiscoveredService[] = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dirPath = join(root, e.name);
    let files: string[];
    try {
      files = readdirSync(dirPath);
    } catch {
      continue;
    }
    const solFiles = files.filter((f) => f.endsWith('.sol')).sort();
    if (solFiles.length === 0) continue;

    // Prefer a contract whose filename matches the slug (`Counter.sol` in
    // `Counter/`); otherwise the first .sol alphabetically.
    const slug = e.name;
    const match = solFiles.find((f) => f.toLowerCase() === `${slug.toLowerCase()}.sol`);
    const mainContract = match ?? solFiles[0] ?? null;

    const hasDeployScript = files.includes('Deploy.s.sol');
    const hasReadme = files.includes('README.md');

    let manifest: Record<string, unknown> | null = null;
    if (files.includes('manifest.json')) {
      try {
        const raw = readFileSync(join(dirPath, 'manifest.json'), 'utf-8');
        manifest = JSON.parse(raw);
      } catch {
        manifest = null; // invalid JSON — silently ignore for now
      }
    }

    out.push({
      slug,
      path: dirPath,
      solFiles,
      mainContract,
      hasDeployScript,
      manifest,
      hasReadme,
    });
  }

  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Format a short human-readable summary of discovered services for wizard
 * output. One line per service, e.g.
 *
 *     • Counter (1 .sol, no manifest)
 */
export function formatServicesSummary(services: DiscoveredService[]): string {
  if (services.length === 0) return '   No custom services found (drop one under services/<name>/).';
  return services
    .map((s) => {
      const parts: string[] = [`${s.solFiles.length} .sol`];
      if (s.manifest) parts.push('manifest');
      if (s.hasDeployScript) parts.push('Deploy.s.sol');
      return `   • ${s.slug} (${parts.join(', ')})`;
    })
    .join('\n');
}

/**
 * Ensure the project-root `services/` folder is linked into Foundry's
 * source tree at `packages/foundry/contracts/services` so `forge build`
 * picks up every user contract without a separate compilation step.
 *
 * Prefers a relative symlink (instant edit-compile loop on Unix/macOS).
 * Falls back to a plain copy when symlink creation fails (Windows without
 * developer mode, permission-restricted CI, etc.).
 *
 * Returns `true` if the link/copy succeeded, `false` if `services/` didn't
 * exist to begin with (in which case nothing is needed).
 */
export function ensureServicesLinked(projectRoot: string): boolean {
  const src = servicesRoot(projectRoot);
  if (!existsSync(src)) return false;

  const foundryContracts = join(projectRoot, 'packages', 'foundry', 'contracts');
  if (!existsSync(foundryContracts)) mkdirSync(foundryContracts, { recursive: true });

  const target = join(foundryContracts, 'services');

  // Already a symlink pointing somewhere? Leave it. Existing regular dir or
  // dangling link → replace so we don't mix stale files.
  if (existsSync(target)) {
    try {
      const stat = lstatSync(target);
      if (stat.isSymbolicLink()) return true; // assume it's ours
      rmSync(target, { recursive: true, force: true });
    } catch {
      // fall through to (re)create below
    }
  }

  const relPath = relative(dirname(target), src);
  try {
    symlinkSync(relPath, target, 'dir');
    return true;
  } catch {
    // Fall back to a deep copy (loses live-edit convenience but still
    // compiles). We deliberately keep this best-effort and silent; the
    // wizard output already tells the user what's happening.
    cpSync(src, target, { recursive: true, dereference: true });
    return true;
  }
}

/**
 * Deployment pipeline for custom services under `services/<slug>/`.
 *
 * For each discovered service:
 *   1. Locate the Foundry-compiled artifact in `packages/foundry/out/`.
 *   2. Build an auto-manifest from the source + ABI (+ optional user overrides).
 *   3. Resolve constructor args — deployment-sourced slots come from the
 *      freshly deployed core contracts, unknown args are prompted for.
 *   4. Deploy via `forge create` (the common case) or the user's
 *      `Deploy.s.sol` if they provided one.
 *   5. Write the registry JSON consumed by the frontend's /services route
 *      and append `NEXT_PUBLIC_CUSTOM_<SLUG>_ADDRESS=0x…` to `.env`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import prompts from 'prompts';
import { execa } from 'execa';
import { success, warning, error, info, dim } from './display.js';
import { toChecksum, tryChecksum } from './address.js';
import { buildManifest, type AbiItem, type ConstructorArgSpec, type DeploymentKey, type ServiceManifest } from './manifestBuilder.js';
import type { DiscoveredService } from './services.js';

export interface CoreDeploymentSlots {
  evvm?: string;
  staking?: string;
  estimator?: string;
  treasury?: string;
  nameService?: string;
  p2pSwap?: string;
  admin?: string;
  activator?: string;
  goldenFisher?: string;
  evvmID?: string | number;
}

export interface DeployedService {
  slug: string;
  name: string;
  address: `0x${string}`;
  abi: AbiItem[];
  manifest: ServiceManifest;
  chainId: number;
  deployedAt: number;
}

export interface ServicesRegistry {
  chainId: number;
  services: Record<string, DeployedService>;
}

export function registryPath(projectRoot: string): string {
  return join(projectRoot, 'deployments', 'customservices.json');
}

function readRegistry(projectRoot: string): ServicesRegistry | null {
  const p = registryPath(projectRoot);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ServicesRegistry;
  } catch {
    return null;
  }
}

function writeRegistry(projectRoot: string, reg: ServicesRegistry): void {
  const p = registryPath(projectRoot);
  mkdirSync(join(projectRoot, 'deployments'), { recursive: true });
  writeFileSync(p, JSON.stringify(reg, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Artifact discovery
// ---------------------------------------------------------------------------

interface FoundryArtifact {
  abi: AbiItem[];
  bytecode: { object: string };
}

function readFoundryArtifact(
  projectRoot: string,
  sourceFile: string,
  contractName: string,
): FoundryArtifact | null {
  const artifactPath = join(
    projectRoot,
    'packages',
    'foundry',
    'out',
    sourceFile,
    `${contractName}.json`,
  );
  if (!existsSync(artifactPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(artifactPath, 'utf-8'));
    return { abi: raw.abi as AbiItem[], bytecode: raw.bytecode };
  } catch {
    return null;
  }
}

/**
 * Find the main contract name inside a `.sol` file. For most services the
 * file is named `Foo.sol` and contains `contract Foo { … }`; we match on
 * that by default and fall back to the first `contract` / `abstract contract`
 * declaration we find.
 */
function detectContractName(servicePath: string, mainSolFile: string): string {
  const source = readFileSync(join(servicePath, mainSolFile), 'utf-8');
  const stem = mainSolFile.replace(/\.sol$/, '');
  const byName = new RegExp(`contract\\s+${stem}\\b`, 'm');
  if (byName.test(source)) return stem;
  const any = source.match(/^\s*(?:abstract\s+)?contract\s+([A-Za-z_][A-Za-z0-9_]*)/m);
  return any?.[1] ?? stem;
}

// ---------------------------------------------------------------------------
// Constructor-arg resolution
// ---------------------------------------------------------------------------

async function resolveConstructorArgs(
  slug: string,
  args: ConstructorArgSpec[],
  slots: CoreDeploymentSlots,
): Promise<string[] | null> {
  const values: string[] = [];

  for (const a of args) {
    if (a.source === 'literal' && a.literal !== undefined) {
      values.push(a.literal);
      continue;
    }
    if (a.source === 'deployment' && a.deploymentKey) {
      const slotValue = slots[a.deploymentKey as keyof CoreDeploymentSlots];
      if (slotValue === undefined || slotValue === '') {
        warning(`${slug}: constructor arg "${a.name}" maps to ${a.deploymentKey} but that slot is empty.`);
        const ask = await prompts({
          type: 'text',
          name: 'v',
          message: `Enter value for ${a.name} (${a.type}):`,
          validate: (v: string) => (a.type === 'address' ? /^0x[a-fA-F0-9]{40}$/.test(v) : v.length > 0),
        });
        if (!ask.v) return null;
        values.push(a.type === 'address' ? toChecksum(ask.v) : ask.v);
        continue;
      }
      const str = String(slotValue);
      values.push(a.type === 'address' ? tryChecksum(str) ?? str : str);
      continue;
    }
    // prompt
    const ask = await prompts({
      type: 'text',
      name: 'v',
      message: a.promptLabel ?? `Enter value for ${a.name} (${a.type}):`,
      validate: (v: string) => (a.type === 'address' ? /^0x[a-fA-F0-9]{40}$/.test(v) : v.length > 0),
    });
    if (!ask.v) return null;
    values.push(a.type === 'address' ? toChecksum(ask.v) : ask.v);
  }
  return values;
}

// ---------------------------------------------------------------------------
// Deployment execution
// ---------------------------------------------------------------------------

interface DeployOptions {
  rpcUrl: string;
  privateKey?: string;
  keystore?: string;
  keystorePassword?: string;
}

/** Parse the deployed-address line from a `forge create` stdout. */
function parseDeployedAddress(stdout: string): `0x${string}` | null {
  const m = stdout.match(/Deployed to:\s*(0x[0-9a-fA-F]{40})/);
  return m ? (m[1] as `0x${string}`) : null;
}

async function runForgeCreate(params: {
  projectRoot: string;
  sourceRelPath: string; // e.g. "contracts/services/Counter/Counter.sol"
  contractName: string;
  constructorArgs: string[];
  deploy: DeployOptions;
}): Promise<`0x${string}` | null> {
  const { projectRoot, sourceRelPath, contractName, constructorArgs, deploy } = params;
  const args: string[] = [
    'create',
    `${sourceRelPath}:${contractName}`,
    '--rpc-url',
    deploy.rpcUrl,
    '--broadcast',
    '--via-ir',
  ];
  if (deploy.privateKey) args.push('--private-key', deploy.privateKey);
  if (deploy.keystore) {
    args.push('--keystore', deploy.keystore);
    if (deploy.keystorePassword !== undefined) {
      args.push('--password', deploy.keystorePassword);
    }
  }
  if (constructorArgs.length > 0) {
    args.push('--constructor-args', ...constructorArgs);
  }

  try {
    const { stdout } = await execa('forge', args, {
      cwd: join(projectRoot, 'packages', 'foundry'),
      stdio: 'pipe',
    });
    return parseDeployedAddress(stdout);
  } catch (err: any) {
    error(`forge create failed: ${err?.shortMessage ?? err?.message ?? err}`);
    return null;
  }
}

async function runUserDeployScript(params: {
  projectRoot: string;
  serviceDir: string;
  scriptFile: string; // absolute path to Deploy.s.sol under the service dir
  deploy: DeployOptions;
}): Promise<`0x${string}` | null> {
  const { projectRoot, scriptFile, deploy } = params;
  const scriptRelPath = scriptFile
    .replace(join(projectRoot, 'packages', 'foundry') + '/', '')
    // path starts with contracts/services/<slug>/Deploy.s.sol
    ;
  const args: string[] = [
    'script',
    `${scriptRelPath}:DeployScript`,
    '--rpc-url',
    deploy.rpcUrl,
    '--broadcast',
    '--via-ir',
  ];
  if (deploy.privateKey) args.push('--private-key', deploy.privateKey);
  if (deploy.keystore) {
    args.push('--keystore', deploy.keystore);
    if (deploy.keystorePassword !== undefined) {
      args.push('--password', deploy.keystorePassword);
    }
  }

  try {
    const { stdout } = await execa('forge', args, {
      cwd: join(projectRoot, 'packages', 'foundry'),
      stdio: 'pipe',
    });
    // User scripts typically log a `Deployed at:` or use Forge's default
    // broadcast output. We accept either a "Deployed to:" (forge create
    // style) or "deployed at:" (user log) line.
    const m =
      stdout.match(/Deployed to:\s*(0x[0-9a-fA-F]{40})/) ||
      stdout.match(/deployed at[:\s]+(0x[0-9a-fA-F]{40})/i);
    return (m?.[1] as `0x${string}`) ?? null;
  } catch (err: any) {
    error(`forge script failed: ${err?.shortMessage ?? err?.message ?? err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Top-level driver
// ---------------------------------------------------------------------------

export interface DeployCustomServicesInput {
  projectRoot: string;
  services: DiscoveredService[];
  selectedSlugs: string[];
  chainId: number;
  coreSlots: CoreDeploymentSlots;
  deploy: DeployOptions;
}

export async function deployCustomServices({
  projectRoot,
  services,
  selectedSlugs,
  chainId,
  coreSlots,
  deploy,
}: DeployCustomServicesInput): Promise<DeployedService[]> {
  const picked = services.filter((s) => selectedSlugs.includes(s.slug));
  const deployed: DeployedService[] = [];

  for (const svc of picked) {
    info(`Deploying custom service: ${svc.slug}`);
    const mainSol = svc.mainContract;
    if (!mainSol) {
      warning(`  Skipping ${svc.slug}: no .sol file found.`);
      continue;
    }

    const contractName = detectContractName(svc.path, mainSol);
    const artifact = readFoundryArtifact(projectRoot, mainSol, contractName);
    if (!artifact) {
      warning(`  Skipping ${svc.slug}: no compiled artifact at out/${mainSol}/${contractName}.json (was forge build run?)`);
      continue;
    }

    const manifest = buildManifest({
      slug: svc.slug,
      serviceDir: svc.path,
      sourceFile: join(svc.path, mainSol),
      contractName,
      abi: artifact.abi,
    });

    const args = await resolveConstructorArgs(svc.slug, manifest.constructorArgs, coreSlots);
    if (args === null) {
      warning(`  Skipping ${svc.slug}: constructor args not resolved.`);
      continue;
    }

    dim(`  Constructor args: [${args.join(', ')}]`);

    let address: `0x${string}` | null = null;
    if (svc.hasDeployScript) {
      info('  Running user Deploy.s.sol…');
      address = await runUserDeployScript({
        projectRoot,
        serviceDir: svc.path,
        scriptFile: join('contracts', 'services', svc.slug, 'Deploy.s.sol'),
        deploy,
      });
    } else {
      info('  Running forge create…');
      address = await runForgeCreate({
        projectRoot,
        sourceRelPath: join('contracts', 'services', svc.slug, mainSol),
        contractName,
        constructorArgs: args,
        deploy,
      });
    }

    if (!address) {
      error(`  ${svc.slug} deployment did not produce an address — skipping.`);
      continue;
    }

    success(`  ${svc.slug} deployed at ${address}`);

    deployed.push({
      slug: svc.slug,
      name: manifest.name,
      address,
      abi: artifact.abi,
      manifest,
      chainId,
      deployedAt: Date.now(),
    });
  }

  return deployed;
}

/**
 * Merge newly deployed services into the on-disk registry and env file.
 * Prior entries for the same chainId are replaced (we assume the local
 * chain has been flushed or redeployed).
 */
export function persistDeployments(
  projectRoot: string,
  chainId: number,
  deployed: DeployedService[],
): void {
  if (deployed.length === 0) return;

  const reg: ServicesRegistry = readRegistry(projectRoot) ?? { chainId, services: {} };
  if (reg.chainId !== chainId) {
    // New chain → start fresh.
    reg.chainId = chainId;
    reg.services = {};
  }
  for (const d of deployed) reg.services[d.slug] = d;
  writeRegistry(projectRoot, reg);

  // Append NEXT_PUBLIC_CUSTOM_<SLUG>_ADDRESS entries to the frontend .env.
  const envPath = join(projectRoot, 'packages', 'nextjs', '.env');
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
  for (const d of deployed) {
    const key = `NEXT_PUBLIC_CUSTOM_${d.slug.toUpperCase()}_ADDRESS`;
    const line = `${key}=${d.address}`;
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`^${key}=.*$`, 'm'), line);
    } else {
      envContent += (envContent.endsWith('\n') || envContent.length === 0 ? '' : '\n') + line + '\n';
    }
  }
  writeFileSync(envPath, envContent);
}

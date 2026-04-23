/**
 * Auto-manifest builder for custom services.
 *
 * Given:
 *   - a Solidity source file (for inheritance / owner-modifier detection)
 *   - the Foundry-compiled ABI
 *   - an optional user-supplied manifest.json with overrides
 *
 * produces a `ServiceManifest` — the single source of truth the frontend
 * reads to render the auto-generated interaction page and the deployment
 * flow reads to resolve constructor args.
 *
 * The generator follows the official EVVM service convention documented at
 * https://www.evvm.info/docs/HowToMakeAEVVMService: services inherit from
 * `EvvmService`, and every function uses a fixed set of canonical parameter
 * names for plumbing (signature, nonce, senderExecutor, etc.). Anything
 * outside that set is treated as a "business" arg that the UI prompts for
 * and that becomes part of the action-signature hash payload.
 */

import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FunctionRole =
  | 'read' //                view / pure
  | 'publicPay' //            has user-signed action AND EVVM pay signature
  | 'publicAction' //         user-signed action only (no pay)
  | 'admin' //                onlyOwner / similar modifier in source
  | 'write'; //               plain state-changing function with no sigs

export type ConstructorArgSource =
  | 'deployment' //           pull from the already-deployed Core/Staking/etc.
  | 'prompt' //               ask the user during wizard
  | 'literal'; //             fixed value from manifest.json override

export type DeploymentKey =
  | 'evvm'
  | 'staking'
  | 'estimator'
  | 'treasury'
  | 'nameService'
  | 'p2pSwap'
  | 'admin'
  | 'activator'
  | 'goldenFisher'
  | 'evvmID';

export interface AbiItem {
  type: string;
  name?: string;
  inputs?: AbiParam[];
  outputs?: AbiParam[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
}

export interface AbiParam {
  name: string;
  type: string;
  internalType?: string;
  indexed?: boolean;
  components?: AbiParam[];
}

export interface ConstructorArgSpec {
  name: string;
  type: string;
  source: ConstructorArgSource;
  deploymentKey?: DeploymentKey;
  literal?: string;
  promptLabel?: string;
}

export type ArgRole = 'user' | 'plumbing' | 'business';

export interface FunctionArgSpec extends AbiParam {
  role: ArgRole;
}

export interface FunctionSpec {
  name: string;
  role: FunctionRole;
  stateMutability: NonNullable<AbiItem['stateMutability']>;
  inputs: FunctionArgSpec[];
  outputs: AbiParam[];
  /**
   * Only set for publicPay / publicAction. The action hash payload is
   * `keccak256(abi.encode("<name>", ...inputs[businessArgNames]))`.
   */
  actionSignature?: { businessArgNames: string[] };
  /**
   * Only set for publicPay. Hints for building the EVVM pay signature.
   */
  payMetadata?: {
    /** Business arg name whose value should be used as the pay amount. */
    amountArg?: string;
    /** Token to pay in; defaults to the host coin of the local chain. */
    tokenSource: 'principal' | 'native' | 'literal';
    tokenLiteral?: string;
  };
}

export interface EventSpec {
  name: string;
  inputs: AbiParam[];
}

export interface ServiceManifest {
  slug: string;
  name: string;
  description?: string;
  /** Was a user-provided manifest.json merged on top of the auto-detection? */
  userOverrides: boolean;
  contract: {
    sourceFile: string;
    contractName: string;
    extendsEvvmService: boolean;
  };
  constructorArgs: ConstructorArgSpec[];
  functions: FunctionSpec[];
  events: EventSpec[];
}

// ---------------------------------------------------------------------------
// Canonical EVVM plumbing parameter names
// ---------------------------------------------------------------------------

/**
 * The `user` arg identifies the signer whose key we verify. It is not part
 * of the action hash payload but is also not a business arg the UI should
 * collect — the connected wallet is used instead.
 */
const USER_ARG_NAMES = new Set(['user']);

/**
 * Canonical plumbing names that services use when calling
 * `validateAndConsumeNonce` / `requestPay`. None of these are hashed into
 * the action payload and none should be rendered as form inputs — they are
 * derived or prompted-for separately.
 */
const PLUMBING_ARG_NAMES = new Set([
  // action signature plumbing
  'senderExecutor',
  'originExecutor',
  'nonce',
  'isAsyncExec',
  'signature',
  // pay signature plumbing (canonical names from the docs, plus common
  // variants seen in the wild: _EVVM suffix, Pay suffix)
  'priorityFeeEvvm',
  'priorityFee_EVVM',
  'priorityFeePay',
  'nonceEvvm',
  'nonce_EVVM',
  'noncePay',
  'isAsyncExecEvvm',
  'isAsyncExec_EVVM',
  'signatureEvvm',
  'signature_EVVM',
  'signaturePay',
]);

const PAY_SIG_NAMES = new Set(['signatureEvvm', 'signature_EVVM', 'signaturePay']);

// ---------------------------------------------------------------------------
// Constructor arg heuristics
// ---------------------------------------------------------------------------

/** Map a constructor-arg name to a deployed-contract slot if we recognize it. */
export function inferDeploymentKey(argName: string): DeploymentKey | null {
  const n = argName.toLowerCase().replace(/^_+/, '').replace(/address$/i, '');
  switch (n) {
    case 'core':
    case 'evvm':
    case 'coreaddress':
    case 'evvmaddress':
      return 'evvm';
    case 'staking':
      return 'staking';
    case 'estimator':
      return 'estimator';
    case 'treasury':
      return 'treasury';
    case 'nameservice':
    case 'ns':
      return 'nameService';
    case 'p2pswap':
      return 'p2pSwap';
    case 'owner':
    case 'ownerofshop':
    case 'ownerofservice':
    case 'admin':
      return 'admin';
    case 'activator':
      return 'activator';
    case 'goldenfisher':
    case 'fisher':
      return 'goldenFisher';
    case 'evvmid':
      return 'evvmID';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Source-level introspection
// ---------------------------------------------------------------------------

/**
 * Quick pattern match on the contract source to detect whether it extends
 * `EvvmService`. This is a best-effort regex — it catches the standard
 * `contract Foo is EvvmService, ... { }` shape and the `is SomeOther, EvvmService`
 * variants. Multi-line inheritance lists are supported.
 */
export function detectEvvmServiceInheritance(source: string, contractName: string): boolean {
  const escaped = contractName.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
  const re = new RegExp(
    `contract\\s+${escaped}\\s+is\\s+([^\\{]+)\\{`,
    'm',
  );
  const m = source.match(re);
  if (!m) return false;
  return m[1].split(',').some((t) => t.trim() === 'EvvmService');
}

/**
 * Detect which function names carry an `onlyOwner` (or similarly named)
 * modifier. We don't pretend to parse Solidity — we just match
 * `function name(...) ... onlyOwner` etc. with whitespace tolerance.
 */
export function detectAdminFunctions(source: string): Set<string> {
  const out = new Set<string>();
  const re = /function\s+([A-Za-z_][A-Za-z0-9_]*)[^{]*?(onlyOwner|onlyAdmin|onlyGoldenFisher|onlyActivator)\b/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    out.add(m[1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ABI → manifest
// ---------------------------------------------------------------------------

function classifyArg(argName: string): ArgRole {
  if (USER_ARG_NAMES.has(argName)) return 'user';
  if (PLUMBING_ARG_NAMES.has(argName)) return 'plumbing';
  return 'business';
}

function classifyFunction(
  fn: AbiItem,
  adminFnNames: Set<string>,
): FunctionRole {
  if (fn.stateMutability === 'view' || fn.stateMutability === 'pure') return 'read';
  if (adminFnNames.has(fn.name ?? '')) return 'admin';

  const paramNames = (fn.inputs ?? []).map((i) => i.name);
  const hasActionSig = paramNames.includes('signature');
  const hasPaySig = paramNames.some((n) => PAY_SIG_NAMES.has(n));

  if (hasActionSig && hasPaySig) return 'publicPay';
  if (hasActionSig) return 'publicAction';
  return 'write';
}

function buildFunctionSpec(
  fn: AbiItem,
  role: FunctionRole,
): FunctionSpec {
  const inputs: FunctionArgSpec[] = (fn.inputs ?? []).map((p) => ({
    ...p,
    role: classifyArg(p.name),
  }));

  const businessArgNames = inputs.filter((p) => p.role === 'business').map((p) => p.name);

  let actionSignature: FunctionSpec['actionSignature'];
  let payMetadata: FunctionSpec['payMetadata'];

  if (role === 'publicPay' || role === 'publicAction') {
    actionSignature = { businessArgNames };
  }

  if (role === 'publicPay') {
    // Heuristic: a business arg named amount / price / totalPrice / cost /
    // quantity of uint type is likely the pay amount.
    const amountArg = inputs.find(
      (p) =>
        p.role === 'business' &&
        p.type.startsWith('uint') &&
        /amount|price|cost|total/i.test(p.name),
    );
    payMetadata = {
      amountArg: amountArg?.name,
      tokenSource: 'principal',
    };
  }

  return {
    name: fn.name ?? '',
    role,
    stateMutability: fn.stateMutability ?? 'nonpayable',
    inputs,
    outputs: fn.outputs ?? [],
    actionSignature,
    payMetadata,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface BuildManifestInput {
  slug: string;
  serviceDir: string;
  sourceFile: string; // absolute path
  contractName: string;
  abi: AbiItem[];
}

/**
 * Build a manifest by combining static source analysis, ABI classification,
 * and an optional user-provided `manifest.json` next to the contract.
 */
export function buildManifest({
  slug,
  serviceDir,
  sourceFile,
  contractName,
  abi,
}: BuildManifestInput): ServiceManifest {
  const source = readFileSync(sourceFile, 'utf-8');
  const extendsEvvmService = detectEvvmServiceInheritance(source, contractName);
  const adminFnNames = detectAdminFunctions(source);

  // Constructor — take the FIRST constructor ABI entry, infer arg sources
  // from parameter names.
  const ctor = abi.find((i) => i.type === 'constructor');
  const constructorArgs: ConstructorArgSpec[] = (ctor?.inputs ?? []).map((p) => {
    const key = p.type === 'address' ? inferDeploymentKey(p.name) : null;
    if (key) {
      return { name: p.name, type: p.type, source: 'deployment', deploymentKey: key };
    }
    if (p.type === 'address' && /owner|admin/i.test(p.name)) {
      return { name: p.name, type: p.type, source: 'deployment', deploymentKey: 'admin' };
    }
    return {
      name: p.name,
      type: p.type,
      source: 'prompt',
      promptLabel: `${p.name} (${p.type})`,
    };
  });

  const functions: FunctionSpec[] = abi
    .filter((i) => i.type === 'function')
    .map((fn) => buildFunctionSpec(fn, classifyFunction(fn, adminFnNames)));

  const events: EventSpec[] = abi
    .filter((i) => i.type === 'event')
    .map((e) => ({ name: e.name ?? '', inputs: e.inputs ?? [] }));

  const base: ServiceManifest = {
    slug,
    name: contractName,
    userOverrides: false,
    contract: {
      sourceFile: basename(sourceFile),
      contractName,
      extendsEvvmService,
    },
    constructorArgs,
    functions,
    events,
  };

  // Optional user-provided overrides merged shallowly on top of each piece.
  const userPath = join(serviceDir, 'manifest.json');
  if (!existsSync(userPath)) return base;

  try {
    const user = JSON.parse(readFileSync(userPath, 'utf-8')) as Partial<ServiceManifest>;
    return {
      ...base,
      ...user,
      userOverrides: true,
      contract: { ...base.contract, ...(user.contract ?? {}) },
      constructorArgs: user.constructorArgs ?? base.constructorArgs,
      functions: user.functions ?? base.functions,
      events: user.events ?? base.events,
    };
  } catch {
    // Malformed user manifest: fall back to auto-detected. Surface via a
    // later wizard warning, not here.
    return base;
  }
}

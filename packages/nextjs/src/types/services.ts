/**
 * Types mirroring `cli/utils/manifestBuilder.ts`. Kept in sync manually;
 * both sides read the same JSON registry file.
 */

export type FunctionRole = 'read' | 'publicPay' | 'publicAction' | 'admin' | 'write';

export type ConstructorArgSource = 'deployment' | 'prompt' | 'literal';

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

export interface AbiParam {
  name: string;
  type: string;
  internalType?: string;
  indexed?: boolean;
  components?: AbiParam[];
}

export interface AbiItem {
  type: string;
  name?: string;
  inputs?: AbiParam[];
  outputs?: AbiParam[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
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
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: FunctionArgSpec[];
  outputs: AbiParam[];
  actionSignature?: { businessArgNames: string[] };
  payMetadata?: {
    amountArg?: string;
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

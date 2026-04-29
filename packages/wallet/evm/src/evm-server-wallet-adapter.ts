import type {
  ServerWalletAdapter,
  WalletAssetSnapshot,
  WalletChallenge,
  WalletChallengeRequest,
} from '@game-forge/wallet-core';
import { WalletError } from '@game-forge/wallet-core';
import {
  createPublicClient,
  erc20Abi,
  getAddress,
  http,
  isAddressEqual,
  parseAbi,
  recoverMessageAddress
} from 'viem';
import { mainnet } from 'viem/chains';

const nativeBalanceMetadataKey = 'network';
const readSymbolAbi = parseAbi(['function symbol() view returns (string)']);
const readDecimalsAbi = parseAbi(['function decimals() view returns (uint8)']);

export interface EvmTokenDefinition {
  readonly assetId: string;
  readonly contractAddress: `0x${string}`;
  readonly decimals?: number;
  readonly symbol: string;
}

export interface CreateEvmServerWalletAdapterOptions {
  readonly chainId?: number;
  readonly challengeTtlMs?: number;
  readonly rpcUrl: string;
  readonly signInMessagePrefix?: string;
  readonly tokens?: readonly EvmTokenDefinition[];
}

export const normalizeWalletAddress = (address: string) => getAddress(address as `0x${string}`);

export const createEvmServerWalletAdapter = ({
  chainId = mainnet.id,
  challengeTtlMs = 5 * 60 * 1000,
  rpcUrl,
  signInMessagePrefix = 'Sign this message to access Game Forge.',
  tokens = []
}: CreateEvmServerWalletAdapterOptions): ServerWalletAdapter => {
  const publicClient = createPublicClient({
    chain: {
      ...mainnet,
      id: chainId,
      rpcUrls: {
        default: {
          http: [rpcUrl]
        },
        public: {
          http: [rpcUrl]
        }
      }
    },
    transport: http(rpcUrl)
  });

  const formatMessage = ({ address, chainId: requestChainId, nonce }: WalletChallengeRequest & { nonce: string }) => [
    signInMessagePrefix,
    '',
    `Address: ${normalizeWalletAddress(address)}`,
    `Chain ID: ${requestChainId}`,
    `Nonce: ${nonce}`
  ].join('\n');

  return {
    chainKind: 'evm',
    createChallenge: (request): WalletChallenge => {
      const normalizedAddress = normalizeWalletAddress(request.address);
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + challengeTtlMs).toISOString();

      return {
        ...request,
        address: normalizedAddress,
        expiresAt,
        message: formatMessage({
          ...request,
          address: normalizedAddress,
          nonce
        }),
        nonce
      };
    },
    listAssets: async (identity): Promise<WalletAssetSnapshot> => {
      const walletAddress = normalizeWalletAddress(identity.address);
      const nativeBalance = await publicClient.getBalance({
        address: walletAddress
      });
      const tokenAssets = await Promise.all(tokens.map(async (token) => {
        const [balance, symbol, resolvedDecimals] = await Promise.all([
          publicClient.readContract({
            abi: erc20Abi,
            address: token.contractAddress,
            functionName: 'balanceOf',
            args: [walletAddress]
          }),
          publicClient.readContract({
            abi: readSymbolAbi,
            address: token.contractAddress,
            functionName: 'symbol'
          }),
          token.decimals ?? publicClient.readContract({
            abi: readDecimalsAbi,
            address: token.contractAddress,
            functionName: 'decimals'
          })
        ]);

        return {
          assetId: token.assetId,
          assetType: 'token',
          balance: balance.toString(),
          chainId: identity.chainId,
          chainKind: 'evm',
          contractAddress: token.contractAddress,
          decimals: Number(resolvedDecimals),
          providerKind: 'metamask',
          symbol,
          walletAddress
        } as const;
      }));

      return {
        assets: [
          {
            assetId: `native:${identity.chainId}`,
            assetType: 'native',
            balance: nativeBalance.toString(),
            chainId: identity.chainId,
            chainKind: 'evm',
            decimals: 18,
            metadata: {
              [nativeBalanceMetadataKey]: String(identity.chainId)
            },
            providerKind: 'metamask',
            symbol: 'ETH',
            walletAddress
          },
          ...tokenAssets
        ],
        chainId: identity.chainId,
        chainKind: 'evm',
        providerKind: 'metamask',
        walletAddress
      };
    },
    providerKind: 'metamask',
    verifyLogin: async (request): Promise<WalletChallengeRequest> => {
      if (request.chainId !== chainId) {
        throw new WalletError('wallet_chain_mismatch', `Unsupported chain id ${request.chainId}.`);
      }

      const normalizedAddress = normalizeWalletAddress(request.address);
      const recoveredAddress = await recoverMessageAddress({
        message: formatMessage({
          ...request,
          address: normalizedAddress
        }),
        signature: request.signature as `0x${string}`
      });

      if (!isAddressEqual(getAddress(recoveredAddress), normalizedAddress)) {
        throw new WalletError('wallet_signature_invalid', 'Signature verification failed.');
      }

      return {
        ...request,
        address: normalizedAddress
      };
    }
  };
};

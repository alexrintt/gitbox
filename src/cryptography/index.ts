import { libsodiumE2EE } from "./libsodium";

export type E2EESecret = {
  key: Uint8Array;
  nonce: Uint8Array;
};

export interface SimpleE2EE {
  createSecret: () => Promise<E2EESecret>;
  encrypt: (
    plainMessage: Uint8Array,
    secret: E2EESecret
  ) => Promise<Uint8Array>;
  decrypt: (
    encryptedMessage: Uint8Array,
    secret: E2EESecret
  ) => Promise<Uint8Array>;
  hash: (data: Uint8Array) => Promise<Uint8Array>;
}

// Export the default impl.
export const e2ee = libsodiumE2EE;

export * from "./libsodium";
export * from "./webcrypto";

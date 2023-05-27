import _sodium from "libsodium-wrappers";
import { SimpleE2EE, E2EESecret } from ".";

class LibsodiumSecretKeyCryptography implements SimpleE2EE {
  async hash(data: Uint8Array): Promise<Uint8Array> {
    await _sodium.ready;

    return _sodium.crypto_generichash(_sodium.crypto_generichash_BYTES, data);
  }

  async generateKey(): Promise<Uint8Array> {
    await _sodium.ready;

    return _sodium.randombytes_buf(_sodium.crypto_secretbox_KEYBYTES);
  }

  async generateNonce(): Promise<Uint8Array> {
    await _sodium.ready;

    return _sodium.randombytes_buf(_sodium.crypto_secretbox_NONCEBYTES);
  }

  async createSecret(): Promise<E2EESecret> {
    return {
      key: await this.generateKey(),
      nonce: await this.generateNonce(),
    };
  }

  async decrypt(
    encryptedMessage: Uint8Array,
    secret: E2EESecret
  ): Promise<Uint8Array> {
    await _sodium.ready;

    const message = _sodium.crypto_secretbox_open_easy(
      encryptedMessage,
      secret.nonce,
      secret.key
    );

    return message;
  }

  async encrypt(
    plainMessage: Uint8Array,
    secret: E2EESecret
  ): Promise<Uint8Array> {
    await _sodium.ready;

    const encryptedMessage = _sodium.crypto_secretbox_easy(
      plainMessage,
      secret.nonce,
      secret.key
    );

    return encryptedMessage;
  }
}

export const libsodiumE2EE: SimpleE2EE = new LibsodiumSecretKeyCryptography();

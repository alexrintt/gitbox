import { E2EESecret, SimpleE2EE } from ".";

export class WebCryptoAPI implements SimpleE2EE {
  async createSecret(): Promise<E2EESecret> {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

    const rawKey = await crypto.subtle.exportKey("raw", key);

    return {
      key: new Uint8Array(rawKey),
      // https://crypto.stackexchange.com/questions/41601/aes-gcm-recommended-iv-size-why-12-bytes
      nonce: crypto.getRandomValues(new Uint8Array(12)),
    };
  }
  async encrypt(
    plainMessage: Uint8Array,
    secret: E2EESecret
  ): Promise<Uint8Array> {
    const key = await this.importKey(secret);

    const encryptedMessage = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: secret.nonce,
      },
      key,
      plainMessage
    );

    return new Uint8Array(encryptedMessage);
  }

  async decrypt(
    encryptedMessage: Uint8Array,
    secret: E2EESecret
  ): Promise<Uint8Array> {
    const key = await this.importKey(secret);

    const plainMessage = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: secret.nonce,
      },
      key,
      encryptedMessage
    );

    return new Uint8Array(plainMessage);
  }

  async hash(data: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  }

  async importKey(secret: E2EESecret): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      secret.key,
      {
        name: "AES-GCM",
      },
      true,
      ["decrypt", "encrypt"]
    );
  }
}

export const webCryptoAPI: SimpleE2EE = new WebCryptoAPI();

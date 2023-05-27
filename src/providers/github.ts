import {
  GitLikeProvider,
  GitRepository,
  decodeTextUtf8,
  encodeTextUtf8,
  readBlobAsArrayBuffer,
} from ".";
import { E2EESecret, e2ee } from "../cryptography";
import {
  INVALID_TOKEN,
  validateRepoForTheCurrentUser,
} from "../redux/sagas/settings";
import { Err } from "../redux/utils";
import {
  sanitizeFilename,
  sanitizeGitRepository,
} from "../utils/string-validation";

import FileSaver from "file-saver";

export function mergeUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
  const merged = new Uint8Array(totalSize);

  arrays.forEach((array, i, arrays) => {
    const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
    merged.set(array, offset);
  });

  return merged;
}

export function setCropping(
  src: Uint8Array,
  array: Uint8Array,
  offset: number = 0
) {
  // avoid RangeError, if the [src] buffer has no enough space to set [array] buffer, then crop [array]'s end.
  src.set(array.slice(0, src.length - offset), offset);
}

export function uint16ToUint8Array2(uint16: number): Uint8Array {
  const array = new Uint8Array(2);
  const byteOffset0 = (uint16 >> 0) & 0b11111111;
  const byteoffset1 = (uint16 >> 8) & 0b11111111;
  array.set([byteOffset0], 0 / 8);
  array.set([byteoffset1], 8 / 8);
  return array;
}

export function uint16FromUint8Array2(uint8Array: Uint8Array): number {
  const byteOffset0 = uint8Array[0 / 8];
  const byteoffset1 = uint8Array[8 / 8];
  return (byteoffset1 << 8) | (byteOffset0 << 0);
}

export const byteArrayToHex = (value: Uint8Array): string => {
  return Array.from(value)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
};

// async function byteArrayToBase64(data: Uint8Array): Promise<string> {
//   // Use a FileReader to generate a base64 data URI
//   const base64url = await new Promise<string>((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = () => resolve(reader.result as string);
//     reader.onerror = () => reject();
//     reader.readAsDataURL(new Blob([data]));
//   });

//   /*
//   The result looks like
//   "data:application/octet-stream;base64,<your base64 data>",
//   so we split off the beginning:
//   */
//   return base64url.substring(base64url.indexOf(",") + 1);
// }

// buffer to base64
function byteArrayToBase64Async(buffer: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: "application/octet-binary" });

    const fileReader = new FileReader();
    fileReader.onload = function () {
      if (fileReader.result) {
        const dataUrl = fileReader.result! as string;

        const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);

        resolve(base64);
      } else {
        reject();
      }
    };
    fileReader.onerror = () => reject();
    fileReader.readAsDataURL(blob);
  });
}

function base64ToByteArrayAsync(base64: string): Promise<Uint8Array> {
  const dataUrl = "data:application/octet-binary;base64," + base64;

  return new Promise((resolve, reject) => {
    fetch(dataUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        resolve(new Uint8Array(buffer));
      })
      .catch(reject);
  });
}

const isDev = import.meta.env.MODE === "development";

const INVALID_BASE64_PAYLOAD = `INVALID_BASE64_PAYLOAD`;
const MISSING_PAYLOAD = `MISSING_PAYLOAD`;
const UNEXPECTED_HOSTNAME = `UNEXPECTED_HOSTNAME`;
const UNEXPECTED_PROTOCOL = `UNEXPECTED_PROTOCOL`;
const INVALID_URL = `INVALID_URL`;
const KEY_MISMATCH = `KEY_MISMATCH`;
const INVALID_SELF_DOMAIN = `INVALID_SELF_DOMAIN`;
const INVALID_DOWNLOAD_URL = `INVALID_DOWNLOAD_URL`;
const INVALID_FILE_PATH = `INVALID_FILE_PATH`;

export function isBase64(src: string): boolean {
  return /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/g.test(
    src
  );
}

export async function downloadRemoteFile(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (response.status !== 200) {
    const err: Err = {
      code: INVALID_DOWNLOAD_URL,
      message: `Target download URL returned status code ${response.status}. Which usually means it doesn't exists or is private`,
    };
    throw err;
  }
  return new Uint8Array(await readBlobAsArrayBuffer(await response.blob()));
}

export function byteArrayEqual(lhs: Uint8Array, rhs: Uint8Array): boolean {
  if (lhs.length !== rhs.length) {
    return false;
  }

  return lhs.every((le, i) => le === rhs[i]);
}

export function isNullptr<T>(v: T): v is T {
  return v === undefined || v === null;
}

export function validateUrl(url?: string | nullptr): Err | nullptr {
  try {
    new URL(url!);
  } catch (e) {
    const err = {
      code: INVALID_URL,
      message: `Provided download URL is not a valid URL, the link is broken`,
    };
    return err;
  }

  return undefined;
}

export function validateWindowUrl(): Err | nullptr {
  return validateSelfUrl(window.location.href);
}

export function validateSelfUrl(selfUrl: string): Err | nullptr {
  const invalidUrlErr = validateUrl(selfUrl);

  if (!isNullptr(invalidUrlErr)) {
    return invalidUrlErr;
  }

  const url = new URL(selfUrl);

  const isLocalOrMainDomain =
    (isDev && url.hostname === "localhost") ||
    (!isDev && url.hostname === "alexrintt.io");

  if (!isLocalOrMainDomain) {
    const err: Err = {
      code: INVALID_SELF_DOMAIN,
      message: `Invalid domain URL, the website is running in a odd domain, if you think it's a bug, please open a issue`,
    };
    return err;
  }

  // check for protocol?
  // not sure because sometimes github actions env outputs the website link as HTTP instead of HTTPS, so blocking HTTP may block some users

  return undefined;
}

export type nullptr = undefined | null;

export function validateDirectDownloadUrl(
  directDownloadUrl?: string | nullptr
): Err | nullptr {
  const invalidUrlErr = validateUrl(directDownloadUrl);

  if (!isNullptr(invalidUrlErr)) {
    return invalidUrlErr;
  }

  const expectedHostnames = ["raw.githubusercontent.com"];

  const directFileDownloadUrl = new URL(directDownloadUrl!);

  if (!expectedHostnames.includes(directFileDownloadUrl.hostname)) {
    // unexpected hostname, probably crafted URL
    const err = {
      code: UNEXPECTED_HOSTNAME,
      message: `The target direct download URL does not comes from a trusted/expected domain and is probably crafted and malicious`,
    };
    return err;
  }

  if (directFileDownloadUrl.protocol !== "https:") {
    // unexpected protocol, probably crafted URL
    const err = {
      code: UNEXPECTED_PROTOCOL,
      message: `The target download URL is not a HTTPS URL, this service refuses to connect over other protocols. Current is: ${directFileDownloadUrl.protocol}.`,
    };
    return err;
  }
}

export function validateDownloadUrl(downloadUrl: string): Err | nullptr {
  const windowUrlErr = validateWindowUrl();

  if (!isNullptr(windowUrlErr)) {
    return windowUrlErr;
  }

  const downloadUrlErr = validateSelfUrl(downloadUrl);

  if (!isNullptr(downloadUrlErr)) {
    return downloadUrlErr;
  }

  return undefined;
}

export function validateKeyAndNonceBase64(
  keyBase64: string | nullptr,
  nonceBase64: string | nullptr
): Err | nullptr {
  if (typeof keyBase64 !== "string" || typeof nonceBase64 !== "string") {
    // invalid missing payload
    const err = {
      code: MISSING_PAYLOAD,
      message: `Key or nonce is missing in the URL`,
    };
    return err;
  }

  if (!isBase64(keyBase64) || !isBase64(nonceBase64)) {
    // invalid base64 payload
    const err = {
      code: INVALID_BASE64_PAYLOAD,
      message: `Key or nonce provided by the URL is not a valid base64 string`,
    };
    return err;
  }

  return undefined;
}

export function extractRepoInfoFromDownloadUrl(
  unsafeDownloadUrl: string
): [Err | nullptr, GitRepository | nullptr, string[] | nullptr] {
  const downloadUrlErr = validateDownloadUrl(unsafeDownloadUrl);

  if (!isNullptr(downloadUrlErr)) {
    return [downloadUrlErr, undefined, undefined];
  }

  try {
    const downloadUrl = new URL(unsafeDownloadUrl);

    // We are using HashRouter due to GH pages not redirecting paths.
    const downloadUrlHash = downloadUrl.hash;

    const searchParams = new URLSearchParams(
      downloadUrlHash.substring(downloadUrlHash.indexOf("?"))
    );

    const directDownloadUrlStr = searchParams.get("location");

    const directDownloadUrlErr = validateDirectDownloadUrl(
      directDownloadUrlStr!
    );

    if (!isNullptr(directDownloadUrlErr)) {
      return [directDownloadUrlErr, undefined, undefined];
    }

    const directDownloadUrl = new URL(directDownloadUrlStr!);

    const [_, owner, repo, branch, ...filePath] =
      directDownloadUrl.pathname.split("/");

    const nonEmptyStrings = [owner, repo, branch];

    if (_ !== "") {
      throw new Error(`'_' must be empty but got ${_}`);
    }

    if (nonEmptyStrings.some((e) => typeof e !== "string" || e.length === 0)) {
      throw new Error(
        `[owner, repo, branch] must be non-empty strings, got: ${nonEmptyStrings}`
      );
    }

    if (!Array.isArray(filePath)) {
      throw new Error(`[remoteFilePath] must be an array, got: ${filePath}`);
    }

    if (filePath.length < 1) {
      throw new Error(
        `[remoteFilePath] must be an array with at least one path element, got: ${filePath}`
      );
    }

    const safeRepoInfo: GitRepository = sanitizeGitRepository({
      branch: branch,
      name: repo,
      owner: owner,
    });

    return [undefined, safeRepoInfo, filePath];
  } catch (e: any) {
    const err: Err = {
      code: INVALID_URL,
      message: `The provided downloadUrl ${unsafeDownloadUrl} is not valid: ${
        e?.message ?? "Unknown error"
      }`,
    };
    return [err, undefined, undefined];
  }
}

export class GitHubProvider extends GitLikeProvider {
  async deleteFile(downloadUrl: string, accessToken: string): Promise<void> {
    const [downloadUrlErr, safeRepoInfo, filePath] =
      extractRepoInfoFromDownloadUrl(downloadUrl);

    if (!isNullptr(downloadUrlErr)) {
      throw downloadUrlErr;
    }

    const [repoErr, _, __] = await validateRepoForTheCurrentUser(
      safeRepoInfo!.owner,
      safeRepoInfo!.name,
      accessToken
    );

    if (!isNullptr(repoErr)) {
      throw repoErr;
    }

    const parentPath =
      filePath!.length === 1
        ? ""
        : filePath!.slice(0, filePath!.length - 1).join("/");

    const filePathAsString = filePath!.join("/");

    const rev = `${safeRepoInfo!.branch}:${parentPath}`;

    const revResponse = await fetch(
      `https://api.github.com/repos/${safeRepoInfo!.owner}/${
        safeRepoInfo!.name
      }/git/trees/${rev}`,
      {
        method: "GET",
      }
    );

    if (revResponse.status !== 200) {
      const err: Err = {
        code: INVALID_FILE_PATH,
        message: `Provided file parent path doesn't exist: ${rev}`,
      };
      throw err;
    }

    const { tree } = await revResponse.json();

    const encryptedFilename = filePath![filePath!.length - 1];

    const [{ sha: blobSha }] = tree.filter(
      (e: any) => e.path === encryptedFilename
    );

    //api.github.com/repos/alexrintt/drive/contents/.gitbox/65b3bad60034bd82821858b2a80c014b6a2d3662619909bf1e4d6382e25c35ab
    https: await fetch(
      `https://api.github.com/repos/${safeRepoInfo!.owner}/${
        safeRepoInfo!.name
      }/contents/${filePathAsString}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          message: `Delete ${filePathAsString}`,
          sha: blobSha,
          branch: safeRepoInfo!.branch,
        }),
        headers: {
          accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }
  async downloadFile(searchParams: URLSearchParams): Promise<void> {
    const windowUrlErr = validateWindowUrl();

    if (windowUrlErr !== undefined) {
      throw windowUrlErr;
    }

    const directDownloadUrlStr = searchParams.get("location");

    const directDownloadUrlErr =
      validateDirectDownloadUrl(directDownloadUrlStr);

    if (!isNullptr(directDownloadUrlErr)) {
      throw directDownloadUrlErr;
    }

    const directDownloadUrl = new URL(decodeURI(directDownloadUrlStr!));

    const keyb64 = searchParams.get("key");
    const nonceb64 = searchParams.get("nonce");

    const keyAndNonceErr = validateKeyAndNonceBase64(keyb64, nonceb64);

    if (!isNullptr(keyAndNonceErr)) {
      throw keyAndNonceErr;
    }

    const key = await base64ToByteArrayAsync(keyb64!);
    const nonce = await base64ToByteArrayAsync(nonceb64!);

    const encryptedFileByteArray = await downloadRemoteFile(
      directDownloadUrl.toString()
    );

    const keyHashLength = uint16FromUint8Array2(
      encryptedFileByteArray.slice(0, 2)
    );

    const nonceHashLength = uint16FromUint8Array2(
      encryptedFileByteArray.slice(2, 4)
    );

    const encryptedOriginalFileNameLength = uint16FromUint8Array2(
      encryptedFileByteArray.slice(4, 6)
    );

    const initialOffset = 2 + 2 + 2;

    const [keyHashStart, keyHashEnd] = [
      initialOffset,
      initialOffset + keyHashLength,
    ];
    const [nonceHashStart, nonceHashEnd] = [
      keyHashEnd,
      keyHashEnd + nonceHashLength,
    ];
    const [encryptedOriginalFilenameStart, encryptedOriginalFilenameEnd] = [
      nonceHashEnd,
      nonceHashEnd + encryptedOriginalFileNameLength,
    ];
    const encryptedFileContentStart = encryptedOriginalFilenameEnd;

    const [
      keyHash,
      nonceHash,
      encryptedOriginalFilename,
      encryptedFileContent,
    ] = [
      encryptedFileByteArray.slice(keyHashStart, keyHashEnd),
      encryptedFileByteArray.slice(nonceHashStart, nonceHashEnd),
      encryptedFileByteArray.slice(
        encryptedOriginalFilenameStart,
        encryptedOriginalFilenameEnd
      ),
      encryptedFileByteArray.slice(encryptedFileContentStart),
    ];

    const secret: E2EESecret = {
      key: key,
      nonce: nonce,
    };

    const currentKeyHash = await e2ee.hash(secret.key);

    const currentNonceHash = await e2ee.hash(secret.nonce);

    if (
      !byteArrayEqual(currentKeyHash, keyHash) ||
      !byteArrayEqual(currentNonceHash, nonceHash)
    ) {
      const err: Err = {
        code: KEY_MISMATCH,
        message: `Incorrect key and nonce. The target file cannot be decrypted using the provided keys`,
      };
      throw err;
    } else {
      const originalFileName = decodeTextUtf8(
        await e2ee.decrypt(encryptedOriginalFilename, secret)
      );
      const fileContent = await e2ee.decrypt(encryptedFileContent, secret);

      FileSaver.saveAs(new Blob([fileContent]), originalFileName);
    }
  }

  async generateDownloadLink(
    file: File,
    unsafeRepository: GitRepository,
    accessToken: string
  ): Promise<string> {
    const safeRepository = sanitizeGitRepository(unsafeRepository);

    // File encryption AES-GCM key
    const secret = await e2ee.createSecret();

    const keyHash = await e2ee.hash(secret.key);
    const nonceHash = await e2ee.hash(secret.nonce);

    const keyHashLength = uint16ToUint8Array2(keyHash.length);
    const nonceHashLength = uint16ToUint8Array2(nonceHash.length);

    // File content encryption
    const fileArrayBuffer = await readBlobAsArrayBuffer(file);
    const encryptedFileContent = await e2ee.encrypt(
      new Uint8Array(fileArrayBuffer),
      secret
    );

    // File name sanitization
    const unsafeFilename = file.name;
    const safeFilename = sanitizeFilename(unsafeFilename);

    const originalFileName = encodeTextUtf8(safeFilename);
    const encryptedOriginalFileName = await e2ee.encrypt(
      originalFileName,
      secret
    );
    const encryptedOriginalFileNameLength = uint16ToUint8Array2(
      encryptedOriginalFileName.length
    );

    const encryptedRemoteFileContent = mergeUint8Arrays(
      keyHashLength,
      nonceHashLength,
      encryptedOriginalFileNameLength,
      keyHash,
      nonceHash,
      encryptedOriginalFileName,
      encryptedFileContent
    );

    const encryptedRemoteFileContentBase64 = await byteArrayToBase64Async(
      encryptedRemoteFileContent
    );

    const remoteFileNameHash = byteArrayToHex(
      await e2ee.hash(encryptedRemoteFileContent)
    );

    const remoteFilePath = `.gitbox/${remoteFileNameHash}`;

    // Generate file download URL and encrypt, even though public it's preferable to omit this information.
    const rawFileUrl = this.generateRawGitHubFileUrl(
      remoteFilePath,
      safeRepository
    );

    const [err, _, __] = await validateRepoForTheCurrentUser(
      safeRepository.owner,
      safeRepository.name,
      accessToken
    );

    if (!isNullptr(err)) {
      throw err;
    }

    const response = await fetch(
      `https://api.github.com/repos/${safeRepository.owner}/${safeRepository.name}/contents/${remoteFilePath}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `Upload sent`,
          content: encryptedRemoteFileContentBase64,
          branch: safeRepository.branch,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          accept: `application/vnd.github+json`,
        },
      }
    );

    if (response.status !== 201) {
      const err: Err = {
        code: INVALID_TOKEN,
        message: `File upload failed with status code ${response.status}, it may happen due to invalid token, exotic branch name or repository not available (private or deleted)`,
      };
      throw err;
    }

    const origin = window.location.origin;
    const queryParams = new URLSearchParams();
    queryParams.append("location", rawFileUrl);
    queryParams.append("key", await byteArrayToBase64Async(secret.key));
    queryParams.append("nonce", await byteArrayToBase64Async(secret.nonce));

    const downloadLink = new URL(
      `/gitbox/#/download?${queryParams.toString()}`,
      origin
    );

    return downloadLink.toString();
  }

  generateRawGitHubFileUrl(path: string, repository: GitRepository): string {
    return `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${repository.branch}/${path}`;
  }
}

export const githubProvider: GitLikeProvider = new GitHubProvider();

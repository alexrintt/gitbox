export function encodeTextUtf8(text: string): Uint8Array {
  const textEncoder = new TextEncoder();
  return textEncoder.encode(text);
}

export function decodeTextUtf8(data: Uint8Array): string {
  const textDecoder = new TextDecoder();
  return textDecoder.decode(data);
}

export type GitRepository = {
  owner: string;
  name: string;
  branch: string;
};

export async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", function (event) {
      const fileReader = event.target;

      if (fileReader) {
        resolve(fileReader!.result as ArrayBuffer);
      } else {
        reject();
      }
    });
    reader.readAsArrayBuffer(blob);
  });
}

export abstract class GitLikeProvider {
  abstract generateDownloadLink(
    file: File,
    unsafeRepository: GitRepository,
    accessToken: string
  ): Promise<string>;

  abstract downloadFile(searchParams: URLSearchParams): Promise<void>;

  /**
   * IMPORTANT
   *
   * THIS JUST PUSHES A NEW COMMIT TO THE REPOSITORY, IT DOESN'T DELETE THE FILE.
   *
   * THE FILE ALTHOUGH NOT PRESENT IN THE REPOSITORY ANYMORE CAN BE RETRIEVED THROUGH THE COMMIT HISTORY.
   */
  abstract deleteFile(downloadUrl: string, accessToken: string): Promise<void>;
}

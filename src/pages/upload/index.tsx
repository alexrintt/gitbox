import { Layout } from "../../components/layout";
import log from "loglevel";

import { useEffect, useRef, useState } from "react";
import { byteArrayToHex, githubProvider } from "../../providers/github";
import {
  Box,
  Button,
  FormControl,
  Heading,
  TreeView,
  StyledOcticon,
  Text,
  Pagehead,
  IconButton,
  Spinner,
  Flash,
} from "@primer/react";

import {
  CheckIcon,
  CopyIcon,
  DotFillIcon,
  FileAddedIcon,
  Icon,
  XIcon,
} from "@primer/octicons-react";
import { useSelector } from "react-redux";
import {
  SettingsState,
  selectSettingsState,
} from "../../redux/reducers/settings";
import { SettingsForm } from "../settings";
import { BinaryEntry, db } from "../../db";

import copyToClipboard from "copy-to-clipboard";
import { e2ee } from "../../cryptography";

export enum UploadTaskStatus {
  // User have just selected the file
  initial = "UploadTaskStatus + initial",

  // Running some async task...
  loading = "UploadTaskStatus + loading",

  // Failed to upload...
  failed = "UploadTaskStatus + failed",

  // File was uploaded and link is available
  uploaded = "UploadTaskStatus + uploaded",
}

export type UploadTask = {
  status: UploadTaskStatus;
  downloadLink?: string;
  file: FileMetadata;
  retryCount: number;
};

export type FileMetadata = {
  name: string;
  size: number;
  id: string;
  modifiedAt: number;
};

export const getFileId = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const bytes = new Uint8Array(arrayBuffer);
  return byteArrayToHex(await e2ee.hash(bytes));
};

export function UploadPage() {
  const UPLOAD_TASKS_STORAGE_KEY = "uploadTasks";

  const inputFileRef = useRef<HTMLInputElement>(null);

  const [hoveredFilename, setHoveredFileId] = useState<string | undefined>(
    undefined
  );

  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  const [clickedDownloadLink, setClickedDownloadLink] = useState<
    string | undefined
  >(undefined);

  const settings: SettingsState = useSelector(selectSettingsState());
  const [uploadTasks, setUploadTasks] = useState<Record<string, UploadTask>>(
    (() => {
      try {
        const previous = JSON.parse(
          window.localStorage.getItem(UPLOAD_TASKS_STORAGE_KEY) ?? "{}"
        );

        if (typeof previous !== "object") {
          return {};
        }

        for (const k of Object.keys(previous)) {
          if (Array.isArray(previous[k])) {
            delete previous[k];
          }
          if (typeof previous[k].file !== "object") {
            delete previous[k];
          }
          if (typeof previous[k].file.size !== "number") {
            delete previous[k];
          }
          if (typeof previous[k].file.name !== "string") {
            delete previous[k];
          }
          if (typeof previous[k].file.id !== "string") {
            delete previous[k];
          }
          if (typeof previous[k].retryCount !== "number") {
            delete previous[k];
          }
        }

        return previous;
      } catch (e) {
        console.log(`Error tring to recover previous uploaded tasks: ${e}`);
        return {};
      }
    })()
  );

  const filterTasks = (
    predicate: (task: UploadTask) => boolean
  ): Record<string, UploadTask> => {
    return Object.entries(uploadTasks)
      .filter(([_, value]) => predicate(value))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  };

  function notUndefined<T>(e: T): boolean {
    return e !== undefined && e !== null;
  }

  const running = useRef<boolean>(false);

  const pendingTasks = filterTasks(
    (task) => task.status !== UploadTaskStatus.uploaded
  );

  const pendingFiles: FileMetadata[] = Object.values(pendingTasks)
    .map((e) => e.file)
    .filter(notUndefined) as FileMetadata[];

  const sharedUploadTasks: UploadTask[] = Object.values(
    filterTasks((task) => task.status !== UploadTaskStatus.initial)
  );

  function dec2hex(dec: number) {
    return dec.toString(16).padStart(2, "0");
  }

  // generateId :: Integer -> String
  function generateId(len: number = 40) {
    var arr = new Uint8Array(len / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join("");
  }

  const handleSelectImage: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    log.info("[Files]", "New files were selected");

    const rawFiles: File[] = [...(e.target.files ?? [])];

    // User is allowed to upload the same file multiple times.
    e.target.value = "";
    e.target.files = new DataTransfer().files;

    const binaryEntries: BinaryEntry[] = await Promise.all<BinaryEntry>(
      rawFiles.map(async (rawFile): Promise<BinaryEntry> => {
        const arrayBuffer = await rawFile.arrayBuffer();
        return {
          modifiedAt: Date.now(),
          name: rawFile.name,
          size: rawFile.size,
          arrayBuffer: arrayBuffer,
          id: generateId(),
        };
      })
    );

    const files: FileMetadata[] = binaryEntries.map(
      (entry: BinaryEntry): FileMetadata => {
        return {
          modifiedAt: entry.modifiedAt,
          id: entry.id,
          name: entry.name,
          size: entry.size,
        };
      }
    );

    db.binaryEntries.bulkAdd(binaryEntries);

    const tasks: Record<string, UploadTask> = [...files].reduce(
      (acc, file): Record<string, UploadTask> => {
        return {
          ...acc,
          [file.id]: {
            status: UploadTaskStatus.initial,
            downloadLink: undefined,
            retryCount: 0,
            file: {
              id: file.id,
              name: file.name,
              size: file.size,
              modifiedAt: file.modifiedAt,
            },
          },
        };
      },
      {}
    );

    setUploadTasks((currentUploadTasks) => {
      return {
        ...currentUploadTasks,
        ...tasks,
      };
    });
  };

  useEffect(() => {
    window.localStorage.setItem(
      UPLOAD_TASKS_STORAGE_KEY,
      JSON.stringify(uploadTasks)
    );
  }, [uploadTasks]);

  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof clickedDownloadLink !== "undefined") {
      window.clearTimeout(timeout.current);

      copyToClipboard(clickedDownloadLink);

      timeout.current = window.setTimeout(() => {
        setClickedDownloadLink(undefined);
      }, 2500);
    }
  }, [clickedDownloadLink]);

  useEffect(() => {
    handleFilesUpload();
  }, [pendingFiles]);

  async function handleFilesUpload() {
    if (!pendingFiles) return;

    if (!settings.verified.valid) {
      // Is not a valid setting...
      return;
    }

    if (running.current) {
      return;
    }

    for (const pendingTask of Object.values(pendingTasks)!) {
      if (pendingTask.retryCount > 5) {
        continue;
      }

      const file = pendingTask.file;

      running.current = true;
      try {
        setUploadTasks((currentUploadTasks) => {
          return {
            ...currentUploadTasks,
            [file.id]: {
              ...currentUploadTasks[file.id],
              status: UploadTaskStatus.loading,
            },
          };
        });

        const binaryEntry = await db.binaryEntries.get({
          id: file.id,
        });

        if (binaryEntry === undefined) {
          log.error(
            `Expecting [binaryEntry] of ${file.name} but got undefined, is it a valid file?`
          );
          return;
        }

        const bytes = new Uint8Array(binaryEntry.arrayBuffer);

        try {
          const downloadLink = await githubProvider.generateDownloadLink(
            new File([bytes], binaryEntry.name),
            settings.verified.repository,
            settings.verified.accessToken
          );

          setUploadTasks((currentUploadTasks) => {
            return {
              ...currentUploadTasks,
              [file.id]: {
                ...currentUploadTasks[file.id],
                status: UploadTaskStatus.uploaded,
                downloadLink,
              },
            };
          });
        } catch (e: any) {
          let error: string = "";

          if (typeof e.code === "string") {
            error += e.code + " ";
          }

          if (typeof e.message === "string") {
            error += e.message;
          }
          if (error.length > 0) {
            setErrorMessage(error);
          } else {
            setErrorMessage(
              `Unknown error ocurred, please contact the download link provider`
            );
          }

          setUploadTasks((currentUploadTasks) => {
            return {
              ...currentUploadTasks,
              [file.id]: {
                ...currentUploadTasks[file.id],
                status: UploadTaskStatus.failed,
                retryCount: pendingTask.retryCount + 1,
              },
            };
          });
        }
      } finally {
        running.current = false;
      }
    }
  }

  function formatBytes(bytes: number) {
    const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    let l = 0,
      n = bytes;

    while (n >= 1000 && ++l) {
      n = n / 1000;
    }

    return n.toFixed(n < 10 && l > 0 ? 1 : 0) + " " + units[l];
  }

  return (
    <Layout>
      <Pagehead>
        <Heading>Upload files</Heading>
      </Pagehead>

      {!settings.verified.valid ? (
        <SettingsForm />
      ) : (
        <>
          <input
            multiple
            onChange={handleSelectImage}
            ref={inputFileRef}
            style={{ display: "none" }}
            type="file"
          />
          <Box display="grid" gridGap={3}>
            <FormControl>
              <FormControl.Label>Select files</FormControl.Label>
              <Box>
                <Button
                  variant="outline"
                  onClick={() => {
                    inputFileRef.current?.click();
                  }}
                >
                  <Box
                    sx={{
                      display: "inline",
                      marginRight: "0.5rem",
                    }}
                  >
                    <FileAddedIcon />
                  </Box>
                  Upload files
                </Button>
              </Box>
            </FormControl>
          </Box>
        </>
      )}

      <br />

      <Box sx={{ maxWidth: 720 }}>
        <TreeView aria-label="Files">
          {settings.verified.valid && sharedUploadTasks.length === 0 && (
            <Text mb={3}>No files uploaded yet.</Text>
          )}
          {typeof errorMessage === "string" && (
            <Box mb={3}>
              <Flash variant="danger">{errorMessage}</Flash>
            </Box>
          )}
          {sharedUploadTasks.length > 0 &&
            [...sharedUploadTasks]
              .sort((a, z) => a.file.modifiedAt - z.file.modifiedAt)
              .map((uploadTask) => {
                return (
                  <span
                    onMouseOver={() => setHoveredFileId(uploadTask.file.id)}
                    onMouseOut={() => setHoveredFileId(undefined)}
                  >
                    <TreeView.Item
                      id={uploadTask.file.id}
                      onSelect={() => {
                        if (uploadTask.downloadLink) {
                          setClickedDownloadLink(uploadTask.downloadLink!);
                        }
                      }}
                    >
                      <TreeView.LeadingVisual>
                        {(() => {
                          let icon: Icon;

                          if (uploadTask.status === UploadTaskStatus.uploaded) {
                            if (
                              uploadTask.downloadLink !== undefined &&
                              clickedDownloadLink === uploadTask.downloadLink
                            ) {
                              icon = CheckIcon;
                            } else if (hoveredFilename === uploadTask.file.id) {
                              icon = CopyIcon;
                            } else {
                              icon = DotFillIcon;
                            }
                          } else {
                            icon = DotFillIcon;
                          }

                          let color: string;

                          switch (uploadTask.status) {
                            case UploadTaskStatus.failed:
                              color = "danger.fg";
                              break;
                            case UploadTaskStatus.initial:
                            case UploadTaskStatus.loading:
                              color = "attention.fg";
                              break;
                            case UploadTaskStatus.uploaded:
                              color = "success.fg";
                              break;
                          }

                          return (
                            <StyledOcticon
                              icon={icon}
                              color={color}
                              aria-label="Decoration icon"
                            />
                          );
                        })()}
                      </TreeView.LeadingVisual>
                      <Box>
                        <b>
                          <Text>{uploadTask.file.name}</Text>
                        </b>
                        {uploadTask.downloadLink && (
                          <>
                            <br />
                            <Text sx={{ opacity: 0.5 }}>
                              {uploadTask.downloadLink ?? "Loading..."}
                            </Text>
                          </>
                        )}
                      </Box>
                      <TreeView.TrailingVisual>
                        <Box>
                          <Text mr={2}>
                            {formatBytes(uploadTask.file.size)}
                          </Text>

                          {uploadTask.status === UploadTaskStatus.loading ? (
                            <Spinner size="small" />
                          ) : (
                            <IconButton
                              style={{ margin: "0.2rem 0" }}
                              aria-labelledby="Remove file"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const removeFromState = () =>
                                  setUploadTasks((uploadTasks) => {
                                    const tasks = { ...uploadTasks };

                                    delete tasks[uploadTask.file.id];

                                    return tasks;
                                  });

                                if (
                                  uploadTask.status === UploadTaskStatus.failed
                                ) {
                                  removeFromState();
                                  return;
                                }

                                if (
                                  uploadTask?.downloadLink &&
                                  settings.verified.valid
                                ) {
                                  try {
                                    setUploadTasks((uploadTasks) => {
                                      const tasks: Record<string, UploadTask> =
                                        {
                                          ...uploadTasks,
                                          [uploadTask.file.id]: {
                                            ...uploadTask,
                                            status: UploadTaskStatus.loading,
                                          },
                                        };

                                      return tasks;
                                    });

                                    await githubProvider.deleteFile(
                                      uploadTask!.downloadLink!,
                                      settings.verified.accessToken
                                    );
                                  } finally {
                                    removeFromState();
                                  }
                                }
                              }}
                              icon={() => (
                                <StyledOcticon
                                  icon={XIcon}
                                  color="danger.fg"
                                  aria-label="added"
                                />
                              )}
                            />
                          )}
                        </Box>
                      </TreeView.TrailingVisual>
                    </TreeView.Item>
                  </span>
                );
              })}
        </TreeView>
      </Box>
    </Layout>
  );
}

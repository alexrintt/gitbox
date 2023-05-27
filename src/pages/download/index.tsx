import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { githubProvider } from "../../providers/github";
import { Layout } from "../../components/layout";
import { Box, Button, Spinner, Text } from "@primer/react";

export function DownloadPage() {
  const [searchParams] = useSearchParams();
  const [finished, setFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  const downloadFile = async (): Promise<void> => {
    await githubProvider.downloadFile(searchParams);
  };

  async function tryDownload() {
    try {
      setFinished(false);

      await downloadFile();
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
    } finally {
      setFinished(true);
    }
  }

  useEffect(() => {
    tryDownload();
  }, []);

  const displayCenterStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <Layout>
      <div style={displayCenterStyle}>
        {(() => {
          if (finished) {
            if (typeof errorMessage === "string") {
              return (
                <>
                  <Box
                    mb={3}
                    sx={{
                      ...displayCenterStyle,
                      flexDirection: "column",
                    }}
                  >
                    <Text mb={3}>Download error</Text>
                    <b>
                      <code>{errorMessage}</code>
                    </b>
                    <br />
                    <Button onClick={tryDownload} variant="primary">
                      Try again
                    </Button>
                  </Box>
                </>
              );
            } else {
              return (
                <>
                  <Box
                    sx={{
                      ...displayCenterStyle,
                      flexDirection: "column",
                    }}
                  >
                    <Text mb={3}>
                      Download finished! If it didn't work, try clicking in the
                      button below
                    </Text>
                    <Button onClick={tryDownload} variant="primary">
                      Download
                    </Button>
                  </Box>
                </>
              );
            }
          } else {
            return <Spinner size="medium" />;
          }
        })()}
      </div>
    </Layout>
  );
}

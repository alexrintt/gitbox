import { Box, Link, Text } from "@primer/react";

import { Footer } from "@primer/react/drafts";

export function LayoutFooter() {
  return (
    <>
      <Footer>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "1280px",
              display: "flex",
              paddingBottom: "2rem",
              justifyContent: "space-between",
            }}
          >
            <Text>This project has no affiliation with GitHub Inc.</Text>
          </Box>
          <Box
            sx={{
              width: "100%",
              maxWidth: "1280px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <Link href="https://alexrintt.io/obsidian/how-to-use-gitbox-to-upload-and-share-files-privately-through-public-git-repositories/">
              <Text mr={3}>How to use</Text>
            </Link>
            <Link href="https://t.me/alexrintt/">
              <Text mr={3}>Help and support</Text>
            </Link>
            <Link href="https://discord.alexrintt.io/">
              <Text mr={3}>Discord server</Text>
            </Link>
            <Link href="https://donate.alexrintt.io/">
              <Text mr={3}>Donate</Text>
            </Link>

            <Link href="https://alexrintt.io/obsidian/web-crypto-api-aes-gcm-react-github-api-primer-design...-a-deep-dive-into-how-gitbox-works/">
              <Text mr={3}>How GitBox was built</Text>
            </Link>
          </Box>
          <Box
            sx={{
              width: "100%",
              maxWidth: "1280px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <Link href="https://github.com/alexrintt">
              <Text mr={3}>Check my other projects</Text>
            </Link>
            <Link href="https://www.figma.com/@ssshadek">
              <Text mr={3}>Project icon by @ssshadek</Text>
            </Link>
          </Box>
        </Box>
      </Footer>
    </>
  );
}

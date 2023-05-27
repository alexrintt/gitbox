import { Box, Header, IconButton, Link } from "@primer/react";
import { AppIcon } from "./icon";

import { Link as RouterLink } from "react-router-dom";
import { GearIcon, UploadIcon } from "@primer/octicons-react";

export function LayoutHeader() {
  return (
    <Header>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            maxWidth: "1280px",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Header.Item>
            <Link
              sx={{ display: "flex", alignItems: "center" }}
              as={RouterLink}
              to="/"
            >
              <AppIcon
                width={32}
                height={32}
                style={{ marginRight: "0.25rem" }}
              />
              GitBox
            </Link>
          </Header.Item>

          <Header.Item full></Header.Item>

          <Header.Item>
            <Link as={RouterLink} to="/">
              <IconButton
                icon={() => <UploadIcon />}
                onClick={() => {}}
                aria-labelledby="Upload new files"
              />
            </Link>
          </Header.Item>
          <Header.Item>
            <Link as={RouterLink} to="/settings">
              <IconButton
                icon={() => <GearIcon />}
                onClick={() => {}}
                aria-labelledby="Manage your repository settings"
              />
            </Link>
          </Header.Item>
        </Box>
      </Box>
    </Header>
  );
}

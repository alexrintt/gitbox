import { useDispatch, useSelector } from "react-redux";
import { Layout } from "../../components/layout";

// import { firebaseAuth } from "../../firebase";
import {
  Box,
  FormControl,
  Link,
  TextInput,
  Heading,
  Pagehead,
  Button,
  Spinner,
  Text,
} from "@primer/react";
import { ApplicationState } from "../../redux";
import { useCallback, useEffect, useState } from "react";
import {
  ProviderSettings,
  SettingsAction,
  SettingsActionType,
} from "../../redux/reducers/settings";
import { useHotkeys } from "react-hotkeys-hook";
import { Err } from "../../redux/utils";
import {
  INVALID_TOKEN,
  PRIVATE_OR_NON_EXISTENT_REPOSITORY,
  USER_HAS_NO_WRITE_PERMISSION,
} from "../../redux/sagas/settings";
import { sanitizeGitBranchName } from "../../utils/string-validation";

export function SettingsForm() {
  const settings = useSelector((state: ApplicationState) => state.settings);

  const { owner, name: repo } = settings.unverified.repository;

  const [repositoryUrl, setRepositoryUrl] = useState<string>(
    (() => {
      if (owner.length > 0 && repo.length > 0) {
        return `https://github.com/${owner}/${repo}`;
      }
      return "";
    })()
  );

  const dispatch = useDispatch();

  const [repositoryErr, accessTokenErr]: [Err | undefined, Err | undefined] =
    (() => {
      if (settings.err) {
        switch (settings.err.code) {
          case INVALID_TOKEN:
          case USER_HAS_NO_WRITE_PERMISSION:
            return [undefined, settings.err];
          case PRIVATE_OR_NON_EXISTENT_REPOSITORY:
          default:
            return [settings.err, undefined];
        }
      }
      return [undefined, undefined];
    })();

  const unverifiedSettings = settings.unverified;

  const thereIsNoValidSettings = !settings.verified.valid;

  useEffect(() => {
    try {
      const url = new URL(repositoryUrl);
      const [_, owner, repo] = url.pathname.split("/");

      if (typeof owner !== "string" || typeof repo !== "string") {
        return;
      }

      dispatch<SettingsAction<ProviderSettings>>({
        type: SettingsActionType.modifySettings,
        payload: {
          ...unverifiedSettings,
          repository: {
            ...unverifiedSettings.repository,
            name: repo,
            owner: owner,
          },
        },
      });
    } catch (e) {
      // Invalid URL, probably the user is editing/typing the URL.
    }
  }, [repositoryUrl]);

  const onChangeRepositoryUrl = useCallback(
    (value: string) => setRepositoryUrl(value),
    []
  );

  const onChangeAccessToken = useCallback(
    (accessToken: string) => {
      dispatch<SettingsAction<ProviderSettings>>({
        type: SettingsActionType.modifySettings,
        payload: {
          ...unverifiedSettings,
          accessToken: accessToken,
        },
      });
    },
    [unverifiedSettings]
  );

  const requestSaveSettings = useCallback(() => {
    dispatch<SettingsAction<void>>({
      type: SettingsActionType.saveSettingsIfValid,
    });
  }, []);

  const requestClearSettings = useCallback(() => {
    dispatch<SettingsAction<void>>({
      type: SettingsActionType.clear,
    });
    setRepositoryUrl("");
  }, []);

  useHotkeys("ctrl + enter", requestSaveSettings, {
    enableOnFormTags: true,
  });

  const branchHasIssues =
    sanitizeGitBranchName(settings.verified.repository.branch) !==
    settings.verified.repository.branch;

  return (
    <Box display="grid" gridGap={3}>
      <FormControl>
        <FormControl.Label>Repository URL</FormControl.Label>
        <FormControl.Caption>
          The repository that will act as file drive, it's recommended to create
          a fresh one, e.g <code>https://github.com/alexrintt/drive</code>.
        </FormControl.Caption>
        {repositoryErr && (
          <FormControl.Validation variant="error">
            {repositoryErr.message}
          </FormControl.Validation>
        )}
        <TextInput
          minWidth={350}
          value={repositoryUrl}
          onChange={(e) => onChangeRepositoryUrl(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormControl.Label>Access token</FormControl.Label>
        <FormControl.Caption>
          Access token that has read/write permissions over the target
          repository.{" "}
          <Link href="https://alexrintt.io/obsidian/creating-a-fine-grained-github-access-token-that-has-permission-only-over-a-specific-single-repository/">
            How to generate a token with permissions over a specific repository?
          </Link>
        </FormControl.Caption>
        <TextInput
          minWidth={350}
          type="password"
          monospace
          value={settings.unverified.accessToken}
          onChange={(e) => onChangeAccessToken(e.target.value)}
        />
        {accessTokenErr && (
          <FormControl.Validation variant="error">
            {accessTokenErr.message}
          </FormControl.Validation>
        )}
      </FormControl>
      <FormControl>
        <FormControl.Label>Branch</FormControl.Label>
        <FormControl.Caption>Default repository branch</FormControl.Caption>
        {branchHasIssues && (
          <FormControl.Validation variant="error">
            Your branch contains special characters or is too long (64 chars),
            rename it to a word-like string to upload your files.
          </FormControl.Validation>
        )}

        <TextInput
          disabled
          readOnly
          minWidth={350}
          monospace
          value={settings.verified.repository.branch}
        />
      </FormControl>
      <FormControl>
        <Box sx={{ display: "flex" }}>
          <Button variant="primary" onClick={() => requestSaveSettings()}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {settings.loading && (
                <>
                  <Spinner size="small" />
                  <span style={{ paddingRight: "0.5rem" }} />
                </>
              )}

              <Text>
                {settings.verified.valid ? "Refresh settings" : "Save settings"}
              </Text>
            </Box>
          </Button>
          <span style={{ paddingRight: "0.5rem" }} />
          <Button
            variant="danger"
            onClick={() => requestClearSettings()}
            disabled={thereIsNoValidSettings}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Text>Clear settings</Text>
            </Box>
          </Button>
        </Box>
        {typeof settings.err === "undefined" && settings.success && (
          <>
            <span style={{ paddingLeft: "0.5rem" }} />
            <FormControl.Validation variant="success">
              Saved settings!
            </FormControl.Validation>
          </>
        )}
      </FormControl>
    </Box>
  );
}

export function SettingsPage() {
  return (
    <Layout>
      <Pagehead>
        <Heading>Repository settings</Heading>
      </Pagehead>
      <SettingsForm />
    </Layout>
  );
}

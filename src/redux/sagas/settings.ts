import { all, call, put, select, takeLatest } from "redux-saga/effects";

import {
  ProviderSettings,
  SETTINGS_PERSISTENCE_STORAGE_KEY,
  SettingsAction,
  SettingsActionType,
  selectSettingsState,
  selectUnverifiedProviderSettings,
} from "../reducers/settings";
import { Err } from "../utils";

export const INVALID_TOKEN = `INVALID_TOKEN`;

export async function getUserFromAccessToken(
  accessToken: string
): Promise<unknown | undefined> {
  try {
    if (accessToken.length === 0) {
      // Token is empty
      return undefined;
    }

    const response = await fetch(`https://api.github.com/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.status === 200) {
      return await response.json();
    }
  } catch (e) {
    return undefined;
  }

  return undefined;
}

export async function getRepositoryIfItExistsAndIsPublic(
  owner: string,
  repo: string,
  accessToken: string // to prevent 429
): Promise<unknown> {
  try {
    if (owner.length === 0 || repo.length === 0) {
      return undefined;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (response.status === 200) {
      const repository = await response.json();

      if (repository.private) {
        return undefined;
      }

      return repository;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
}

export async function checkIfUserIsRepositoryCollaborator(
  owner: string,
  repo: string,
  loggedUserLogin: string,
  accessToken: string // to prevent 429
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators/${loggedUserLogin}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.status === 204;
  } catch (e) {
    return false;
  }
}

export function* saveVerifiedStateToLocalStorage() {
  yield takeLatest(
    SettingsActionType.saveVerifiedSettings,
    function* (_: SettingsAction) {
      const settingsState: ProviderSettings = yield select(
        selectSettingsState()
      );

      window.localStorage.setItem(
        SETTINGS_PERSISTENCE_STORAGE_KEY,
        JSON.stringify(settingsState)
      );

      yield call(() => new Promise((r) => setTimeout(r, 1500)));

      yield put<SettingsAction<void>>({
        type: SettingsActionType.removeSuccessFeedback,
      });
    }
  );
}

export function* clearSettingsDataWhenRequested() {
  yield takeLatest(SettingsActionType.clear, function* (_: SettingsAction) {
    window.localStorage.removeItem(SETTINGS_PERSISTENCE_STORAGE_KEY);
  });
}

export const USER_HAS_NO_WRITE_PERMISSION = `USER_HAS_NO_WRITE_PERMISSION`;
export const PRIVATE_OR_NON_EXISTENT_REPOSITORY = `PRIVATE_OR_NON_EXISTENT_REPOSITORY`;

/**
 * Fetch the repository data and the logged user data if access token has write-permission to the repository.
 *
 * @param owner The target repository owner login.
 * @param name The target repository name.
 * @param accessToken The logged user access token.
 * @returns A promise that resolves with an 3-length array that represents respectively: error or undefined, the repository data or undefined, the logged user info or undefined.
 */
export async function validateRepoForTheCurrentUser(
  owner: string,
  name: string,
  accessToken: string
): Promise<[Err | undefined, unknown | undefined, unknown | undefined]> {
  const loggedUser: unknown | undefined = await getUserFromAccessToken(
    accessToken
  );

  if (typeof loggedUser === "undefined") {
    const err: Err = {
      code: INVALID_TOKEN,
      message: `The provided token is not valid or expired`,
    };
    return [err, undefined, undefined];
  }

  const repo: unknown = await getRepositoryIfItExistsAndIsPublic(
    owner,
    name,
    accessToken
  );

  if (typeof repo === "undefined") {
    const err: Err = {
      code: PRIVATE_OR_NON_EXISTENT_REPOSITORY,
      message: `The provided repository is private or doesn't exists. Only public repositories are allowed.`,
    };
    return [err, undefined, undefined];
  }

  const userIsCollab = await checkIfUserIsRepositoryCollaborator(
    owner,
    name,
    (loggedUser as any).login,
    accessToken
  );

  if (!userIsCollab) {
    const err: Err = {
      code: USER_HAS_NO_WRITE_PERMISSION,
      message: `The provided access token doesn't have write permission on the target repository.`,
    };
    return [err, undefined, undefined];
  }

  return [undefined, repo, loggedUser];
}

export function* checkProviderSettingsOnTryingToSave() {
  yield takeLatest(
    SettingsActionType.saveSettingsIfValid,
    function* (_: SettingsAction) {
      const unverified: ProviderSettings = yield select(
        selectUnverifiedProviderSettings()
      );

      const validation: [
        Err | undefined,
        unknown | undefined,
        unknown | undefined
      ] = yield call(
        validateRepoForTheCurrentUser,
        unverified.repository.owner,
        unverified.repository.name,
        unverified.accessToken
      );

      const [err, repo, __] = validation;

      if (typeof err !== "undefined") {
        yield put<SettingsAction<Err>>({
          type: SettingsActionType.verificationFailed,
          payload: err,
        });
        return;
      }

      const { default_branch: defaultRepoBranch } = repo as any;

      const verifiedSettings: ProviderSettings = {
        accessToken: unverified.accessToken,
        repository: {
          ...unverified.repository,
          branch: defaultRepoBranch,
        },
        valid: true,
      };

      yield put<SettingsAction<ProviderSettings>>({
        type: SettingsActionType.saveVerifiedSettings,
        payload: verifiedSettings,
      });
    }
  );
}

export default function* rootTransactionSaga() {
  yield all([
    checkProviderSettingsOnTryingToSave(),
    saveVerifiedStateToLocalStorage(),
    clearSettingsDataWhenRequested(),
    // deleteTransactionSaga(),
    // editTransactionSaga(),
  ]);
}

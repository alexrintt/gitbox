import type { Action } from "@reduxjs/toolkit";

import { ApplicationState } from "..";
// import { User as FirebaseUser } from "firebase/auth";
import { GitRepository } from "../../providers";
import { Err, Maybe, StateSelector, withScope } from "../utils";

export enum SettingsActionType {
  saveSettingsIfValid = "SettingsActionType + requestSaveSettings",
  saveVerifiedSettings = "SettingsActionType + saveVerifiedSettings",
  removeSuccessFeedback = "SettingsActionType + removeSuccessFeedback",
  modifySettings = "SettingsActionType + modifySettings",
  verificationFailed = "SettingsActionType + verificationFailed",
  clear = "SettingsActionType + clear",
}

export interface SettingsAction<P = any> extends Action<SettingsActionType> {
  // Added for simplicity, but this is inherited from [Action]
  type: SettingsActionType;

  payload?: P;
  id?: string;
}

export type GitHubOrg = {
  login: string;
  id: string;
};

export type ProviderSettings = {
  repository: GitRepository;
  accessToken: string;
  valid: boolean;
};

export type SettingsState = {
  verified: ProviderSettings;
  unverified: ProviderSettings;
  success: boolean;
  loading: boolean;
  err: Maybe<Err>;
};

export const SETTINGS_PERSISTENCE_STORAGE_KEY = `settingsStoreState`;

const defaultState = {
  verified: {
    accessToken: "",
    repository: {
      branch: "",
      name: "",
      owner: "",
    },
    valid: false,
  },
  unverified: {
    accessToken: "",
    repository: {
      branch: "",
      name: "",
      owner: "",
    },
    valid: false,
  },
  success: false,
  err: undefined,
  loading: false,
};

export const preloadedState: SettingsState =
  tryRecoverSavedState(SETTINGS_PERSISTENCE_STORAGE_KEY) ?? defaultState;

export function selectUnverifiedProviderSettings(): StateSelector<ProviderSettings> {
  return (state: ApplicationState) => state.settings.unverified;
}

export function selectSettingsState(): StateSelector<SettingsState> {
  return (state: ApplicationState) => state.settings;
}

export function tryRecoverSavedState<T>(
  localStorageKey: string
): T | undefined {
  const serialized = window.localStorage.getItem(localStorageKey);
  if (typeof serialized === "string") {
    try {
      return JSON.parse(serialized) as T;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

export function settingsReducer(
  state: SettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case SettingsActionType.saveSettingsIfValid:
      return withScope<SettingsState>(() => {
        return {
          ...state,
          loading: true,
        };
      });
    case SettingsActionType.saveVerifiedSettings:
      return withScope<SettingsState>(() => {
        const verified = action.payload as ProviderSettings;

        return {
          ...state,
          loading: false,
          verified: verified,
          unverified: verified,
          success: true,
          err: undefined,
        };
      });
    case SettingsActionType.modifySettings:
      return withScope<SettingsState>(() => {
        const unverified = action.payload;
        return {
          ...state,
          verified: state.verified,
          unverified: unverified,
          success: false,
          err: undefined,
        };
      });
    case SettingsActionType.removeSuccessFeedback:
      return withScope<SettingsState>(() => {
        return {
          ...state,
          success: false,
        };
      });
    case SettingsActionType.verificationFailed:
      return withScope<SettingsState>(() => {
        const err: Err = action.payload;
        return {
          ...state,
          loading: false,
          err: err,
        };
      });
    case SettingsActionType.clear:
      return withScope<SettingsState>(() => {
        return defaultState;
      });
    default:
      return withScope<SettingsState>(() => state ?? defaultState);
  }
}

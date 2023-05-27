import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";

import rootSaga from "./saga";

import type { ReducersMapObject } from "@reduxjs/toolkit";

import {
  SettingsState,
  preloadedState as settingsPreloadedState,
  settingsReducer,
} from "./reducers/settings";

const sagaMiddleware = createSagaMiddleware<ApplicationState>();

export type ApplicationState = {
  settings: SettingsState;
};

export const rootReducer: ReducersMapObject = {
  settings: settingsReducer,
};

export const preloadedState: ApplicationState = {
  settings: settingsPreloadedState,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => [
    ...getDefaultMiddleware(),
    sagaMiddleware,
  ],
  devTools: true,
  preloadedState: preloadedState,
});

sagaMiddleware.run(rootSaga);

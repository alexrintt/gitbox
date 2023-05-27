import { all } from "redux-saga/effects";

import settingsSaga from "./sagas/settings";

export default function* rootSaga() {
  yield all([settingsSaga()]);
}

import {
  RouteObject,
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
import { UploadPage } from "../pages/upload";
import { SetupPage } from "../pages/setup";
import { DownloadPage } from "../pages/download";
import { SettingsPage } from "../pages/settings";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <UploadPage />,
  },
  {
    path: "/setup",
    element: <SetupPage />,
  },
  {
    path: "/download",
    element: <DownloadPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
];

export const hashRouter = createHashRouter(routes);

export function Routes() {
  return <RouterProvider router={hashRouter} />;
}

import { Provider } from "react-redux";
import { ThemeProvider } from "@primer/react";

import { store } from "../redux";

export function App({ children }: React.PropsWithChildren): JSX.Element {
  return (
    <Provider store={store}>
      <ThemeProvider colorMode="dark">{children}</ThemeProvider>
    </Provider>
  );
}

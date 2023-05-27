import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.css";
import { Routes } from "./routes";
import { App } from "./app";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App>
      <Routes />
    </App>
  </React.StrictMode>
);

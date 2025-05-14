import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from "virtual:pwa-register";

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New version available. Reload?")) {
      updateSW();
    }
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

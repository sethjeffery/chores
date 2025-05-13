import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import CustomDndProvider from "./contexts/DndProvider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CustomDndProvider>
      <App />
    </CustomDndProvider>
  </React.StrictMode>
);

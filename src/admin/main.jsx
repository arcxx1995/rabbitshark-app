import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AccessGate from "../components/AccessGate";
import AdminConsole from "./AdminConsole";
import "../index.css";

createRoot(document.getElementById("admin-root")).render(
  <StrictMode>
    <AccessGate contextLabel="Admin Console">
      <AdminConsole />
    </AccessGate>
  </StrictMode>,
);

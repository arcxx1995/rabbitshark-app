import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AccessGate from "../components/AccessGate";
import AdminConsole from "./AdminConsole";
import DeveloperAccessGate from "./DeveloperAccessGate";
import "../index.css";

createRoot(document.getElementById("admin-root")).render(
  <StrictMode>
    <AccessGate
      contextLabel="Admin Console"
      eyebrow="Developer Console"
      headline="Enter the Rabbitstake admin console."
      description="Sign in with an authorized developer account to manage evaluation files and control the active challenge."
      stats={[
        { value: "JSON", label: "Evaluation Uploads" },
        { value: "RLS", label: "Developer Allowlist" },
        { value: "Live", label: "Active File Control" },
      ]}
    >
      <DeveloperAccessGate>
        <AdminConsole />
      </DeveloperAccessGate>
    </AccessGate>
  </StrictMode>,
);

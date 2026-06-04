import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { isAdminConsoleContext } from "./lib/adminContext";
import "./index.css";

async function renderApp() {
  const rootElement = document.getElementById("root");
  const shouldRenderAdmin = isAdminConsoleContext();

  if (shouldRenderAdmin && rootElement) {
    rootElement.id = "admin-root";
  }

  const mountElement = document.getElementById("admin-root") ?? rootElement;

  if (!mountElement) {
    throw new Error("Application root element was not found.");
  }

  if (shouldRenderAdmin) {
    const [{ default: AccessGate }, { default: AdminConsole }, { default: DeveloperAccessGate }] =
      await Promise.all([
        import("./components/AccessGate"),
        import("./admin/AdminConsole"),
        import("./admin/DeveloperAccessGate"),
      ]);

    createRoot(mountElement).render(
      <StrictMode>
        <AccessGate
          contextLabel="Admin Console"
          eyebrow="Developer Console"
          headline="Enter the Rabbitshark admin console."
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
    return;
  }

  createRoot(mountElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

renderApp();

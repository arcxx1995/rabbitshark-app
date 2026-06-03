import { useEffect } from "react";
import AccessGate from "./components/AccessGate";
import EvaluationSummary from "./components/EvaluationSummary";
import PokerTable from "./components/PokerTable";
import ScenarioDashboard from "./components/ScenarioDashboard";
import { useEvaluationStore } from "./store/useEvaluationStore";

export default function App() {
  return (
    <AccessGate contextLabel="Client Area">
      <AppScreens />
    </AccessGate>
  );
}

function AppScreens() {
  const mode = useEvaluationStore((state) => state.mode);
  const initializeData = useEvaluationStore((state) => state.initializeData);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useEffect(() => {
    if (mode !== "dashboard") return undefined;

    const refreshDashboardData = () => {
      if (document.visibilityState === "visible") {
        initializeData();
      }
    };
    const intervalId = window.setInterval(refreshDashboardData, 15000);

    window.addEventListener("focus", refreshDashboardData);
    document.addEventListener("visibilitychange", refreshDashboardData);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshDashboardData);
      document.removeEventListener("visibilitychange", refreshDashboardData);
    };
  }, [initializeData, mode]);

  let screen = <ScenarioDashboard />;

  if (mode === "table") screen = <PokerTable />;
  if (mode === "summary") screen = <EvaluationSummary />;

  return screen;
}

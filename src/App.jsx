import { useEffect } from "react";
import AccessGate from "./components/AccessGate";
import EvaluationSummary from "./components/EvaluationSummary";
import PokerTable from "./components/PokerTable";
import ScenarioDashboard from "./components/ScenarioDashboard";
import { useEvaluationStore } from "./store/useEvaluationStore";

export default function App() {
  return (
    <AccessGate>
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

  let screen = <ScenarioDashboard />;

  if (mode === "table") screen = <PokerTable />;
  if (mode === "summary") screen = <EvaluationSummary />;

  return screen;
}

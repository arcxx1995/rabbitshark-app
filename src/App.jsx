import EvaluationSummary from "./components/EvaluationSummary";
import AuthGate from "./components/AuthGate";
import PokerTable from "./components/PokerTable";
import ScenarioDashboard from "./components/ScenarioDashboard";
import { useEvaluationStore } from "./store/useEvaluationStore";

export default function App() {
  const mode = useEvaluationStore((state) => state.mode);

  let screen = <ScenarioDashboard />;

  if (mode === "table") screen = <PokerTable />;
  if (mode === "summary") screen = <EvaluationSummary />;

  return <AuthGate>{screen}</AuthGate>;
}

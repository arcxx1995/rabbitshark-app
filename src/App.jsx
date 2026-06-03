import { useEffect } from "react";
import AccessGate from "./components/AccessGate";
import EvaluationSummary from "./components/EvaluationSummary";
import PokerTable from "./components/PokerTable";
import ScenarioDashboard from "./components/ScenarioDashboard";
import { supabase } from "./lib/supabaseClient";
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

  useEffect(() => {
    if (mode !== "dashboard" || !supabase) return undefined;

    let active = true;
    let assignmentChannel = null;

    async function subscribeToAssignments() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;

      if (!active || !userId) return;

      assignmentChannel = supabase
        .channel(`user-challenges-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_challenges",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (document.visibilityState === "visible") {
              initializeData();
            }
          },
        )
        .subscribe();
    }

    subscribeToAssignments();

    return () => {
      active = false;
      if (assignmentChannel) {
        supabase.removeChannel(assignmentChannel);
      }
    };
  }, [initializeData, mode]);

  let screen = <ScenarioDashboard />;

  if (mode === "table") screen = <PokerTable />;
  if (mode === "summary") screen = <EvaluationSummary />;

  return screen;
}

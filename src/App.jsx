import { useEffect } from "react";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AccessGate from "./components/AccessGate";
import EvaluationSummary from "./components/EvaluationSummary";
import PokerTable from "./components/PokerTable";
import ScenarioDashboard from "./components/ScenarioDashboard";
import { supabase } from "./lib/supabaseClient";
import { useEvaluationStore } from "./store/useEvaluationStore";

export default function App() {
  const initializeData = useEvaluationStore.getState().initializeData;

  return (
    <AccessGate contextLabel="Client Area">
      <AppErrorBoundary onRetry={initializeData}>
        <AppScreens />
      </AppErrorBoundary>
    </AccessGate>
  );
}

function AppScreens() {
  const mode = useEvaluationStore((state) => state.mode);
  const initializeData = useEvaluationStore((state) => state.initializeData);
  const setAssignmentRealtimeStatus = useEvaluationStore(
    (state) => state.setAssignmentRealtimeStatus,
  );

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
    let retryTimeoutId = null;
    let retryAttempt = 0;

    const cleanupChannel = () => {
      if (assignmentChannel) {
        supabase.removeChannel(assignmentChannel);
        assignmentChannel = null;
      }
    };

    const scheduleReconnect = (message) => {
      if (!active) return;

      cleanupChannel();
      const retryDelay = Math.min(30000, 1000 * 2 ** retryAttempt);
      retryAttempt += 1;

      setAssignmentRealtimeStatus(
        "reconnecting",
        `${message} Retrying in ${Math.round(retryDelay / 1000)}s.`,
      );

      retryTimeoutId = window.setTimeout(subscribeToAssignments, retryDelay);
    };

    async function subscribeToAssignments() {
      window.clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
      setAssignmentRealtimeStatus("connecting", "Connecting assignment sync.");

      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;

      if (!active) return;

      if (!userId) {
        setAssignmentRealtimeStatus("idle", "Sign in to enable assignment sync.");
        return;
      }

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
            setAssignmentRealtimeStatus(
              "syncing",
              "Assignment update received. Refreshing dashboard.",
            );
            if (document.visibilityState === "visible") {
              initializeData();
            }
          },
        )
        .subscribe((status) => {
          if (!active) return;

          if (status === "SUBSCRIBED") {
            retryAttempt = 0;
            setAssignmentRealtimeStatus(
              "connected",
              "Assignment sync is connected.",
            );
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            scheduleReconnect("Assignment sync disconnected.");
            return;
          }

          if (status === "CLOSED") {
            scheduleReconnect("Assignment sync channel closed.");
          }
        });
    }

    subscribeToAssignments();

    return () => {
      active = false;
      window.clearTimeout(retryTimeoutId);
      cleanupChannel();
      setAssignmentRealtimeStatus("idle", "Realtime sync stopped.");
    };
  }, [initializeData, mode, setAssignmentRealtimeStatus]);

  let screen = <ScenarioDashboard />;

  if (mode === "table") screen = <PokerTable />;
  if (mode === "summary") screen = <EvaluationSummary />;

  return screen;
}

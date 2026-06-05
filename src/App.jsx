import { useEffect } from "react";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AccessGate from "./components/AccessGate";
import ChipLayoutPreview from "./components/ChipLayoutPreview";
import EvaluationSummary from "./components/EvaluationSummary";
import PokerEnginePreview from "./components/PokerEnginePreview";
import PokerTable from "./components/PokerTable";
import ScenarioDashboard from "./components/ScenarioDashboard";
import { supabase } from "./lib/supabaseClient";
import { useEvaluationStore } from "./store/useEvaluationStore";

export default function App() {
  const initializeData = useEvaluationStore.getState().initializeData;
  const isEnginePreview =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    window.location.pathname === "/engine-preview";
  const isChipLayoutPreview =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    window.location.pathname === "/chip-layout-preview";

  if (isEnginePreview) {
    return <PokerEnginePreview />;
  }

  if (isChipLayoutPreview) {
    return <ChipLayoutPreview />;
  }

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
    let refreshAttemptTimeoutIds = [];
    let retryAttempt = 0;

    const cleanupChannel = () => {
      if (assignmentChannel) {
        supabase.removeChannel(assignmentChannel);
        assignmentChannel = null;
      }
    };

    const clearRefreshAttempts = () => {
      refreshAttemptTimeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      refreshAttemptTimeoutIds = [];
    };

    const refreshDashboardAssignments = async ({
      statusMessage,
      restoreConnectedStatus = false,
    } = {}) => {
      if (!active) return;

      if (statusMessage) {
        setAssignmentRealtimeStatus("syncing", statusMessage);
      }

      try {
        await initializeData();
      } finally {
        if (active && restoreConnectedStatus) {
          setAssignmentRealtimeStatus(
            "connected",
            "Assignment sync is connected.",
          );
        }
      }
    };

    const scheduleAssignmentRefresh = (statusMessage) => {
      if (!active) return;

      clearRefreshAttempts();

      [0, 1200, 3500].forEach((delay, index, delays) => {
        const timeoutId = window.setTimeout(() => {
          refreshDashboardAssignments({
            statusMessage,
            restoreConnectedStatus: index === delays.length - 1,
          });
        }, delay);

        refreshAttemptTimeoutIds.push(timeoutId);
      });
    };

    const scheduleReconnect = (message) => {
      if (!active) return;

      cleanupChannel();
      clearRefreshAttempts();
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
            scheduleAssignmentRefresh(
              "Assignment update received. Refreshing dashboard.",
            );
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
            scheduleAssignmentRefresh("Assignment sync connected. Verifying latest assignments.");
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
      clearRefreshAttempts();
      cleanupChannel();
      setAssignmentRealtimeStatus("idle", "Realtime sync stopped.");
    };
  }, [initializeData, mode, setAssignmentRealtimeStatus]);

  let screen = <ScenarioDashboard />;

  if (mode === "table") screen = <PokerTable />;
  if (mode === "summary") screen = <EvaluationSummary />;

  return screen;
}

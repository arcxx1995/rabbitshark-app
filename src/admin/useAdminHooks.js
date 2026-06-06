import { useCallback, useEffect, useState } from "react";
import {
  checkChallengeSystemHealth,
  listDatabaseChallenges,
  listDatabaseEvaluationFiles,
  searchProfiles,
  searchAssignmentByCode,
  searchAssignmentsByEmail,
  saveEvaluationFileToDatabase,
} from "../lib/challengeDatabase";

/**
 * Load challenges and evaluation files on mount.
 */
export function useAdminData(onMessage) {
  const [evaluationFiles, setEvaluationFiles] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    setLoading(true);

    try {
      const [files, challengeRows] = await Promise.all([
        listDatabaseEvaluationFiles(),
        listDatabaseChallenges(),
      ]);

      setEvaluationFiles(files);
      setChallenges(challengeRows);
    } catch (error) {
      onMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not load database admin data.",
      });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  return { evaluationFiles, challenges, loading, loadAdminData };
}

/**
 * Search user profiles with 250ms debounce.
 */
export function useUserSearch(onMessage) {
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (userQuery.trim().length < 2) {
        setUserResults([]);
        setUserSearchLoading(false);
        return;
      }

      setUserSearchLoading(true);

      try {
        const results = await searchProfiles(userQuery);

        if (!cancelled) {
          setUserResults(results);
          setUserSearchLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setUserSearchLoading(false);
          onMessage({
            type: "error",
            text: error instanceof Error ? error.message : "Could not search users.",
          });
        }
      }
    }

    const timeoutId = window.setTimeout(runSearch, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [userQuery, onMessage]);

  return { userQuery, setUserQuery, userResults, userSearchLoading };
}

/**
 * Health check state and lazy load.
 */
export function useHealthCheck(activeSection, onMessage) {
  const [healthRows, setHealthRows] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthSearched, setHealthSearched] = useState(false);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthSearched(true);

    try {
      const rows = await checkChallengeSystemHealth();
      setHealthRows(rows);
    } catch (error) {
      onMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not load challenge system health.",
      });
    } finally {
      setHealthLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    if (activeSection === "health" && !healthSearched) {
      loadHealth();
    }
  }, [activeSection, healthSearched, loadHealth]);

  return { healthRows, healthLoading, healthSearched, loadHealth };
}

/**
 * Assignment lookup state and live search.
 */
export function useAssignmentLookup(activeSection, onMessage) {
  const [assignmentLookupMode, setAssignmentLookupMode] = useState("email");
  const [assignmentLookupEmail, setAssignmentLookupEmail] = useState("");
  const [assignmentLookupCode, setAssignmentLookupCode] = useState("");
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [assignmentLookupLoading, setAssignmentLookupLoading] = useState(false);
  const [assignmentLookupSearched, setAssignmentLookupSearched] = useState(false);
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState(null);

  useEffect(() => {
    if (activeSection !== "lookup") return undefined;

    const lookupValue =
      assignmentLookupMode === "code"
        ? assignmentLookupCode.trim()
        : assignmentLookupEmail.trim();
    const normalizedCode = lookupValue.replace(/^#/, "").replace(/\D/g, "");
    const canSearch =
      assignmentLookupMode === "code"
        ? normalizedCode.length === 9
        : lookupValue.length >= 2;

    if (!canSearch) {
      setAssignmentResults([]);
      setSelectedAssignmentDetails(null);
      setAssignmentLookupSearched(false);
      setAssignmentLookupLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function runLiveLookup() {
      setAssignmentLookupLoading(true);
      setAssignmentLookupSearched(true);

      try {
        const results =
          assignmentLookupMode === "code"
            ? await searchAssignmentByCode(lookupValue)
            : await searchAssignmentsByEmail(lookupValue);

        if (!cancelled) {
          setAssignmentResults(results);
          setSelectedAssignmentDetails(null);
          setAssignmentLookupLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setAssignmentLookupLoading(false);
          onMessage({
            type: "error",
            text: error instanceof Error ? error.message : "Could not search assignment details.",
          });
        }
      }
    }

    const timeoutId = window.setTimeout(runLiveLookup, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeSection, assignmentLookupCode, assignmentLookupEmail, assignmentLookupMode, onMessage]);

  const handleAssignmentLookup = useCallback(async () => {
    const lookupValue =
      assignmentLookupMode === "code"
        ? assignmentLookupCode.trim()
        : assignmentLookupEmail.trim();

    if (assignmentLookupMode === "code") {
      const normalizedCode = lookupValue.replace(/^#/, "").replace(/\D/g, "");
      if (normalizedCode.length !== 9) {
        onMessage({ type: "error", text: "Enter a 9-digit assignment number." });
        return;
      }
    }

    if (assignmentLookupMode === "email" && lookupValue.length < 2) {
      onMessage({ type: "error", text: "Enter at least two characters of an email ID." });
      return;
    }

    try {
      const results =
        assignmentLookupMode === "code"
          ? await searchAssignmentByCode(lookupValue)
          : await searchAssignmentsByEmail(lookupValue);

      setAssignmentResults(results);
      setSelectedAssignmentDetails(null);
    } catch (error) {
      onMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not search assignment details.",
      });
    }
  }, [assignmentLookupMode, assignmentLookupCode, assignmentLookupEmail, onMessage]);

  return {
    assignmentLookupMode,
    setAssignmentLookupMode,
    assignmentLookupEmail,
    setAssignmentLookupEmail,
    assignmentLookupCode,
    setAssignmentLookupCode,
    assignmentResults,
    setAssignmentResults,
    assignmentLookupLoading,
    assignmentLookupSearched,
    setAssignmentLookupSearched,
    selectedAssignmentDetails,
    setSelectedAssignmentDetails,
    handleAssignmentLookup,
  };
}

/**
 * Challenge file upload and validation.
 */
export function useChallengeFileUpload(onMessage) {
  const [challengeControlFile, setChallengeControlFile] = useState(null);
  const [challengeFileCheck, setChallengeFileCheck] = useState({
    status: "idle",
    text: "Upload a challenge JSON file to check compatibility.",
  });

  const handleUpload = useCallback(
    async (event) => {
      const [file] = event.target.files;
      event.target.value = "";

      if (!file) return;

      setChallengeControlFile(null);
      setChallengeFileCheck({
        status: "checking",
        text: "Checking compatibility with the poker engine...",
      });

      try {
        const content = await file.text();
        const parsedEvaluation = JSON.parse(content);
        const savedFile = await saveEvaluationFileToDatabase(parsedEvaluation);

        setChallengeControlFile(savedFile);
        setChallengeFileCheck({
          status: "valid",
          text: `${savedFile.file_code ?? savedFile.fileCode} is compatible with the poker engine.`,
        });
        onMessage({
          type: "success",
          text: `Saved challenge file ${savedFile.file_code ?? savedFile.fileCode}.`,
        });

        return savedFile;
      } catch (error) {
        setChallengeFileCheck({
          status: "error",
          text:
            error instanceof Error
              ? error.message
              : "Challenge JSON is not compatible with the poker engine.",
        });
        onMessage({
          type: "error",
          text:
            error instanceof Error ? error.message : "Could not save JSON file.",
        });

        return null;
      }
    },
    [onMessage]
  );

  return {
    challengeControlFile,
    setChallengeControlFile,
    challengeFileCheck,
    setChallengeFileCheck,
    handleUpload,
  };
}

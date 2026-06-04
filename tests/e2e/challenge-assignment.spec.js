import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "E2E_DEVELOPER_EMAIL",
  "E2E_DEVELOPER_PASSWORD",
  "E2E_PLAYER_EMAIL",
  "E2E_PLAYER_PASSWORD",
];

function getEnv(name) {
  return process.env[name] ?? "";
}

function missingEnvVars() {
  return requiredEnvVars.filter((name) => !getEnv(name));
}

async function signInIfNeeded(page, email, password) {
  const emailInput = page.getByLabel("Email", { exact: true });

  if ((await emailInput.count()) === 0 || !(await emailInput.isVisible())) {
    return;
  }

  await emailInput.fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

async function chooseChallenge(page) {
  const challengeSelect = page.getByLabel("Select Challenge", { exact: true });
  await expect(challengeSelect).toBeVisible();

  const preferredChallenge = getEnv("E2E_CHALLENGE_NAME");

  if (preferredChallenge) {
    await challengeSelect.selectOption({ label: preferredChallenge });
    return;
  }

  const optionCount = await page.locator("select option").count();
  expect(optionCount, "At least one assignable database challenge is required.").toBeGreaterThan(
    1,
  );
  await challengeSelect.selectOption({ index: 1 });
}

async function openPlayerDashboard(context) {
  const page = await context.newPage();

  await page.goto("/");
  await signInIfNeeded(
    page,
    getEnv("E2E_PLAYER_EMAIL"),
    getEnv("E2E_PLAYER_PASSWORD"),
  );
  await expect(page.getByText("Challenge Dashboard", { exact: true })).toBeVisible();

  return page;
}

async function openAdminAssignPage(context) {
  const page = await context.newPage();

  await page.goto("/admin.html");
  await signInIfNeeded(
    page,
    getEnv("E2E_DEVELOPER_EMAIL"),
    getEnv("E2E_DEVELOPER_PASSWORD"),
  );
  await expect(page.getByText("Database challenge control", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Assign Challenge", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assign a challenge to a user." })).toBeVisible();

  return page;
}

async function verifyDashboardRpcContainsAssignment(assignmentCode) {
  const supabase = createClient(
    getEnv("VITE_SUPABASE_URL"),
    getEnv("VITE_SUPABASE_ANON_KEY"),
    {
      auth: {
        storageKey: `rabbitstake.e2e.${Date.now()}`,
      },
    },
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: getEnv("E2E_PLAYER_EMAIL"),
    password: getEnv("E2E_PLAYER_PASSWORD"),
  });

  expect(signInError, signInError?.message).toBeNull();

  const { data, error } = await supabase.rpc("get_current_user_challenge_dashboard");

  expect(error, error?.message).toBeNull();

  const activeAssignments = data?.active_assignments ?? [];
  expect(
    activeAssignments.some((assignment) => assignment.assignment_code === assignmentCode),
    `Dashboard RPC should include assignment #${assignmentCode}.`,
  ).toBe(true);

  await supabase.auth.signOut();
}

test.describe("admin challenge assignment sync", () => {
  test.skip(
    missingEnvVars().length > 0,
    `Missing required env vars: ${missingEnvVars().join(", ")}`,
  );

  test("developer assignment appears on the player dashboard and dashboard RPC", async ({
    browser,
  }) => {
    const playerContext = await browser.newContext();
    const adminContext = await browser.newContext();

    const playerPage = await openPlayerDashboard(playerContext);
    const adminPage = await openAdminAssignPage(adminContext);

    await chooseChallenge(adminPage);
    await adminPage.getByLabel("Search User", { exact: true }).fill(getEnv("E2E_PLAYER_EMAIL"));
    await adminPage
      .getByRole("button")
      .filter({ hasText: getEnv("E2E_PLAYER_EMAIL") })
      .click();

    await expect(adminPage.getByText("Existing Assignments", { exact: true })).toBeVisible();

    await adminPage
      .getByRole("button", { name: "Assign Challenge", exact: true })
      .last()
      .click();

    const receipt = adminPage.getByText(/Assigned #\d{9}/);
    await expect(receipt).toBeVisible();

    const receiptText = await receipt.textContent();
    const assignmentCode = receiptText?.match(/\d{9}/)?.[0];

    expect(assignmentCode, "Assignment receipt should include a 9-digit code.").toBeTruthy();

    await expect(playerPage.getByText(`#${assignmentCode}`, { exact: true })).toBeVisible({
      timeout: 45000,
    });

    await verifyDashboardRpcContainsAssignment(assignmentCode);

    await adminContext.close();
    await playerContext.close();
  });
});

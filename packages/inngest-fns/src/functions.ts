// ─────────────────────────────────────────────
// SuperCanvas — Inngest Functions
// Background jobs for backtest queue, ML pipelines, and other async work
// ─────────────────────────────────────────────

import { inngest } from "./client";

/**
 * Hello World function — validates Inngest is working end-to-end.
 * Triggered by "supercanvas/hello.world" event.
 */
export const helloWorld = inngest.createFunction(
  { id: "hello-world", name: "Hello World" },
  { event: "supercanvas/hello.world" },
  async ({ event, step }) => {
    const greeting = await step.run("generate-greeting", async () => {
      return `Hello from SuperCanvas! Event: ${JSON.stringify(event.data)}`;
    });

    await step.run("log-greeting", async () => {
      console.log(greeting);
      return { message: greeting, timestamp: new Date().toISOString() };
    });

    return { success: true, greeting };
  }
);

/**
 * Strategy Validation — validates a strategy DAG for correctness.
 * Triggered when a strategy is saved.
 */
export const validateStrategy = inngest.createFunction(
  {
    id: "validate-strategy",
    name: "Validate Strategy DAG",
    retries: 2,
  },
  { event: "supercanvas/strategy.saved" },
  async ({ event, step }) => {
    const { strategyId, dagJson } = event.data as {
      strategyId: string;
      dagJson: unknown;
    };

    // Step 1: Check for circular dependencies
    const circularCheck = await step.run("check-circular-deps", async () => {
      // TODO: Implement topological sort validation on DAG
      console.log(`Checking circular deps for strategy ${strategyId}`);
      return { hasCycles: false };
    });

    if (circularCheck.hasCycles) {
      return { valid: false, error: "Strategy contains circular dependencies" };
    }

    // Step 2: Check data source availability
    const dataCheck = await step.run("check-data-availability", async () => {
      // TODO: Verify all referenced data sources exist
      console.log(`Checking data availability for strategy ${strategyId}`);
      return { allAvailable: true, missingSymbols: [] };
    });

    return {
      valid: true,
      strategyId,
      checks: {
        circularDeps: circularCheck,
        dataAvailability: dataCheck,
      },
    };
  }
);

/**
 * Backtest Job — orchestrates a backtest execution.
 * Triggered when a user submits a backtest request.
 */
export const runBacktest = inngest.createFunction(
  {
    id: "run-backtest",
    name: "Run Backtest",
    retries: 1,
    concurrency: {
      limit: 5, // Max 5 concurrent backtests (free tier)
    },
  },
  { event: "supercanvas/backtest.submitted" },
  async ({ event, step }) => {
    const { backtestId, strategyId, config } = event.data as {
      backtestId: string;
      strategyId: string;
      config: unknown;
    };

    // Step 1: Mark as queued
    await step.run("mark-queued", async () => {
      // TODO: Update backtest status in DB
      console.log(`Backtest ${backtestId} queued`);
      return { status: "queued" };
    });

    // Step 2: Run backtest on Go engine
    const result = await step.run("execute-backtest", async () => {
      // TODO: Call Go backtest engine via gRPC
      console.log(`Executing backtest ${backtestId} for strategy ${strategyId}`);
      return {
        status: "completed",
        metricsJson: {},
        resultUrl: null,
      };
    });

    // Step 3: Store results
    await step.run("store-results", async () => {
      // TODO: Upload results to R2, update DB
      console.log(`Storing results for backtest ${backtestId}`);
      return { stored: true };
    });

    // Step 4: Send notification
    await step.run("notify-completion", async () => {
      // TODO: Notify user via Convex real-time
      console.log(`Backtest ${backtestId} completed`);
      return { notified: true };
    });

    return { backtestId, status: "completed", result };
  }
);

/**
 * Clerk User Sync — keeps our users table in sync with Clerk.
 * Triggered by Clerk webhook events.
 */
export const syncClerkUser = inngest.createFunction(
  { id: "sync-clerk-user", name: "Sync Clerk User" },
  { event: "supercanvas/clerk.user.synced" },
  async ({ event, step }) => {
    const { clerkId, email, firstName, lastName, imageUrl, eventType } =
      event.data as {
        clerkId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        imageUrl?: string;
        eventType: "created" | "updated" | "deleted";
      };

    await step.run("sync-user-to-db", async () => {
      // TODO: Upsert or delete user in PostgreSQL
      console.log(`Syncing Clerk user ${clerkId} (${eventType})`);
      return { synced: true, eventType };
    });

    return { success: true, clerkId, eventType };
  }
);

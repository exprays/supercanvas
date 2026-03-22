// ─────────────────────────────────────────────
// SuperCanvas — Inngest Functions (Phase 1)
// validateStrategy now performs real topological sort + type checks
// ─────────────────────────────────────────────

import { inngest } from "./client";

/**
 * Hello World — validates Inngest pipeline end-to-end.
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
 * Strategy Validation — real DAG cycle detection + port type validation.
 * Triggered every time a strategy is saved.
 * Results are logged; future phases will surface them in the UI.
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
      dagJson: { nodes: unknown[]; edges: unknown[] };
    };

    // ── Step 1: Cycle detection (Kahn's algorithm) ──
    const circularCheck = await step.run("check-circular-deps", async () => {
      const nodes = (dagJson?.nodes ?? []) as Array<{ id: string }>;
      const edges = (dagJson?.edges ?? []) as Array<{
        source: string;
        target: string;
      }>;

      const inDegree = new Map<string, number>();
      const adjList = new Map<string, string[]>();

      for (const node of nodes) {
        inDegree.set(node.id, 0);
        adjList.set(node.id, []);
      }

      for (const edge of edges) {
        adjList.get(edge.source)?.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      }

      const queue: string[] = [];
      for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
      }

      const processed: string[] = [];
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        processed.push(nodeId);
        for (const neighbor of adjList.get(nodeId) ?? []) {
          const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) queue.push(neighbor);
        }
      }

      const hasCycles = processed.length !== nodes.length;
      console.log(
        `[strategy:${strategyId}] Cycle check: ${hasCycles ? "CYCLES FOUND" : "clean"}`
      );
      return { hasCycles, executionOrder: processed };
    });

    if (circularCheck.hasCycles) {
      console.error(`[strategy:${strategyId}] Validation failed: circular dependency`);
      return {
        valid: false,
        strategyId,
        error: "Circular dependency detected",
      };
    }

    // ── Step 2: Port type compatibility ──
    const typeCheck = await step.run("check-port-types", async () => {
      const nodes = (dagJson?.nodes ?? []) as Array<{
        id: string;
        label: string;
        outputs: Array<{ id: string; dataType: string }>;
        inputs: Array<{ id: string; dataType: string }>;
      }>;
      const edges = (dagJson?.edges ?? []) as Array<{
        source: string;
        sourceHandle: string;
        target: string;
        targetHandle: string;
      }>;

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const typeMismatches: string[] = [];

      for (const edge of edges) {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) continue;

        const outPort = src.outputs?.find((p) => p.id === edge.sourceHandle);
        const inPort = tgt.inputs?.find((p) => p.id === edge.targetHandle);
        if (!outPort || !inPort) continue;

        if (outPort.dataType !== inPort.dataType) {
          typeMismatches.push(
            `${src.label}→${tgt.label}: ${outPort.dataType} ≠ ${inPort.dataType}`
          );
        }
      }

      return { typeMismatches };
    });

    // ── Step 3: Data source availability ──
    const dataCheck = await step.run("check-data-availability", async () => {
      const nodes = (dagJson?.nodes ?? []) as Array<{
        type: string;
        params?: { symbol?: string };
      }>;

      const dataSourceNodes = nodes.filter((n) => n.type === "ohlcv_feed");
      const symbols = dataSourceNodes
        .map((n) => n.params?.symbol)
        .filter(Boolean);

      // Phase 2 will check actual TimescaleDB availability
      // For now validate symbol format
      const invalidSymbols = symbols.filter(
        (s) => s && !/^[A-Z0-9.^-]{1,20}$/i.test(s)
      );

      return { symbols, invalidSymbols, allAvailable: invalidSymbols.length === 0 };
    });

    const isValid =
      !circularCheck.hasCycles &&
      typeCheck.typeMismatches.length === 0 &&
      dataCheck.allAvailable;

    console.log(
      `[strategy:${strategyId}] Validation ${isValid ? "PASSED" : "FAILED"}`,
      { typeCheck, dataCheck }
    );

    return {
      valid: isValid,
      strategyId,
      executionOrder: circularCheck.executionOrder,
      checks: { circularCheck, typeCheck, dataCheck },
    };
  }
);

/**
 * Backtest Job — orchestrates execution pipeline.
 * Phase 2 will implement the Go engine call.
 */
export const runBacktest = inngest.createFunction(
  {
    id: "run-backtest",
    name: "Run Backtest",
    retries: 1,
    concurrency: { limit: 5 },
  },
  { event: "supercanvas/backtest.submitted" },
  async ({ event, step }) => {
    const { backtestId, strategyId, config } = event.data as {
      backtestId: string;
      strategyId: string;
      config: unknown;
    };

    await step.run("mark-queued", async () => {
      console.log(`Backtest ${backtestId} queued`);
      return { status: "queued" };
    });

    const result = await step.run("execute-backtest", async () => {
      // Phase 2: Call Go backtest engine via gRPC
      console.log(`Executing backtest ${backtestId} for strategy ${strategyId}`);
      return { status: "completed", metricsJson: {}, resultUrl: null };
    });

    await step.run("store-results", async () => {
      // Phase 2: Upload to R2, update DB
      return { stored: true };
    });

    await step.run("notify-completion", async () => {
      // Phase 2: Update Convex progress
      return { notified: true };
    });

    return { backtestId, status: "completed", result };
  }
);

/**
 * Clerk User Sync
 */
export const syncClerkUser = inngest.createFunction(
  { id: "sync-clerk-user", name: "Sync Clerk User" },
  { event: "supercanvas/clerk.user.synced" },
  async ({ event, step }) => {
    const { clerkId, eventType } = event.data as {
      clerkId: string;
      eventType: "created" | "updated" | "deleted";
    };

    await step.run("sync-user-to-db", async () => {
      console.log(`Syncing Clerk user ${clerkId} (${eventType})`);
      return { synced: true, eventType };
    });

    return { success: true, clerkId, eventType };
  }
);

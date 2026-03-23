// ─────────────────────────────────────────────
// SuperCanvas — Inngest Functions
// Event-driven background jobs: validation, backtesting, user sync
// ─────────────────────────────────────────────

import { inngest } from "./client";
import * as Sentry from "@sentry/nextjs";

// ── Hello World (Inngest connection test) ───

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.run("log-event", async () => {
      console.log("Hello from Inngest!", event.data);
      return { message: "Hello from SuperCanvas!", timestamp: new Date().toISOString() };
    });
  }
);

// ── Validate Strategy (DAG integrity check) ──

export const validateStrategy = inngest.createFunction(
  {
    id: "validate-strategy",
    retries: 2,
  },
  { event: "supercanvas/strategy.saved" },
  async ({ event, step }) => {
    const { strategyId, dagJson } = event.data;

    // Step 1 — Cycle detection (Kahn's algorithm)
    const cycleResult = await step.run("detect-cycles", async () => {
      const nodes = dagJson.nodes || [];
      const edges = dagJson.edges || [];

      if (nodes.length === 0) {
        return { valid: true, message: "Empty DAG is valid" };
      }

      const inDegree: Record<string, number> = {};
      const adjList: Record<string, string[]> = {};

      for (const node of nodes) {
        inDegree[node.id] = 0;
        adjList[node.id] = [];
      }

      for (const edge of edges) {
        adjList[edge.source]?.push(edge.target);
        inDegree[edge.target] = (inDegree[edge.target] ?? 0) + 1;
      }

      const queue: string[] = [];
      for (const [id, deg] of Object.entries(inDegree)) {
        if (deg === 0) queue.push(id);
      }

      let processed = 0;
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        processed++;
        for (const neighbor of adjList[nodeId] ?? []) {
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0) queue.push(neighbor);
        }
      }

      return {
        valid: processed === nodes.length,
        message:
          processed === nodes.length
            ? "No cycles detected"
            : `Cycle detected: processed ${processed} of ${nodes.length} nodes`,
        executionOrder: processed === nodes.length ? undefined : null,
      };
    });

    if (!cycleResult.valid) {
      return {
        strategyId,
        valid: false,
        errors: [{ type: "cycle", message: cycleResult.message }],
      };
    }

    // Step 2 — Port type validation
    const typeCheckResult = await step.run("check-port-types", async () => {
      const nodes = dagJson.nodes || [];
      const edges = dagJson.edges || [];
      const errors: { type: string; nodeId?: string; message: string }[] = [];

      const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

      for (const edge of edges) {
        const sourceNode: any = nodeMap.get(edge.source);
        const targetNode: any = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) continue;

        const outputPort = sourceNode.outputs?.find((p: any) => p.id === edge.sourceHandle);
        const inputPort = targetNode.inputs?.find((p: any) => p.id === edge.targetHandle);

        if (outputPort && inputPort && outputPort.dataType !== inputPort.dataType) {
          errors.push({
            type: "type_mismatch",
            nodeId: edge.target,
            message: `Type mismatch: "${sourceNode.label}" outputs ${outputPort.dataType} but "${targetNode.label}" expects ${inputPort.dataType}`,
          });
        }
      }

      return { errors, valid: errors.length === 0 };
    });

    // Step 3 — Required inputs check
    const requiredCheck = await step.run("check-required-inputs", async () => {
      const nodes = dagJson.nodes || [];
      const edges = dagJson.edges || [];
      const errors: { type: string; nodeId: string; portId: string; message: string }[] = [];

      const connectedInputs = new Set(edges.map((e: any) => `${e.target}:${e.targetHandle}`));

      for (const node of nodes) {
        for (const input of node.inputs || []) {
          if (input.required && !connectedInputs.has(`${node.id}:${input.id}`)) {
            errors.push({
              type: "missing_required",
              nodeId: node.id,
              portId: input.id,
              message: `"${node.label}" requires input "${input.label}" to be connected`,
            });
          }
        }
      }

      return { errors, valid: errors.length === 0 };
    });

    const allErrors = [...typeCheckResult.errors, ...requiredCheck.errors];
    return {
      strategyId,
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: [],
    };
  }
);

// ── Run Backtest (Phase 2: Full pipeline) ──

export const runBacktest = inngest.createFunction(
  {
    id: "run-backtest",
    retries: 1,
    concurrency: [{ limit: 5 }],
  },
  { event: "supercanvas/backtest.submitted" },
  async ({ event, step }) => {
    const { backtestId, strategyId, dagJson, config, userId } = event.data;

    // Step 1 — Mark queued + notify Convex
    await step.run("mark-queued", async () => {
      // Update Convex for real-time progress
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        try {
          await fetch(`${convexUrl}/api/mutation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: "backtestProgress:updateProgress",
              args: {
                backtestId,
                strategyId,
                userId,
                status: "queued",
                progress: 0,
                currentDate: config.startDate,
                equityCurve: [],
              },
            }),
          });
        } catch (err) {
          Sentry.captureException(err, { tags: { step: "mark-queued" } });
        }
      }

      return { status: "queued" };
    });

    // Step 2 — Execute backtest via Go engine HTTP API
    const backtestResult = await step.run("execute-backtest", async () => {
      const engineUrl = process.env.BACKTEST_ENGINE_URL || "http://localhost:8080";

      const response = await fetch(`${engineUrl}/api/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backtest_id: backtestId,
          strategy_id: strategyId,
          dag_json: dagJson,
          config: {
            symbols: config.symbols,
            start_date: config.startDate,
            end_date: config.endDate,
            resolution: config.resolution,
            initial_capital: config.initialCapital,
            currency: config.currency || "USD",
            slippage: config.slippage || { type: "percentage", value: 0.1 },
            fees: config.fees || { maker_fee: 0.001, taker_fee: 0.002 },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Backtest engine error (${response.status}): ${body}`);
      }

      return await response.json();
    });

    // Step 3 — Store results (DB)
    const storeData = await step.run("store-results", async () => {
      const { eq } = await import("drizzle-orm");
      const { getDb, backtests } = await import("@supercanvas/db");
      const db = getDb();

      const metricsJson = backtestResult.Metrics ? {
        totalReturn: backtestResult.Metrics.TotalReturn,
        annualizedReturn: backtestResult.Metrics.AnnualizedReturn,
        sharpeRatio: backtestResult.Metrics.SharpeRatio,
        sortinoRatio: backtestResult.Metrics.SortinoRatio,
        calmarRatio: backtestResult.Metrics.CalmarRatio,
        maxDrawdown: backtestResult.Metrics.MaxDrawdown,
        winRate: backtestResult.Metrics.WinRate,
        profitFactor: backtestResult.Metrics.ProfitFactor,
        totalTrades: backtestResult.Metrics.TotalTrades,
        avgTradeDuration: backtestResult.Metrics.AvgTradeDuration,
        volatility: backtestResult.Metrics.Volatility,
      } : {};

      const equityCurveJson = (backtestResult.EquityCurve || []).map((ep: any) => ({
        timestamp: ep.Timestamp,
        equity: ep.Equity,
        drawdown: ep.Drawdown,
        cash: ep.Cash,
      }));

      const tradesJson = (backtestResult.Trades || []).map((t: any) => ({
        timestamp: t.Timestamp,
        symbol: t.Symbol,
        side: t.Side,
        quantity: t.Quantity,
        price: t.Price,
        fees: t.Fees,
        slippage: t.Slippage,
        pnl: t.PnL ?? t.Pnl ?? 0,
      }));

      await db
        .update(backtests)
        .set({
          status: "completed",
          completedAt: new Date(),
          metricsJson: { ...metricsJson, _equityCurve: equityCurveJson, _trades: tradesJson },
        })
        .where(eq(backtests.id, backtestId));

      return {
        metricsJson,
        metrics: backtestResult.Metrics,
        trades: tradesJson.length,
        equityPoints: equityCurveJson.length,
      };
    });

    // Step 4 — Notify completion via Convex
    await step.run("notify-completion", async () => {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        try {
          const equityCurve = (backtestResult.EquityCurve || []).map((ep: any) => ({
            timestamp: ep.Timestamp,
            equity: ep.Equity,
            drawdown: ep.Drawdown,
            cash: ep.Cash,
          }));

          // Sample to max 500 points for Convex
          const step = Math.max(1, Math.floor(equityCurve.length / 500));
          const sampledCurve = equityCurve.filter((_: any, i: number) => i % step === 0);

          await fetch(`${convexUrl}/api/mutation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: "backtestProgress:updateProgress",
              args: {
                backtestId,
                strategyId,
                userId,
                status: "completed",
                progress: 100,
                currentDate: config.endDate,
                equityCurve: sampledCurve,
                metrics: storeData.metricsJson,
              },
            }),
          });
        } catch (err) {
          Sentry.captureException(err, { tags: { step: "notify-completion" } });
        }
      }

      return { status: "completed", backtestId };
    });

    return {
      backtestId,
      status: "completed",
      totalReturn: backtestResult.Metrics?.TotalReturn ?? 0,
      sharpeRatio: backtestResult.Metrics?.SharpeRatio ?? 0,
      totalTrades: backtestResult.Metrics?.TotalTrades ?? 0,
    };
  }
);

// ── Sync Clerk User to DB ──

export const syncClerkUser = inngest.createFunction(
  { id: "sync-clerk-user" },
  { event: "clerk/user.created" },
  async ({ event, step }) => {
    await step.run("upsert-user", async () => {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;

      return {
        clerkId: id,
        email: email_addresses?.[0]?.email_address ?? "",
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      };
    });
  }
);

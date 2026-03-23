// ─────────────────────────────────────────────
// SuperCanvas — Strategy Router (tRPC)
// CRUD for strategies + DAG persistence + version history
// ─────────────────────────────────────────────

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc/trpc";
import {
  strategies,
  strategyVersions,
  users,
  backtests,
} from "@supercanvas/db";
import { inngest } from "@supercanvas/inngest-fns";
import * as Sentry from "@sentry/nextjs";

// ── Validation schemas ─────────────────────────────────────────────────────

const dagNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.string(),
  label: z.string(),
  params: z.record(z.unknown()),
  inputs: z.array(z.object({
    id: z.string(),
    label: z.string(),
    dataType: z.string(),
    required: z.boolean(),
  })),
  outputs: z.array(z.object({
    id: z.string(),
    label: z.string(),
    dataType: z.string(),
    required: z.boolean(),
  })),
  position: z.object({ x: z.number(), y: z.number() }),
});

const dagEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string(),
  target: z.string(),
  targetHandle: z.string(),
});

const dagSchema = z.object({
  nodes: z.array(dagNodeSchema),
  edges: z.array(dagEdgeSchema),
});

// ── Helper: resolve user DB id from Clerk id ──────────────────────────────

async function resolveUserId(db: any, clerkId: string): Promise<string> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!result.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found in database. Sign out and sign back in.",
    });
  }
  return result[0].id;
}

// ── Router ────────────────────────────────────────────────────────────────

export const strategyRouter = router({
  /**
   * List all strategies for the current user.
   * Returns lightweight rows (no full DAG JSON) for the list page.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.db, ctx.userId);

    const rows = await ctx.db
      .select({
        id: strategies.id,
        name: strategies.name,
        description: strategies.description,
        version: strategies.version,
        isPublic: strategies.isPublic,
        tags: strategies.tags,
        createdAt: strategies.createdAt,
        updatedAt: strategies.updatedAt,
      })
      .from(strategies)
      .where(eq(strategies.userId, userId))
      .orderBy(desc(strategies.updatedAt));

    return rows;
  }),

  /**
   * Get a single strategy including its full DAG JSON.
   */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const result = await ctx.db
        .select()
        .from(strategies)
        .where(
          and(eq(strategies.id, input.id), eq(strategies.userId, userId))
        )
        .limit(1);

      if (!result.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      }

      return result[0];
    }),

  /**
   * Create a new blank strategy.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const emptyDag = { nodes: [], edges: [] };

      const [strategy] = await ctx.db
        .insert(strategies)
        .values({
          userId,
          name: input.name,
          description: input.description ?? null,
          dagJson: emptyDag,
          version: 1,
          isPublic: false,
          tags: input.tags ?? [],
        })
        .returning();

      // Trigger background validation (no-op for empty DAG, but wires the pipeline)
      try {
        await inngest.send({
          name: "supercanvas/strategy.saved",
          data: {
            strategyId: strategy.id,
            dagJson: emptyDag,
          },
        });
      } catch (err) {
        // Non-fatal — validation is async
        Sentry.captureException(err, { tags: { context: "inngest.strategy.saved" } });
      }

      return strategy;
    }),

  /**
   * Save the full DAG JSON. Creates a version snapshot on each save.
   */
  saveDAG: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255),
        dag: dagSchema,
        versionMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      // Verify ownership
      const existing = await ctx.db
        .select({ id: strategies.id, version: strategies.version })
        .from(strategies)
        .where(
          and(eq(strategies.id, input.id), eq(strategies.userId, userId))
        )
        .limit(1);

      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      }

      const currentVersion = existing[0].version;
      const nextVersion = currentVersion + 1;

      // Save version snapshot
      await ctx.db.insert(strategyVersions).values({
        strategyId: input.id,
        dagJson: input.dag,
        version: currentVersion,
        message: input.versionMessage ?? `Version ${currentVersion}`,
      });

      // Update strategy
      const [updated] = await ctx.db
        .update(strategies)
        .set({
          name: input.name,
          dagJson: input.dag,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(eq(strategies.id, input.id))
        .returning();

      // Trigger background DAG validation
      try {
        await inngest.send({
          name: "supercanvas/strategy.saved",
          data: {
            strategyId: input.id,
            dagJson: input.dag,
          },
        });
      } catch (err) {
        Sentry.captureException(err, { tags: { context: "inngest.strategy.saved" } });
      }

      return { id: updated.id, version: updated.version, updatedAt: updated.updatedAt };
    }),

  /**
   * Get version history for a strategy (without full DAG JSON for speed).
   */
  versions: protectedProcedure
    .input(z.object({ strategyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      // Verify ownership
      const owned = await ctx.db
        .select({ id: strategies.id })
        .from(strategies)
        .where(
          and(eq(strategies.id, input.strategyId), eq(strategies.userId, userId))
        )
        .limit(1);

      if (!owned.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      }

      const versions = await ctx.db
        .select({
          id: strategyVersions.id,
          version: strategyVersions.version,
          message: strategyVersions.message,
          createdAt: strategyVersions.createdAt,
        })
        .from(strategyVersions)
        .where(eq(strategyVersions.strategyId, input.strategyId))
        .orderBy(desc(strategyVersions.version));

      return versions;
    }),

  /**
   * Restore a specific version.
   */
  restoreVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const [version] = await ctx.db
        .select()
        .from(strategyVersions)
        .where(eq(strategyVersions.id, input.versionId))
        .limit(1);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found." });
      }

      // Verify ownership via strategy
      const owned = await ctx.db
        .select({ id: strategies.id, version: strategies.version })
        .from(strategies)
        .where(
          and(eq(strategies.id, version.strategyId), eq(strategies.userId, userId))
        )
        .limit(1);

      if (!owned.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your strategy." });
      }

      const nextVersion = owned[0].version + 1;

      await ctx.db
        .update(strategies)
        .set({
          dagJson: version.dagJson,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(eq(strategies.id, version.strategyId));

      return {
        restoredVersion: version.version,
        newVersion: nextVersion,
        dagJson: version.dagJson,
      };
    }),

  /**
   * Fetch the full DAG snapshot for a specific version.
   * Used by the version diff viewer.
   */
  getVersionDAG: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const [version] = await ctx.db
        .select()
        .from(strategyVersions)
        .where(eq(strategyVersions.id, input.versionId))
        .limit(1);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found." });
      }

      // Verify ownership via the parent strategy
      const owned = await ctx.db
        .select({ id: strategies.id })
        .from(strategies)
        .where(
          and(eq(strategies.id, version.strategyId), eq(strategies.userId, userId))
        )
        .limit(1);

      if (!owned.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your strategy." });
      }

      return { dagJson: version.dagJson };
    }),

  /**
   * Rename or update metadata.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const { id, ...updates } = input;

      const [updated] = await ctx.db
        .update(strategies)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(strategies.id, id), eq(strategies.userId, userId)))
        .returning({ id: strategies.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      }

      return { id: updated.id };
    }),

  /**
   * Delete a strategy and all its versions and backtests (cascade in DB).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const [deleted] = await ctx.db
        .delete(strategies)
        .where(and(eq(strategies.id, input.id), eq(strategies.userId, userId)))
        .returning({ id: strategies.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      }

      return { id: deleted.id };
    }),
});

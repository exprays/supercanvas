// ─────────────────────────────────────────────
// SuperCanvas — DAG Validator
// Topological sort, cycle detection, port type validation
// Used by both the frontend (real-time) and Inngest (background)
// ─────────────────────────────────────────────

import type { StrategyDAG, StrategyEdge, StrategyNode } from "@supercanvas/types";
import { PORT_COLORS } from "@supercanvas/types";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  /** Topologically sorted node IDs (execution order) */
  executionOrder?: string[];
}

export interface ValidationError {
  type: "cycle" | "type_mismatch" | "missing_required" | "disconnected_output";
  nodeId?: string;
  portId?: string;
  message: string;
}

export interface ValidationWarning {
  type: "unconnected_input" | "orphan_node";
  nodeId?: string;
  message: string;
}

/**
 * Validate the full strategy DAG.
 * Runs cycle detection (Kahn's algorithm) and port type validation.
 */
export function validateDAG(dag: StrategyDAG): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!dag.nodes.length) {
    return { valid: true, errors: [], warnings: [], executionOrder: [] };
  }

  // ── Build adjacency map ──
  const nodeMap = new Map<string, StrategyNode>(dag.nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of dag.nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  for (const edge of dag.edges) {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // ── Kahn's algorithm for cycle detection ──
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const executionOrder: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    executionOrder.push(nodeId);

    for (const neighbor of adjList.get(nodeId) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (executionOrder.length !== dag.nodes.length) {
    errors.push({
      type: "cycle",
      message:
        "Strategy contains circular dependencies. Remove the cycle to run a backtest.",
    });
    return { valid: false, errors, warnings };
  }

  // ── Port type validation ──
  const edgeMap = new Map<string, StrategyEdge[]>();
  for (const edge of dag.edges) {
    const key = `${edge.source}:${edge.sourceHandle}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key)!.push(edge);
  }

  for (const edge of dag.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const outputPort = sourceNode.outputs.find((p) => p.id === edge.sourceHandle);
    const inputPort = targetNode.inputs.find((p) => p.id === edge.targetHandle);

    if (!outputPort || !inputPort) continue;

    if (outputPort.dataType !== inputPort.dataType) {
      errors.push({
        type: "type_mismatch",
        nodeId: edge.target,
        portId: edge.targetHandle,
        message: `Type mismatch: "${sourceNode.label}" outputs ${outputPort.dataType} but "${targetNode.label}" expects ${inputPort.dataType}`,
      });
    }
  }

  // ── Required input check ──
  const connectedInputs = new Set(
    dag.edges.map((e) => `${e.target}:${e.targetHandle}`)
  );

  for (const node of dag.nodes) {
    for (const input of node.inputs) {
      const key = `${node.id}:${input.id}`;
      if (input.required && !connectedInputs.has(key)) {
        errors.push({
          type: "missing_required",
          nodeId: node.id,
          portId: input.id,
          message: `"${node.label}" requires input "${input.label}" to be connected`,
        });
      }
    }
  }

  // ── Orphan node warnings ──
  const connectedNodes = new Set([
    ...dag.edges.map((e) => e.source),
    ...dag.edges.map((e) => e.target),
  ]);

  for (const node of dag.nodes) {
    if (!connectedNodes.has(node.id) && dag.nodes.length > 1) {
      warnings.push({
        type: "orphan_node",
        nodeId: node.id,
        message: `"${node.label}" is not connected to any other node`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    executionOrder,
  };
}

/**
 * Check if two port data types are compatible for connection.
 * Used in real-time canvas to highlight valid drop targets.
 */
export function arePortsCompatible(
  sourceType: string,
  targetType: string
): boolean {
  return sourceType === targetType;
}

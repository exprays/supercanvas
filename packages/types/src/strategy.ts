// ─────────────────────────────────────────────
// SuperCanvas — Strategy DAG Types
// The core data model for the visual strategy builder
// ─────────────────────────────────────────────

/** Port data types for type-safe node connections */
export type PortDataType =
  | "time_series"
  | "float_series"
  | "boolean_signal"
  | "model_signal"
  | "allocation_map"
  | "guard_rule"
  | "order_event"
  | "visualization";

/** Node categories matching the visual builder taxonomy */
export type NodeCategory =
  | "data_source"
  | "indicator"
  | "ml"
  | "signal_logic"
  | "portfolio"
  | "risk_control"
  | "execution"
  | "output";

/** A typed port on a node (input or output) */
export interface NodePort {
  id: string;
  label: string;
  dataType: PortDataType;
  required: boolean;
}

/** Configuration parameter for a node */
export interface NodeParam {
  key: string;
  label: string;
  type: "number" | "string" | "boolean" | "select" | "multi_select";
  default: unknown;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
}

/** A single node in the strategy DAG */
export interface StrategyNode {
  id: string;
  type: string;
  category: NodeCategory;
  label: string;
  params: Record<string, unknown>;
  inputs: NodePort[];
  outputs: NodePort[];
  position: { x: number; y: number };
}

/** An edge connecting two nodes */
export interface StrategyEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

/** Strategy metadata */
export interface StrategyMetadata {
  createdAt: string;
  updatedAt: string;
  author: string;
  tags: string[];
  description?: string;
}

/** The complete strategy DAG document */
export interface StrategyDAG {
  id: string;
  name: string;
  version: number;
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  metadata: StrategyMetadata;
}

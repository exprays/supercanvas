// ─────────────────────────────────────────────
// SuperCanvas — Canvas Store (Zustand)
// Manages node/edge state, undo/redo, selection, and dirty tracking
// ─────────────────────────────────────────────

import { create } from "zustand";
import { temporal } from "zundo";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import type { StrategyDAG } from "@supercanvas/types";
import { NODE_REGISTRY } from "@supercanvas/types";
import { arePortsCompatible } from "../lib/dag-validator";

export interface CanvasNode extends Node {
  data: {
    type: string;
    label: string;
    params: Record<string, unknown>;
    /** Whether this node is currently locked by another user */
    lockedBy?: string;
  };
}

export type CanvasEdge = Edge<{ sourceType: string; targetType: string }> & {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  strategyId: string | null;
  strategyName: string;
  currentUserId: string | null;

  // ── Actions ──
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNodeParams: (nodeId: string, params: Record<string, unknown>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  loadDAG: (dag: StrategyDAG) => void;
  toDAG: () => Omit<StrategyDAG, "id" | "name" | "version" | "metadata">;
  markSaved: () => void;
  setStrategyMeta: (id: string, name: string) => void;
  setCurrentUserId: (id: string) => void;
}

let nodeIdCounter = 1;
const genId = () => `node_${Date.now()}_${nodeIdCounter++}`;

export const useCanvasStore: any = create<CanvasState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
      strategyId: null,
      strategyName: "Untitled Strategy",
      currentUserId: null,

      setNodes: (nodes) => set({ nodes, isDirty: true }),
      setEdges: (edges) => set({ edges, isDirty: true }),

      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes) as CanvasNode[],
          isDirty: true,
        }));
      },

      onEdgesChange: (changes) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges) as CanvasEdge[],
          isDirty: true,
        }));
      },

      onConnect: (connection) => {
        // ── Enforce port type compatibility ──
        const { nodes } = get();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);
        const currentUserId = get().currentUserId;

        if (!sourceNode || !targetNode) return;

        // Prevent connecting locked nodes edited by someone else.
        if (
          (sourceNode.data.lockedBy &&
            sourceNode.data.lockedBy !== currentUserId) ||
          (targetNode.data.lockedBy &&
            targetNode.data.lockedBy !== currentUserId)
        ) {
          return;
        }

        const sourceDef = NODE_REGISTRY[sourceNode.data.type];
        const targetDef = NODE_REGISTRY[targetNode.data.type];
        if (!sourceDef || !targetDef) return;

        const outputPort = sourceDef.outputs.find(
          (p) => p.id === connection.sourceHandle
        );
        const inputPort = targetDef.inputs.find(
          (p) => p.id === connection.targetHandle
        );

        if (!outputPort || !inputPort) return;
        if (!arePortsCompatible(outputPort.dataType, inputPort.dataType)) return;

        set((state) => ({
          edges: addEdge(
            {
              ...connection,
              data: {
                sourceType: outputPort.dataType,
                targetType: inputPort.dataType,
              },
            },
            state.edges
          ) as CanvasEdge[],
          isDirty: true,
        }));
      },

      addNode: (type, position) => {
        const def = NODE_REGISTRY[type];
        if (!def) return;

        const newNode: CanvasNode = {
          id: genId(),
          type: "strategyNode",   // React Flow custom node component type
          position,
          draggable: true,
          data: {
            type,
            label: def.label,
            params: Object.fromEntries(
              def.params.map((p) => [p.key, p.default])
            ),
            lockedBy: undefined,
          },
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
          isDirty: true,
        }));
      },

      updateNodeParams: (nodeId, params) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        const currentUserId = get().currentUserId;
        if (node?.data.lockedBy && node.data.lockedBy !== currentUserId) return;

        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, params: { ...n.data.params, ...params } } }
              : n
          ),
          isDirty: true,
        }));
      },

      deleteNode: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        const currentUserId = get().currentUserId;
        if (node?.data.lockedBy && node.data.lockedBy !== currentUserId) return;

        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          isDirty: true,
        }));
      },

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      loadDAG: (dag) => {
        const nodes: CanvasNode[] = dag.nodes.map((n) => ({
          id: n.id,
          type: "strategyNode",
          position: n.position,
          draggable: true,
          data: {
            type: n.type,
            label: n.label,
            params: n.params,
            lockedBy: undefined,
          },
        }));

        const edges: CanvasEdge[] = dag.edges.map((e) => ({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: e.targetHandle,
        }));

        set({ nodes, edges, isDirty: false });
      },

      toDAG: () => {
        const { nodes, edges } = get();
        return {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.type,
            category: NODE_REGISTRY[n.data.type]?.category ?? "indicator",
            label: n.data.label,
            params: n.data.params,
            inputs: NODE_REGISTRY[n.data.type]?.inputs ?? [],
            outputs: NODE_REGISTRY[n.data.type]?.outputs ?? [],
            position: n.position,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle ?? "",
            target: e.target,
            targetHandle: e.targetHandle ?? "",
          })),
        };
      },

      markSaved: () => set({ isDirty: false }),
      setStrategyMeta: (id, name) => set({ strategyId: id, strategyName: name }),
      setCurrentUserId: (id) => set({ currentUserId: id }),
    }),
    {
      // Track undo/redo for nodes and edges only
      partialize: (state) => ({
        nodes: state.nodes.map((n) => ({
          ...n,
          draggable: undefined,
          data: { ...n.data, lockedBy: undefined },
        })),
        edges: state.edges,
      }),
      limit: 50,
    }
  )
);

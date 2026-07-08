import React, { useState, useCallback, useEffect } from "react";
import { useNodesState, useEdgesState, useReactFlow, addEdge, MarkerType } from "@xyflow/react";
import type { Node, Edge, Connection } from "@xyflow/react";
import Canvas from "./Canvas";
import Toolbar from "./Toolbar";
import CommandPalette from "./CommandPalette";
import AIGeneratePanel from "./AIGeneratePanel";
import { autoLayout } from "../lib/autoLayout";
import { parseMermaid, normalizeGraph } from "../lib/mermaidParser";

function normalizeGraph(raw: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = (raw.nodes || []).map((n: any) => ({
    id: String(n.id),
    type: n.type || "custom",
    position: n.position || { x: 0, y: 0 },
    data: { label: n.data?.label || String(n.id), category: n.data?.category || "default" },
  }));
  const edges: Edge[] = (raw.edges || []).map((e: any, i: number) => {
    let markerEnd: any = undefined;
    if (e.markerEnd) {
      if (typeof e.markerEnd === "string") {
        markerEnd = {
          type: e.markerEnd === "arrowclosed" ? MarkerType.ArrowClosed : MarkerType.Arrow,
        };
      } else if (e.markerEnd.type) {
        const t = String(e.markerEnd.type).toLowerCase();
        markerEnd = {
          type: t === "arrowclosed" ? MarkerType.ArrowClosed : MarkerType.Arrow,
        };
      }
    }
    return {
      id: e.id || ("edge-" + String(i)),
      source: String(e.source),
      target: String(e.target),
      type: "smoothstep",
      animated: e.animated !== false,
      label: typeof e.label === "string" ? e.label : "",
      markerEnd: markerEnd || { type: MarkerType.ArrowClosed },
    };
  });
  return { nodes, edges };
}

export default function Builder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "G") {
        e.preventDefault();
        setShowAIPanel((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const newNode: Node = {
        id: ce.detail.id,
        type: ce.detail.type,
        position: ce.detail.position,
        data: ce.detail.data,
      };
      setNodes((nds) => nds.concat(newNode));
    };
    window.addEventListener("palette:insert", handler);
    return () => window.removeEventListener("palette:insert", handler);
  }, [setNodes]);

  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => {
      const result = autoLayout({ nodes: nds, edges });
      return result.nodes.map((n: any) => ({ ...n, position: n.position || { x: 0, y: 0 } }));
    });
    setTimeout(() => fitView({ duration: 300 }), 50);
  }, [edges, setNodes, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 300 });
  }, [fitView]);

  const handleEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const currentLabel = (edge.label as string) || "";
      const label = window.prompt("Edit edge label:", currentLabel);
      if (label !== null) {
        setEdges((eds) =>
          eds.map((e) => (e.id === edge.id ? { ...e, label: label || undefined } : e))
        );
      }
    },
    [setEdges]
  );

  const handleLoadSample = useCallback(async () => {
    const files = ["banking-agent.json", "my-demo.json"];
    const name = window.prompt(
      "Enter sample name (banking-agent or my-demo):",
      "banking-agent"
    );
    if (!name) return;
    const fileName =
      files.find((f) => f.includes(name.toLowerCase())) ||
      (name.endsWith(".json") ? name : name + ".json");
    try {
      const res = await fetch("/graphs/" + fileName);
      if (!res.ok) {
        alert("Failed to load " + fileName);
        return;
      }
      const raw = await res.json();
      const normalized = normalizeGraph(raw);
      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      setTimeout(() => fitView({ duration: 300 }), 50);
    } catch (err) {
      alert("Error loading sample: " + (err as Error).message);
    }
  }, [setNodes, setEdges, fitView]);

  const handleExport = useCallback(() => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleClear = useCallback(() => {
    if (window.confirm("Clear all nodes and edges?")) {
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges]);

  const handleImportMermaid = useCallback(
    (text: string) => {
      const result = parseMermaid(text);
      if (!result) {
        alert("Invalid Mermaid flowchart");
        return;
      }
      const normalized = normalizeGraph(result);
      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      setTimeout(() => fitView({ duration: 300 }), 50);
    },
    [setNodes, setEdges, fitView]
  );

  const handleAIGenerate = useCallback(
    (mermaid: string) => {
      const result = parseMermaid(mermaid);
      if (!result) {
        alert("AI generated invalid Mermaid — please try again with a more detailed description.");
        return;
      }
      const normalized = normalizeGraph(result);
      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      // apply auto layout so generated nodes look clean
      setTimeout(() => {
        setNodes((nds) => {
          const layoutResult = autoLayout({ nodes: nds, edges: normalized.edges });
          return layoutResult.nodes.map((n: any) => ({ ...n, position: n.position || { x: 0, y: 0 } }));
        });
        setTimeout(() => fitView({ duration: 300 }), 50);
      }, 50);
    },
    [setNodes, setEdges, fitView]
  );

  return (
    <div className="app">
      <Toolbar
        onAutoLayout={handleAutoLayout}
        onFitView={handleFitView}
        onLoadSample={handleLoadSample}
        onExport={handleExport}
        onClear={handleClear}
        onImportMermaid={handleImportMermaid}
        onAIGenerate={() => setShowAIPanel(true)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid((v) => !v)}
      />
      <Canvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        snapToGrid={snapToGrid}
      />
      {showPalette && (
        <CommandPalette onClose={() => setShowPalette(false)} />
      )}
      {showAIPanel && (
        <AIGeneratePanel
          onClose={() => setShowAIPanel(false)}
          onInsert={handleAIGenerate}
        />
      )}
    </div>
  );
}
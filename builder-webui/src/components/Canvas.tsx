import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
} from '@xyflow/react';
import FlowNode from '@/components/nodes/FlowNode';

const nodeTypes = {
  source: FlowNode,
  end: FlowNode,
  custom: FlowNode,
};

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeDoubleClick: (event: React.MouseEvent, edge: Edge) => void;
  snapToGrid: boolean;
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed },
  animated: true,
  style: { stroke: '#6366f1', strokeWidth: 2 },
};

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  snapToGrid,
}) => {
  const snapGrid: [number, number] = snapToGrid ? [16, 16] : [1, 1];

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        selectionOnDrag
        panOnScroll
        style={{ background: 'var(--bg)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(99, 102, 241, 0.15)"
        />
        <Controls className="!border-[var(--border)] !bg-[var(--panel)] !text-[var(--text)]" />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as any;
            const cat = data?.category ?? 'default';
            const colors: Record<string, string> = {
              agent: '#3b82f6',
              tool: '#f59e0b',
              llm: '#8b5cf6',
              condition: '#ec4899',
              retriever: '#14b8a6',
              memory: '#94a3b8',
              default: '#64748b',
            };
            if (n.type === 'source') return '#16a34a';
            if (n.type === 'end') return '#dc2626';
            return colors[cat] ?? colors.default;
          }}
          maskColor="rgba(5, 7, 16, 0.7)"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        />
      </ReactFlow>
    </div>
  );
};

export default Canvas;

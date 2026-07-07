// autoLayout.ts — 层次化自动布局引擎
// 端口自 lib/auto-layout.js（简化版 Sugiyama / Kahn BFS 分层）

const V_SPACING = 150; // 层间垂直间距
const H_SPACING = 200; // 同层水平间距

interface GNode {
  id: string;
  position?: { x: number; y: number };
  [k: string]: any;
}
interface GEdge {
  source: string;
  target: string;
  [k: string]: any;
}
interface GGraph {
  nodes: GNode[];
  edges: GEdge[];
}

export function autoLayout(graphData: GGraph): GGraph {
  const nodes = graphData.nodes;
  const edges = graphData.edges;

  if (!nodes || nodes.length === 0) return graphData;
  if (!edges || edges.length === 0) {
    nodes.forEach((n, i) => (n.position = { x: 0, y: i * V_SPACING }));
    return graphData;
  }

  const adjList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  const nodeMap: Record<string, GNode> = {};

  nodes.forEach((n) => {
    nodeMap[n.id] = n;
    adjList[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach((e) => {
    if (adjList[e.source]) adjList[e.source].push(e.target);
    if (inDegree[e.target] !== undefined) inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  });

  const layers: string[][] = [];
  const layerMap: Record<string, number> = {};
  const visited: Record<string, boolean> = {};
  const queue: string[] = [];

  nodes.forEach((n) => {
    if (inDegree[n.id] === 0) {
      layerMap[n.id] = 0;
      queue.push(n.id);
    }
  });

  if (queue.length === 0 && nodes.length > 0) {
    layerMap[nodes[0].id] = 0;
    queue.push(nodes[0].id);
  }

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (visited[current]) continue;
    visited[current] = true;

    const currentLayer = layerMap[current];
    if (!layers[currentLayer]) layers[currentLayer] = [];
    layers[currentLayer].push(current);

    const neighbors = adjList[current] || [];
    neighbors.forEach((next) => {
      const nextLayer = (currentLayer || 0) + 1;
      if (layerMap[next] === undefined || layerMap[next] < nextLayer) layerMap[next] = nextLayer;
      if (!visited[next]) queue.push(next);
    });
  }

  nodes.forEach((n) => {
    if (layerMap[n.id] === undefined) {
      const maxLayer = layers.length;
      layerMap[n.id] = maxLayer;
      if (!layers[maxLayer]) layers[maxLayer] = [];
      layers[maxLayer].push(n.id);
    }
  });

  layers.forEach((layerNodeIds, layerIndex) => {
    const count = layerNodeIds.length;
    const xStart = -((count - 1) * H_SPACING) / 2;
    layerNodeIds.forEach((nodeId, nodeIndex) => {
      const node = nodeMap[nodeId];
      if (node) node.position = { x: xStart + nodeIndex * H_SPACING, y: layerIndex * V_SPACING };
    });
  });

  return graphData;
}

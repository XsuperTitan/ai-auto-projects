// mermaidParser.ts — Mermaid Flowchart 解析为 ReactFlow 节点/边
// 端口自 lib/mermaid-parser.js

let edgeIdCounter = 0;
let nodeIdCounter = 0;

function resetCounters() {
  edgeIdCounter = 0;
  nodeIdCounter = 0;
}

function extractMermaidCode(text: string): string | null {
  if (!text) return null;
  const codeBlockMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
  const code = codeBlockMatch ? codeBlockMatch[1] : text;
  if (!code.match(/flowchart|graph\s+/i)) return null;
  return code.trim();
}

function parseNodes(code: string): Map<string, { id: string; label: string }> {
  const nodes = new Map<string, { id: string; label: string }>();
  const nodeDefPattern = /\b(\w+)\s*[\[\(\{]([^\]\)\}]*)[\]\)\}](?!\s*(?:-->|==>|-.->))/g;
  let match: RegExpExecArray | null;
  while ((match = nodeDefPattern.exec(code)) !== null) {
    const id = match[1];
    const label = (match[2] || '').trim();
    if (!nodes.has(id)) nodes.set(id, { id, label: label || id });
  }
  return nodes;
}

function parseEdges(
  code: string,
  nodes: Map<string, { id: string; label: string }>
): any[] {
  const edges: any[] = [];
  const edgePattern = /(\w+)\s*(-->|==>|-.->)\s*(?:\|([^|]*?)\|)?\s*(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = edgePattern.exec(code)) !== null) {
    const from = match[1];
    const label = match[3] || '';
    const to = match[4];
    if (!nodes.has(from)) nodes.set(from, { id: from, label: from });
    if (!nodes.has(to)) nodes.set(to, { id: to, label: to });
    edges.push({
      id: 'ai-edge-' + edgeIdCounter++,
      source: from,
      target: to,
      type: 'smoothstep',
      animated: label ? true : false,
      label: label ? label.trim() : 'conditional_edge',
    });
  }
  const outDegree: Record<string, number> = {};
  edges.forEach((e) => (outDegree[e.source] = (outDegree[e.source] || 0) + 1));
  edges.forEach((e) => {
    if (outDegree[e.source] > 1) {
      e.animated = true;
      if (!e.label || e.label === 'conditional_edge') e.label = 'conditional_edge';
    }
  });
  return edges;
}

function ensureSourceEndNodes(nodes: any[], edges: any[]) {
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  edges.forEach((e) => {
    hasIncoming.add(e.target);
    hasOutgoing.add(e.source);
  });
  const sourceId = 'source';
  const endId = 'end';
  const hasSource = nodes.some((n) => n.id === sourceId);
  const hasEnd = nodes.some((n) => n.id === endId);
  if (!hasSource)
    nodes.unshift({ id: sourceId, type: 'source', position: { x: 0, y: 0 }, data: { label: 'start' } });
  if (!hasEnd)
    nodes.push({ id: endId, type: 'end', position: { x: 0, y: 600 }, data: { label: '__end__' } });

  const sourceAlreadyConnected = new Set<string>();
  edges.forEach((e) => {
    if (e.source === sourceId) sourceAlreadyConnected.add(e.target);
  });
  nodes.forEach((n) => {
    if (n.type === 'custom' && !hasIncoming.has(n.id) && !sourceAlreadyConnected.has(n.id)) {
      edges.unshift({
        id: 'ai-edge-' + edgeIdCounter++,
        source: sourceId,
        target: n.id,
        type: 'smoothstep',
        animated: false,
        label: 'conditional_edge',
      });
    }
  });
  const endAlreadyConnected = new Set<string>();
  edges.forEach((e) => {
    if (e.target === endId) endAlreadyConnected.add(e.source);
  });
  nodes.forEach((n) => {
    if (n.type === 'custom' && !hasOutgoing.has(n.id) && !endAlreadyConnected.has(n.id)) {
      edges.push({
        id: 'ai-edge-' + edgeIdCounter++,
        source: n.id,
        target: endId,
        type: 'smoothstep',
        animated: false,
        label: 'conditional_edge',
      });
    }
  });
}

export function parseMermaid(text: string): { nodes: any[]; edges: any[]; direction: string } | null {
  resetCounters();
  const code = extractMermaidCode(text);
  if (!code) return null;
  const dirMatch = code.match(/flowchart\s+(TD|LR|TB|RL|BT)/i);
  const direction = dirMatch ? dirMatch[1].toUpperCase() : 'TD';
  const nodes = parseNodes(code);
  const edges = parseEdges(code, nodes);
  const connectedNodes = new Set<string>();
  edges.forEach((e) => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });
  const nodeList: any[] = [];
  nodes.forEach((node, id) => {
    if (connectedNodes.has(id) || edges.length === 0) {
      nodeList.push({ id, type: 'custom', position: { x: 0, y: 0 }, data: { label: node.label || id } });
    }
  });
  ensureSourceEndNodes(nodeList, edges);
  return { nodes: nodeList, edges, direction };
}


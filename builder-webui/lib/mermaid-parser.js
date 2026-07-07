/**
 * mermaid-parser.js — Mermaid Flowchart TD 解析器
 *
 * 将 Mermaid flowchart 语法转换为 ReactFlow nodes/edges 格式。
 *
 * 支持的语法：
 *   节点: A[label], B{label}, C([label]), D((label))
 *   边:   A --> B, A -->|条件| B, A -.-> B
 *   方向: flowchart TD / LR / TB / RL
 */

var edgeIdCounter = 0;
var nodeIdCounter = 0;

function resetCounters() {
  edgeIdCounter = 0;
  nodeIdCounter = 0;
}

/**
 * 提取 Mermaid 代码（处理 markdown 代码块包裹）
 */
function extractMermaidCode(text) {
  if (!text) return null;

  // 去除 markdown 代码块
  var codeBlockMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
  var code = codeBlockMatch ? codeBlockMatch[1] : text;

  // 验证是否包含 flowchart/graph 关键字
  if (!code.match(/flowchart|graph\s+/i)) return null;

  return code.trim();
}

/**
 * 解析节点定义：A[label], B{label}, C([label]), D((label))
 */
function parseNodes(code) {
  var nodes = new Map();
  var nodeDefPattern = /\b(\w+)\s*[\[\(\{]([^\]\)\}]*)[\]\)\}](?!\s*(?:-->|==>|-.->))/g;

  var match;
  while ((match = nodeDefPattern.exec(code)) !== null) {
    var id = match[1];
    var label = (match[2] || '').trim();
    if (!nodes.has(id)) {
      nodes.set(id, { id: id, label: label || id });
    }
  }

  return nodes;
}

/**
 * 解析边定义：A --> B, A -->|条件| B, A -.-> B
 */
function parseEdges(code, nodes) {
  var edges = [];
  var edgePattern = /(\w+)\s*(-->|==>|-.->)\s*(?:\|([^|]*?)\|)?\s*(\w+)/g;

  var match;
  while ((match = edgePattern.exec(code)) !== null) {
    var from = match[1];
    var arrowType = match[2];
    var label = match[3] || '';
    var to = match[4];

    // 确保节点存在
    if (!nodes.has(from)) {
      nodes.set(from, { id: from, label: from });
    }
    if (!nodes.has(to)) {
      nodes.set(to, { id: to, label: to });
    }

    edges.push({
      id: 'ai-edge-' + (edgeIdCounter++),
      source: from,
      target: to,
      type: 'self-connecting-edge',
      animated: label ? true : false,
      label: label ? label.trim() : 'conditional_edge',
      markerEnd: { type: 'arrowclosed' }
    });
  }

  // 自动标记条件边：同一 source 有多个出边的
  var outDegree = {};
  edges.forEach(function (e) {
    outDegree[e.source] = (outDegree[e.source] || 0) + 1;
  });
  edges.forEach(function (e) {
    if (outDegree[e.source] > 1) {
      e.animated = true;
      if (!e.label || e.label === 'conditional_edge') {
        e.label = 'conditional_edge_' + (outDegree[e.source] > 1 ? '1' : '');
      }
    }
  });

  return edges;
}

/**
 * 主解析函数
 * @param {string} text - Mermaid 源码
 * @returns {{nodes: Array, edges: Array}|null}
 */
function parseMermaid(text) {
  resetCounters();

  var code = extractMermaidCode(text);
  if (!code) return null;

  // 提取方向
  var dirMatch = code.match(/flowchart\s+(TD|LR|TB|RL|BT)/i);
  var direction = dirMatch ? dirMatch[1].toUpperCase() : 'TD';

  // 解析节点和边
  var nodes = parseNodes(code);
  var edges = parseEdges(code, nodes);

  // 移除没有参与任何边的孤立节点（保留至少参与一条边的节点）
  var connectedNodes = new Set();
  edges.forEach(function (e) {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });

  var nodeList = [];
  nodes.forEach(function (node, id) {
    if (connectedNodes.has(id) || edges.length === 0) {
      nodeList.push({
        id: id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { label: node.label || id }
      });
    }
  });

  // 添加 source 和 end 节点
  ensureSourceEndNodes(nodeList, edges);

  return {
    nodes: nodeList,
    edges: edges,
    direction: direction
  };
}

/**
 * 添加 source/end 节点并连接
 */
function ensureSourceEndNodes(nodes, edges) {
  // 计算入度和出度
  var hasIncoming = new Set();
  var hasOutgoing = new Set();
  edges.forEach(function (e) {
    hasIncoming.add(e.target);
    hasOutgoing.add(e.source);
  });

  var sourceId = 'source';
  var endId = 'end';

  // 检查是否已有 source/end
  var hasSource = nodes.some(function (n) { return n.id === sourceId; });
  var hasEnd = nodes.some(function (n) { return n.id === endId; });

  if (!hasSource) {
    nodes.unshift({
      id: sourceId,
      type: 'source',
      position: { x: 0, y: 0 },
      data: { label: 'start' }
    });
  }

  if (!hasEnd) {
    nodes.push({
      id: endId,
      type: 'end',
      position: { x: 0, y: 600 },
      data: { label: '__end__' }
    });
  }

  // 连接 source → 入度为0的节点
  var sourceAlreadyConnected = new Set();
  edges.forEach(function (e) {
    if (e.source === sourceId) sourceAlreadyConnected.add(e.target);
  });

  nodes.forEach(function (n) {
    if (n.type === 'custom' && !hasIncoming.has(n.id) && !sourceAlreadyConnected.has(n.id)) {
      edges.unshift({
        id: 'ai-edge-' + (edgeIdCounter++),
        source: sourceId,
        target: n.id,
        type: 'self-connecting-edge',
        animated: false,
        label: 'conditional_edge',
        markerEnd: { type: 'arrowclosed' }
      });
    }
  });

  // 连接出度为0的节点 → end
  var endAlreadyConnected = new Set();
  edges.forEach(function (e) {
    if (e.target === endId) endAlreadyConnected.add(e.source);
  });

  nodes.forEach(function (n) {
    if (n.type === 'custom' && !hasOutgoing.has(n.id) && !endAlreadyConnected.has(n.id)) {
      edges.push({
        id: 'ai-edge-' + (edgeIdCounter++),
        source: n.id,
        target: endId,
        type: 'self-connecting-edge',
        animated: false,
        label: 'conditional_edge',
        markerEnd: { type: 'arrowclosed' }
      });
    }
  });
}

module.exports = { parseMermaid };

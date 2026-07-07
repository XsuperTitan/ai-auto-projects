/**
 * fallback-parser.js — 兜底文本解析器
 *
 * 当 DeepSeek API 不可用时，直接解析用户输入的文本结构。
 *
 * 支持三种格式：
 *   格式1: 箭头链  "A → B → C" 或 "A --> B --> C"
 *   格式2: 带标签箭头 "A --通过--> B --驳回--> C"
 *   格式3: 缩进树  "A\n  通过→B\n  驳回→C"
 */

var edgeIdCounter = 0;
var nodeIdCounter = 0;

function resetCounters() {
  edgeIdCounter = 0;
  nodeIdCounter = 0;
}

function newNodeId() {
  return 'ai-node-' + (nodeIdCounter++);
}

function getOrCreateNode(nodesMap, label) {
  label = label.trim();
  // 查找已有同标签节点
  var found = null;
  nodesMap.forEach(function (n) {
    if (n.data && n.data.label === label) found = n;
  });
  if (found) return found.id;

  var id = newNodeId();
  nodesMap.set(id, {
    id: id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { label: label }
  });
  return id;
}

/**
 * 解析箭头格式：A --> B 或 A → B 或 A --条件--> B
 */
function parseArrowFormat(text) {
  var nodesMap = new Map();
  var edges = [];
  var lines = text.split('\n');

  lines.forEach(function (line) {
    line = line.trim();
    if (!line) return;

    // 匹配: A --> B
    var simpleMatch = line.match(/^(.+?)\s*(-->|==>|→)\s*(.+)$/);
    if (simpleMatch) {
      var fromLabel = simpleMatch[1].trim();
      var toLabel = simpleMatch[3].trim();
      var fromId = getOrCreateNode(nodesMap, fromLabel);
      var toId = getOrCreateNode(nodesMap, toLabel);
      edges.push({
        id: 'ai-edge-' + (edgeIdCounter++),
        source: fromId,
        target: toId,
        type: 'self-connecting-edge',
        animated: false,
        label: 'conditional_edge',
        markerEnd: { type: 'arrowclosed' }
      });
      return;
    }

    // 匹配: A --条件--> B
    var condMatch = line.match(/^(.+?)\s*--(.+?)-->\s*(.+)$/);
    if (condMatch) {
      var fromL = condMatch[1].trim();
      var cond = condMatch[2].trim();
      var toL = condMatch[3].trim();
      var fromId2 = getOrCreateNode(nodesMap, fromL);
      var toId2 = getOrCreateNode(nodesMap, toL);
      edges.push({
        id: 'ai-edge-' + (edgeIdCounter++),
        source: fromId2,
        target: toId2,
        type: 'self-connecting-edge',
        animated: true,
        label: cond,
        markerEnd: { type: 'arrowclosed' }
      });
    }
  });

  // 标记条件边：同一 source 有多个出边
  markConditionalEdges(edges);

  return {
    nodes: Array.from(nodesMap.values()),
    edges: edges
  };
}

/**
 * 解析缩进树形格式：
 *   订单处理
 *     通过 → 发货
 *     驳回 → 通知
 */
function parseTreeFormat(text) {
  var nodesMap = new Map();
  var edges = [];
  var lines = text.split('\n');

  // 检测是否真的是缩进格式
  var hasIndent = lines.some(function (l) {
    return l.match(/^\s{2,}\S/);
  });
  if (!hasIndent) return null;

  var parents = []; // 缩进栈 [{indent, label}]
  lines.forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed) return;

    var indent = line.search(/\S/);
    if (indent < 0) indent = 0;

    // 弹出比当前缩进深的节点
    while (parents.length > 0 && parents[parents.length - 1].indent >= indent) {
      parents.pop();
    }

    // 检查是否包含箭头
    var arrowMatch = trimmed.match(/^(.+?)\s*(-->|==>|→)\s*(.+)$/);
    if (arrowMatch) {
      var fromLabel = arrowMatch[1].trim();
      var toLabel = arrowMatch[3].trim();
      var fromId = getOrCreateNode(nodesMap, fromLabel);
      var toId = getOrCreateNode(nodesMap, toLabel);
      edges.push({
        id: 'ai-edge-' + (edgeIdCounter++),
        source: fromId,
        target: toId,
        type: 'self-connecting-edge',
        animated: false,
        label: 'conditional_edge',
        markerEnd: { type: 'arrowclosed' }
      });
    } else if (parents.length > 0) {
      // 缩进子节点：连接到父节点
      var parentLabel = parents[parents.length - 1].label;
      var childLabel = trimmed;
      var parentId = getOrCreateNode(nodesMap, parentLabel);
      var childId = getOrCreateNode(nodesMap, childLabel);
      edges.push({
        id: 'ai-edge-' + (edgeIdCounter++),
        source: parentId,
        target: childId,
        type: 'self-connecting-edge',
        animated: false,
        label: 'conditional_edge',
        markerEnd: { type: 'arrowclosed' }
      });
    }

    parents.push({ indent: indent, label: trimmed });
  });

  markConditionalEdges(edges);

  return {
    nodes: Array.from(nodesMap.values()),
    edges: edges
  };
}

/**
 * 关键词拆分为顺序链路：按行拆分，每行作为一个步骤
 */
function parseKeywordSplit(text) {
  var nodesMap = new Map();
  var edges = [];
  var lines = text.split('\n');

  // 过滤出有意义的行
  var steps = [];
  lines.forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    // 移除常见的序号前缀
    trimmed = trimmed.replace(/^[\d一二三四五六七八九十]+[.、．)\s]+/, '');
    // 移除常见的系统标签 [xxx]
    trimmed = trimmed.replace(/^\[[^\]]+\]\s*/, '');
    if (trimmed.length > 1) steps.push(trimmed);
  });

  if (steps.length < 2) return null;

  // 为每个步骤创建节点
  steps.forEach(function (label, i) {
    getOrCreateNode(nodesMap, label);
  });

  // 创建顺序边
  for (var i = 0; i < steps.length - 1; i++) {
    var fromId = getOrCreateNode(nodesMap, steps[i]);
    var toId = getOrCreateNode(nodesMap, steps[i + 1]);
    edges.push({
      id: 'ai-edge-' + (edgeIdCounter++),
      source: fromId,
      target: toId,
      type: 'self-connecting-edge',
      animated: false,
      label: 'conditional_edge',
      markerEnd: { type: 'arrowclosed' }
    });
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: edges
  };
}

/**
 * 自动标记条件边：同一 source 有多条出边的，标记为 animated
 */
function markConditionalEdges(edges) {
  var outDegree = {};
  edges.forEach(function (e) {
    outDegree[e.source] = (outDegree[e.source] || 0) + 1;
  });
  edges.forEach(function (e) {
    if (outDegree[e.source] > 1) {
      e.animated = true;
    }
  });
}

/**
 * 主入口：依次尝试三种格式
 */
function parseFallback(text) {
  resetCounters();

  if (!text || text.trim().length < 3) return null;

  // 尝试 1: 箭头格式
  var result = parseArrowFormat(text);
  if (result && result.nodes.length >= 2) return result;

  // 尝试 2: 树形缩进格式
  result = parseTreeFormat(text);
  if (result && result.nodes.length >= 2) return result;

  // 尝试 3: 关键词拆分
  result = parseKeywordSplit(text);
  if (result && result.nodes.length >= 2) return result;

  return null;
}

module.exports = { parseFallback };

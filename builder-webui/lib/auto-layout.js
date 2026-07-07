/**
 * auto-layout.js — 层次化自动布局引擎
 *
 * 算法：简化版 Sugiyama (Kahn BFS 分层)
 *  - 计算每层节点（BFS 从入度为 0 的节点开始）
 *  - 同层节点水平居中排列
 *  - source/end 节点放在固定的顶层和底层
 */

const V_SPACING = 150;  // 层间垂直间距
const H_SPACING = 200;  // 同层水平间距

function autoLayout(graphData) {
  var nodes = graphData.nodes;
  var edges = graphData.edges;

  if (!nodes || nodes.length === 0) return graphData;
  if (!edges || edges.length === 0) {
    // 无边的孤立节点，垂直排列
    nodes.forEach(function (n, i) {
      n.position = { x: 0, y: i * V_SPACING };
    });
    return graphData;
  }

  // Step 1: 构建邻接表 和 入度统计
  var adjList = {};
  var inDegree = {};
  var nodeMap = {};

  nodes.forEach(function (n) {
    nodeMap[n.id] = n;
    adjList[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach(function (e) {
    if (adjList[e.source]) {
      adjList[e.source].push(e.target);
    }
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    }
  });

  // Step 2: Kahn BFS 分层
  var layers = [];
  var layerMap = {};
  var visited = {};
  var queue = [];

  // 第 0 层：入度为 0 的节点
  nodes.forEach(function (n) {
    if (inDegree[n.id] === 0) {
      layerMap[n.id] = 0;
      queue.push(n.id);
    }
  });

  // 如果所有节点都有入度（可能是环），取第一个节点开始
  if (queue.length === 0 && nodes.length > 0) {
    layerMap[nodes[0].id] = 0;
    queue.push(nodes[0].id);
  }

  while (queue.length > 0) {
    var current = queue.shift();
    if (visited[current]) continue;
    visited[current] = true;

    var currentLayer = layerMap[current];
    if (!layers[currentLayer]) layers[currentLayer] = [];
    layers[currentLayer].push(current);

    var neighbors = adjList[current] || [];
    neighbors.forEach(function (next) {
      var nextLayer = (currentLayer || 0) + 1;
      if (layerMap[next] === undefined || layerMap[next] < nextLayer) {
        layerMap[next] = nextLayer;
      }
      // 只有未访问过的才入队
      if (!visited[next]) {
        queue.push(next);
      }
    });
  }

  // 处理未被访问的节点（孤岛）
  nodes.forEach(function (n) {
    if (layerMap[n.id] === undefined) {
      var maxLayer = layers.length;
      layerMap[n.id] = maxLayer;
      if (!layers[maxLayer]) layers[maxLayer] = [];
      layers[maxLayer].push(n.id);
    }
  });

  // Step 3: 分配坐标
  layers.forEach(function (layerNodeIds, layerIndex) {
    var count = layerNodeIds.length;
    var xStart = -((count - 1) * H_SPACING) / 2;

    layerNodeIds.forEach(function (nodeId, nodeIndex) {
      var node = nodeMap[nodeId];
      if (node) {
        node.position = {
          x: xStart + nodeIndex * H_SPACING,
          y: layerIndex * V_SPACING
        };
      }
    });
  });

  return graphData;
}

module.exports = { autoLayout };

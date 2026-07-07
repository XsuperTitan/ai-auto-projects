// nodeTemplates.ts — 命令面板 / 节点调色板的数据源

export type NodeCategory =
  | 'agent'
  | 'tool'
  | 'llm'
  | 'condition'
  | 'retriever'
  | 'memory'
  | 'default';

export interface NodeTemplate {
  key: string;
  label: string;
  hint: string;
  nodeType: 'source' | 'end' | 'custom';
  category?: NodeCategory;
}

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  agent: '#3b82f6',
  tool: '#f59e0b',
  llm: '#8b5cf6',
  condition: '#ec4899',
  retriever: '#14b8a6',
  memory: '#94a3b8',
  default: '#64748b',
};

export const NODE_TEMPLATES: NodeTemplate[] = [
  { key: 'start', label: '开始 Start', hint: '流程入口', nodeType: 'source' },
  { key: 'end', label: '结束 End', hint: '流程出口', nodeType: 'end' },
  { key: 'agent', label: 'Agent', hint: '智能体节点', nodeType: 'custom', category: 'agent' },
  { key: 'tool', label: '工具 Tool', hint: '调用外部工具', nodeType: 'custom', category: 'tool' },
  { key: 'llm', label: '大模型 LLM', hint: '模型推理', nodeType: 'custom', category: 'llm' },
  { key: 'condition', label: '条件分支', hint: 'if / 路由', nodeType: 'custom', category: 'condition' },
  { key: 'retriever', label: '检索 Retriever', hint: '知识检索', nodeType: 'custom', category: 'retriever' },
  { key: 'memory', label: '记忆 Memory', hint: '状态存储', nodeType: 'custom', category: 'memory' },
];

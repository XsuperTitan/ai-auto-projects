import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CATEGORY_COLORS, type NodeCategory } from '@/lib/nodeTemplates';

interface FlowNodeData {
  label: string;
  category?: NodeCategory;
}

const FlowNode = memo(({ id, type, data, selected }: NodeProps) => {
  const nodeData = data as unknown as FlowNodeData;
  const label = nodeData?.label ?? id;
  const category = nodeData?.category ?? 'default';
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;

  if (type === 'source') {
    return (
      <div className={`flow-node src${selected ? ' selected' : ''}`}>
        <Handle type="source" position={Position.Bottom} />
        <span>{label}</span>
      </div>
    );
  }

  if (type === 'end') {
    return (
      <div className={`flow-node end${selected ? ' selected' : ''}`}>
        <Handle type="target" position={Position.Top} />
        <span>{label === '__end__' ? 'end' : label}</span>
      </div>
    );
  }

  // custom node — colored card
  return (
    <div
      className={`flow-node${selected ? ' selected' : ''}`}
      style={{ background: color }}
    >
      <Handle type="target" position={Position.Top} />
      <span>{label}</span>
      {category && category !== 'default' && (
        <span className="cat">{category}</span>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

FlowNode.displayName = 'FlowNode';

export default FlowNode;

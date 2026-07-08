import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { NODE_TEMPLATES, CATEGORY_COLORS, type NodeTemplate } from '@/lib/nodeTemplates';

const CommandPalette: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const filtered = NODE_TEMPLATES.filter((t) => {
    const q = query.toLowerCase();
    return (
      t.label.toLowerCase().includes(q) ||
      t.hint.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  });

  // reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const insertNode = useCallback(
    (template: NodeTemplate) => {
      const pos = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      // addNode is not directly available; we dispatch custom event.
      window.dispatchEvent(
        new CustomEvent('palette:insert', {
          detail: {
            id: `${template.key}-${Date.now()}`,
            type: template.nodeType,
            position: pos,
            data: { label: template.label, category: template.category },
          },
        })
      );
      onClose();
    },
    [screenToFlowPosition, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[activeIndex]) insertNode(filtered[activeIndex]);
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [filtered, activeIndex, insertNode, onClose]
  );

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索节点… (agent / llm / 条件 / 工具)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="list">
          {filtered.map((t, i) => {
            const color =
              CATEGORY_COLORS[t.category ?? 'default'] ??
              CATEGORY_COLORS.default;
            return (
              <div
                key={t.key}
                className={`palette-item${i === activeIndex ? ' active' : ''}`}
                onClick={() => insertNode(t)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="dot" style={{ background: color }} />
                <div className="meta">
                  <b>{t.label}</b>
                  <span>{t.hint}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="palette-item" style={{ cursor: 'default' }}>
              <div className="meta">
                <span>无匹配节点</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

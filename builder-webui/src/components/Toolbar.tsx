import React, { useState, useCallback } from 'react';

interface ToolbarProps {
  onAutoLayout: () => void;
  onFitView: () => void;
  onLoadSample: () => void;
  onExport: () => void;
  onClear: () => void;
  onImportMermaid: (text: string) => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAutoLayout,
  onFitView,
  onLoadSample,
  onExport,
  onClear,
  onImportMermaid,
  snapToGrid,
  onToggleSnap,
}) => {
  const [showMermaid, setShowMermaid] = useState(false);
  const [mermaidText, setMermaidText] = useState('');

  const handleMermaidSubmit = useCallback(() => {
    if (mermaidText.trim()) {
      onImportMermaid(mermaidText.trim());
      setMermaidText('');
      setShowMermaid(false);
    }
  }, [mermaidText, onImportMermaid]);

  return (
    <>
      <div className="toolbar">
        <span className="brand">
          ⚡ Builder <small>v0.1</small>
        </span>
        <button onClick={onAutoLayout} title="自动布局">
          📐 自动布局
        </button>
        <button onClick={onFitView} title="适应视图">
          🔍 适应视图
        </button>
        <button
          className={snapToGrid ? 'active' : ''}
          onClick={onToggleSnap}
          title="网格吸附"
        >
          📏 吸附
        </button>
        <button onClick={onLoadSample} title="加载示例">
          📂 示例
        </button>
        <button onClick={onExport} title="导出 JSON">
          💾 导出
        </button>
        <button onClick={() => setShowMermaid(true)} title="导入 Mermaid">
          📋 Mermaid
        </button>
        <button onClick={onClear} title="清空画布">
          🗑️ 清空
        </button>
        <span className="spacer" />
        <span className="hint">Ctrl+K 命令面板 · 双击边改标签</span>
      </div>

      {showMermaid && (
        <div className="palette-overlay" onClick={() => setShowMermaid(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <textarea
              rows={10}
              placeholder={`flowchart TD
  A[开始] --> B[处理]
  B --> C[结束]`}
              value={mermaidText}
              onChange={(e) => setMermaidText(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                padding: '16px 18px',
                fontSize: '13px',
                background: 'transparent',
                color: 'var(--text)',
                resize: 'vertical',
                fontFamily: 'monospace',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                padding: '8px 16px 14px',
              }}
            >
              <button onClick={() => setShowMermaid(false)}>取消</button>
              <button onClick={handleMermaidSubmit}>导入</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;

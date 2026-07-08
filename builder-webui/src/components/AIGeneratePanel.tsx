import React, { useState, useCallback } from "react";

interface AIGeneratePanelProps {
  onClose: () => void;
  onInsert: (mermaid: string) => void;
}

const AIGeneratePanel: React.FC<AIGeneratePanelProps> = ({ onClose, onInsert }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      setError("Please enter at least 5 characters");
      return;
    }
    setLoading(true);
    setError("");
    setPreview("");
    try {
      const res = await fetch("http://localhost:3001/api/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Server error " + res.status);
      }
      const data = await res.json();
      setPreview(data.mermaid);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleInsert = useCallback(() => {
    if (preview) {
      onInsert(preview);
      onClose();
    }
  }, [preview, onInsert, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.ctrlKey && e.key === "Enter") handleGenerate();
    },
    [onClose, handleGenerate]
  );

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette ai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ai-panel-header">AI Generate Flowchart</div>

        <textarea
          rows={8}
          placeholder="Describe your workflow in natural language. Example: [SystemA] Customer submits order - [SystemB] Order service validates - [SystemB] Order service creates record"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {error && <div className="ai-error">{error}</div>}

        {loading && <div className="ai-loading">Generating flowchart...</div>}

        {preview && !loading && (
          <div className="ai-preview">
            <div className="ai-preview-label">Generated Mermaid:</div>
            <pre className="ai-preview-code">{preview}</pre>
          </div>
        )}

        <div className="ai-actions">
          <button onClick={onClose} disabled={loading}>Cancel</button>
          {preview ? (
            <>
              <button onClick={handleInsert} className="primary">Insert to Canvas</button>
              <button onClick={handleGenerate} disabled={loading}>Regenerate</button>
            </>
          ) : (
            <button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="primary">
              {loading ? "Generating..." : "Generate"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIGeneratePanel;

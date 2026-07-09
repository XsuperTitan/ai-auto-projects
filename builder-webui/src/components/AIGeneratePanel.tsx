import React, { useState, useCallback, useRef, useEffect } from "react";

interface AIGeneratePanelProps {
  onClose: () => void;
  onInsert: (mermaid: string) => string | null;
  backendUrl?: string;
}

const AIGeneratePanel: React.FC<AIGeneratePanelProps> = ({ onClose, onInsert, backendUrl }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  // Cancel in-flight request on unmount or new request
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    const currentPrompt = promptRef.current;
    if (!currentPrompt.trim() || currentPrompt.trim().length < 5) {
      setError("Please enter at least 5 characters");
      return;
    }
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setPreview("");
    try {
      const baseUrl = backendUrl || "http://localhost:3001";
      const res = await fetch(baseUrl + "/api/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt.trim() }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Server error " + res.status);
      }
      const data = await res.json();
      setPreview(data.mermaid);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, [backendUrl]);

  const handleInsert = useCallback(() => {
    if (preview) {
      const errMsg = onInsert(preview);
      if (errMsg) {
        setError(errMsg);
      } else {
        onClose();
      }
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

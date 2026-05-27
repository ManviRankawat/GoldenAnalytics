import { useState } from "react";
import type { FilterState } from "../types";
import { askAI } from "../api";

interface Props {
  filters: FilterState;
}

const SUGGESTIONS = [
  "Who is the top vendor and why do they get so much?",
  "Why the July spending spike?",
  "What do these benefits pay for?",
  "Top vendors in Transportation?",
  "How much was spent on travel?",
];

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "14px 16px",
  marginBottom: 8,
};

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  gap: 6,
  margin: "0 0 10px",
};

const input: React.CSSProperties = {
  flex: 1,
  background: "#f5f1ea",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "10px 14px",
  fontSize: 13,
  color: "#111",
  outline: "none",
};

const askBtn: React.CSSProperties = {
  background: "#0f1e34",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "10px 22px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const chip: React.CSSProperties = {
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 12,
  color: "#374151",
  cursor: "pointer",
};

export function AskAI({ filters }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    askAI(text, filters)
      .then(setAnswer)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  return (
    <div style={card}>
      <p style={label}>
        <span aria-hidden>✦</span> Ask anything about this spending data
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          style={input}
          placeholder="e.g. Why does Health Care Authority get 44% of all spending?"
          value={question}
          disabled={loading}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(question); }}
        />
        <button
          style={{ ...askBtn, opacity: loading || !question.trim() ? 0.6 : 1 }}
          disabled={loading || !question.trim()}
          onClick={() => ask(question)}
        >
          {loading ? "Thinking…" : "Ask →"}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            style={chip}
            disabled={loading}
            onClick={() => { setQuestion(s); ask(s); }}
          >
            {s}
          </button>
        ))}
      </div>

      {(answer || error) && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            background: error ? "#fef2f2" : "#f8fafc",
            border: `1px solid ${error ? "#fecaca" : "#e2e8f0"}`,
            borderRadius: 6,
            fontSize: 13,
            color: error ? "#dc2626" : "#1f2937",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {error ?? answer}
        </div>
      )}
    </div>
  );
}

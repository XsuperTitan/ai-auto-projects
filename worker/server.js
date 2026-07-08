const http = require("http");

const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE || "https://api.deepseek.com/v1";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const MAX_BODY_SIZE = 100 * 1024; // 100KB limit
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 10; // max requests per window
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000; // 1 minute

// Simple in-memory rate limiter (IP-based sliding window)
const rateMap = new Map(); // IP → { count, resetAt }

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT_MAX) return false; // denied
  entry.count++;
  return true;
}

// Periodic cleanup of stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now >= entry.resetAt) rateMap.delete(ip);
  }
}, 5 * 60_000).unref();

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("request body too large"));
        return;
      }
      body += chunk;
    });
    req.on("end", () => { resolve(body); });
  });
}

function sanitizeMermaid(code) {
  // Extract the last fenced mermaid/code block if present, in case the LLM
  // wraps output in explanatory text despite the system prompt.
  const fenceMatch = code.match(/```(?:mermaid)?\s*\n?([\s\S]*?)```/g);
  let inner = code;
  if (fenceMatch && fenceMatch.length > 0) {
    const last = fenceMatch[fenceMatch.length - 1];
    const innerMatch = last.match(/```(?:mermaid)?\s*\n?([\s\S]*?)```/);
    if (innerMatch) inner = innerMatch[1];
  } else {
    inner = code.replace(/^```(?:mermaid)?\s*\n?/, "").replace(/```\s*$/, "").trim();
  }
  let c = inner.trim();
  if (!c.match(/^(flowchart|graph)\s+/i)) {
    const lines = c.split("\n").filter(Boolean);
    c = "flowchart TD\n" + lines.join("\n");
  }
  return c;
}

async function callDeepSeek(prompt) {
  const res = await fetch(DEEPSEEK_BASE + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + DEEPSEEK_API_KEY,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a workflow diagram expert. Convert user descriptions into valid Mermaid flowchart syntax. Output ONLY the Mermaid code block, no other text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("DeepSeek API error " + res.status + ": " + err.slice(0, 200));
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST" || req.url !== "/api/generate-flow") {
    json(res, 404, { error: "not found" });
    return;
  }
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    json(res, 429, { error: "too many requests — rate limit exceeded" });
    return;
  }
  if (!DEEPSEEK_API_KEY) {
    json(res, 500, { error: "DEEPSEEK_API_KEY not configured" });
    return;
  }
  try {
    const body = await readBody(req);
    const { prompt } = JSON.parse(body);
    if (!prompt || prompt.trim().length < 5) {
      json(res, 400, { error: "prompt too short" });
      return;
    }
    const raw = await callDeepSeek(prompt.trim());
    const mermaid = sanitizeMermaid(raw);
    json(res, 200, { mermaid, raw });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log("builder-worker listening on http://localhost:" + PORT);
});

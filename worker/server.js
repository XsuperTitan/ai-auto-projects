const http = require("http");

const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => { resolve(body); });
  });
}

function sanitizeMermaid(code) {
  let c = code.replace(/^```(?:mermaid)?\s*\n?/, "").replace(/```\s*$/, "").trim();
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST" || req.url !== "/api/generate-flow") {
    json(res, 404, { error: "not found" });
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

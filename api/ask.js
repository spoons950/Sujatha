const DEFAULT_MODEL = "gemini-3.8-flash";

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";

  const generationConfig = { maxOutputTokens: 2048 };
  if (model.indexOf("gemini-3") === 0) {
    generationConfig.thinkingConfig = { thinkingLevel: "low" };
  }

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error((data.error && data.error.message) || "gemini error " + r.status);
  }
  const cand = data.candidates && data.candidates[0];
  const parts = (cand && cand.content && cand.content.parts) || [];
  const text = parts.map((p) => (p.thought ? "" : p.text || "")).join("").trim();
  if (!text) throw new Error("empty answer");
  return text;
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const out = {
      ok: true,
      keySet: !!process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    };
    if (req.query && req.query.test && out.keySet) {
      try {
        out.test = await callGemini("Say hello in one short sentence.");
      } catch (e) {
        out.test = { error: String(e.message || e) };
      }
    }
    return res.status(200).json(out);
  }

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
    return res.status(400).json({ error: "bad prompt" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
  }

  try {
    const text = await callGemini(prompt);
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};

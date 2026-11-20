const DEFAULT_MODEL = "gemini-3.6-flash";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
    return res.status(400).json({ error: "bad prompt" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = (data.error && data.error.message) || "gemini error";
      return res.status(502).json({ error: msg });
    }

    const cand = data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const text = parts.map((p) => (p.thought ? "" : p.text || "")).join("").trim();
    if (!text) return res.status(502).json({ error: "empty answer" });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};

import "dotenv/config";
console.log("ENV FILE CHECK -> GEMINI_API_KEY exists?", !!process.env.GEMINI_API_KEY);
console.log("ENV FILE CHECK -> PORT:", process.env.PORT);
import express from "express";
import cors from "cors";
import { analyzeWithGemini } from "./gemini.js";

const app = express();

// For local dev: allow your Vite dev server
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://192.168.1.197:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", async (req, res) => {
  try {
    const { contentInput, settings } = req.body ?? {};
    if (!contentInput) return res.status(400).json({ error: "Missing contentInput" });

    const result = await analyzeWithGemini({ contentInput, settings });
    return res.json(result);
  } catch (err: any) {
  console.error("ANALYZE ERROR:", err);
  console.error("ANALYZE ERROR message:", err?.message);
  console.error("ANALYZE ERROR stack:", err?.stack);
  console.error("ANALYZE ERROR cause:", err?.cause);
  console.error("ANALYZE ERROR response:", err?.response);
  console.error("ANALYZE ERROR details:", err?.details);

  return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`API listening on :${port}`));

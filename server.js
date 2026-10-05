import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Attachments are sent as base64 data URLs. Keep the request reasonably bounded.
app.use(express.json({ limit: "30mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = String(process.env.OPENAI_API_KEY || "").trim().replace(/^['"]|['"]$/g, "");
const model = process.env.OPENAI_MODEL || "gpt-6-luna";
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const client = apiKey ? new OpenAI({ apiKey }) : null;

function safeError(error) {
  const status = error?.status;
  const code = error?.code;
  const msg = String(error?.message || "Unknown error");
  if (status === 401 || code === "invalid_api_key") return "OpenAI API key မမှန်ပါ။ .env ထဲက OPENAI_API_KEY ကို စစ်ပါ။";
  if (status === 429) return "OpenAI API limit / billing ပြဿနာ ဖြစ်နေပါတယ်။";
  if (status === 403) return "ဒီ API key မှာ ဒီ request ကိုလုပ်ခွင့်မရှိပါ။";
  if (status >= 500) return "OpenAI server ဘက်က ခဏပြဿနာဖြစ်နေပါတယ်။";
  return msg;
}

const SYSTEM = `You are James AI, a helpful general-purpose AI assistant.
Answer naturally and accurately. If the user writes Burmese, answer in natural Burmese. If English, answer in English.
You can understand user-provided images and files. When an image or file is attached, use it as context and answer questions about it.
Help with general questions, programming, study, translation, writing, math and explanations.
Give runnable code when requested and do not claim code was tested unless it was tested.
Be friendly, concise and useful.`;

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
}

function validateAttachment(a) {
  if (!a || typeof a !== "object") return null;
  const name = typeof a.name === "string" ? a.name.slice(0, 180) : "attachment";
  const type = typeof a.type === "string" ? a.type.slice(0, 120) : "application/octet-stream";
  const data = typeof a.data === "string" ? a.data : "";
  if (!data.startsWith("data:")) return null;
  if (data.length > 8_500_000) return null;
  return { name, type, data };
}

function buildUserContent(message, attachments) {
  const content = [];
  if (message) content.push({ type: "input_text", text: message });

  for (const a of attachments) {
    if (a.type.startsWith("image/")) {
      content.push({ type: "input_image", image_url: a.data, detail: "auto" });
    } else {
      content.push({ type: "input_file", filename: a.name, file_data: a.data.split(",", 2)[1] || "" });
    }
  }

  if (!content.length) content.push({ type: "input_text", text: "Please inspect the attached content." });
  return content;
}

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  name: "James AI",
  apiConfigured: Boolean(client),
  model,
  imageModel
}));

app.post("/api/chat", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ ok: false, error: "OPENAI_API_KEY မတွေ့ပါ။ .env ဖိုင်ကို စစ်ပါ။" });

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const attachments = Array.isArray(req.body?.attachments)
      ? req.body.attachments.map(validateAttachment).filter(Boolean).slice(0, 6)
      : [];

    if (!message && !attachments.length) return res.status(400).json({ ok: false, error: "Message or attachment is required." });

    const history = cleanHistory(req.body?.history);
    const input = [...history, { role: "user", content: buildUserContent(message, attachments) }];

    const response = await client.responses.create({
      model,
      instructions: SYSTEM,
      input
    });

    const reply = String(response.output_text || "").trim();
    if (!reply) return res.status(502).json({ ok: false, error: "AI က အဖြေဗလာ ပြန်လာပါတယ်။" });
    res.json({ ok: true, name: "James AI", reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(Number(error?.status) || 500).json({ ok: false, error: safeError(error) });
  }
});

app.post("/api/images", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ ok: false, error: "OPENAI_API_KEY မတွေ့ပါ။" });
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(req.body?.size) ? req.body.size : "1024x1024";
    if (!prompt) return res.status(400).json({ ok: false, error: "Image prompt is empty." });

    const result = await client.images.generate({ model: imageModel, prompt, size });
    const item = result?.data?.[0];
    if (!item?.b64_json) return res.status(502).json({ ok: false, error: "Image data မရရှိပါ။ Image model / API access ကို စစ်ပါ။" });
    res.json({ ok: true, image: `data:image/png;base64,${item.b64_json}` });
  } catch (error) {
    console.error("Image error:", error);
    res.status(Number(error?.status) || 500).json({ ok: false, error: safeError(error) });
  }
});

app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err?.message || "Server error." }));

app.listen(PORT, HOST, () => {
  console.log(`James AI running on http://localhost:${PORT}`);
  console.log(`OpenAI: ${client ? "configured" : "MISSING"}`);
});

// backend/server.js
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PUBLIC_DIR = path.join(process.cwd(), "public");
app.use(express.static(PUBLIC_DIR));

app.get("/", (_req, res) => res.redirect("/calculator"));
app.get("/calculator", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/settings", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "settings.html")));
app.get("/index.html", (_req, res) => res.redirect("/calculator"));
app.get("/settings.html", (_req, res) => res.redirect("/settings"));

const CONFIG_PATH = path.join(process.cwd(), "config.json");
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
  catch { return {}; }
}
function writeConfig(obj) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(obj, null, 2));
}

// --- Settings ---
app.get("/config", (_req, res) => {
  const cfg = readConfig();
  res.json({ ok: true, sheetUrl: cfg.sheetUrl || "" });
});
app.post("/config", (req, res) => {
  const { sheetUrl } = req.body || {};
  if (!sheetUrl || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(sheetUrl)) {
    return res.status(400).json({ ok: false, error: "Invalid Apps Script URL" });
  }
  writeConfig({ sheetUrl });
  res.json({ ok: true });
});

// --- Proxy to GAS ---
async function proxyGet(query) {
  const { sheetUrl } = readConfig();
  if (!sheetUrl) throw new Error("Apps Script URL not configured");
  const r = await fetch(`${sheetUrl}?${query}`);
  return r.json();
}
async function proxyPost(body) {
  const { sheetUrl } = readConfig();
  if (!sheetUrl) throw new Error("Apps Script URL not configured");
  const r = await fetch(sheetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// --- Sheets list ---
app.get("/sheets", async (_req, res) => {
  const { sheetUrl } = readConfig();
  if (!sheetUrl) {
    return res.status(500).json({ ok: false, error: "Apps Script URL not configured" });
  }
  try {
    const r = await fetch(`${sheetUrl}?type=sheets`);
    const text = await r.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(500).json({ ok: false, error: "Apps Script returned non-JSON" });
    }
    res.json(json);
  } catch (e) {
    console.error("Sheets error:", e);
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

// --- Records ---
app.get("/records", async (req, res) => {
  try {
    const sheet = req.query.sheet || "";
    const json = await proxyGet(`type=records&sheet=${encodeURIComponent(sheet)}`);
    res.json(json);
  } catch (e) {
    console.error("Records error:", e);
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

// --- Metrics ---
app.get("/metrics", async (_req, res) => {
  try {
    const json = await proxyGet("type=metrics");
    res.json(json);
  } catch (e) {
    console.error("Metrics error:", e);
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

// --- Update Paid ---
app.post("/updatePaid", async (req, res) => {
  try {
    const body = {
      type: "updatePaid",
      sheet: req.body.sheet,
      fullName: req.body.fullName,
      phone: req.body.phone,
      value: req.body.value,
    };
    const json = await proxyPost(body);
    res.json(json);
  } catch (e) {
    console.error("UpdatePaid error:", e);
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

// --- Save new record ---
app.post("/save", async (req, res) => {
  try {
    const json = await proxyPost(req.body);
    res.json(json);
  } catch (e) {
    console.error("Save error:", e);
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

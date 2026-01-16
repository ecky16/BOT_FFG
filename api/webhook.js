export default async function handler(req, res) {
  const BOT = process.env.BOT_TOKEN;
  const GAS = process.env.GAS_API_URL;

  if (req.method !== "POST") return res.status(200).send("ok");

  const msg = req.body?.message;
  if (!msg) return res.status(200).send("ok");

  const chatId = msg.chat?.id;
  const text = (msg.text || "").trim();

  // ===== DAFTAR (untuk grup maupun pribadi) =====
  // pakai startsWith biar bisa /daftar@NamaBot di grup
  if (text.startsWith("/daftar") || text.startsWith("/start")) {
    const title = msg.chat?.title || "";              // kalau grup ada title
    const u = msg.from?.username || "";
    const n = msg.from?.first_name || "";

    // name: kalau grup pakai title, kalau pribadi pakai first_name
    const displayName = title || n;

    const url =
      `${GAS}?action=add_sub` +
      `&chat_id=${encodeURIComponent(chatId)}` +
      `&username=${encodeURIComponent(u)}` +
      `&name=${encodeURIComponent(displayName)}`;

    await fetch(url);

    // bedain pesan biar jelas
    const reply = title
      ? "✅ Grup ini sudah terdaftar. Broadcast dari Spreadsheet akan masuk sini."
      : "✅ Kamu terdaftar. Info akan dikirim otomatis.";

    await send(BOT, chatId, reply);

    return res.status(200).send("ok");
  }

  // ===== TEST =====
  if (text.startsWith("/pvt")) {
    const report = await buildReport(GAS);
    await send(BOT, chatId, report);
    return res.status(200).send("ok");
  }

  return res.status(200).send("ok");
}

async function buildReport(api) {
  const r = await fetch(`${api}?action=get_pvt`);
  const j = await r.json();

  if (!j.rows || !j.rows.length) {
    return "<b>HASIL UKUR FFG BGES</b>\n<pre>(Kosong)</pre>";
  }

  const table = ascii(["A","B","C","D","E","F","G"], j.rows);
  return `<b>HASIL UKUR FFG BGES</b>\n<pre>${escapeHtml(table)}</pre>`;
}

async function send(token, chat, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" })
  });
}

function ascii(h, r) {
  const w = h.map(x => x.length);
  r.forEach(a => a.forEach((v, i) => w[i] = Math.max(w[i], String(v ?? "").length)));
  const L = "+" + w.map(x => "-".repeat(x + 2)).join("+") + "+";
  const R = a => "|" + a.map((v, i) => " " + String(v ?? "").padEnd(w[i]) + " ").join("|") + "|";
  return [L, R(h), L, ...r.map(R), L].join("\n");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

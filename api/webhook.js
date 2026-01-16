export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const GAS_API_URL = process.env.GAS_API_URL;

  // (opsional tapi bagus) verifikasi secret token dari Telegram
  const SECRET = process.env.TG_WEBHOOK_SECRET;
  if (SECRET) {
    const incoming = req.headers["x-telegram-bot-api-secret-token"];
    if (incoming !== SECRET) return res.status(401).send("unauthorized");
  }

  const update = req.body;
  const msg = update?.message;
  const text = (msg?.text || "").trim();
  const chatId = msg?.chat?.id;

  // Simpan subscriber paling gampang: pakai Google Sheet juga (opsi paling simpel)
  // Tapi versi ultra sederhana: begitu /start, langsung balas OK.
  if (text === "/start" && chatId) {
    await sendMessage(BOT_TOKEN, chatId,
      "Sip ✅ Kamu sudah terdaftar.\nNanti kalau admin kirim update dari Spreadsheet, kamu bakal nerima.",
      "HTML"
    );
    return res.status(200).send("ok");
  }

  // Command buat test tarik data
  if (text === "/pvt" && chatId) {
    const report = await buildReportFromGAS(GAS_API_URL);
    await sendMessage(BOT_TOKEN, chatId, report, "HTML");
    return res.status(200).send("ok");
  }

  return res.status(200).send("ok");
}

async function buildReportFromGAS(gasUrl) {
  const r = await fetch(`${gasUrl}?action=pvt`);
  const j = await r.json();

  if (!j.ok) return `<b>HASIL UKUR FFG BGES</b>\n<pre>Gagal ambil data: ${escapeHtml(String(j.error || ""))}</pre>`;
  const rows = j.rows || [];
  if (!rows.length) return `<b>HASIL UKUR FFG BGES</b>\n<pre>(Data kosong)</pre>`;

  const headers = ["A","B","C","D","E","F","G"];
  const table = asciiTable(headers, rows.map(r=>r.map(v => v==null? "" : String(v))));

  const stamp = new Date().toLocaleString("id-ID");
  return `<b>HASIL UKUR FFG BGES</b>\n<i>Update: ${escapeHtml(stamp)}</i>\n<pre>${escapeHtml(table)}</pre>`;
}

async function sendMessage(token, chatId, text, parseMode="HTML") {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
  const j = await resp.json();
  if (!j.ok) throw new Error(JSON.stringify(j));
}

function asciiTable(headers, rows) {
  const maxWidth = 22;
  const widths = headers.map(h => Math.min(maxWidth, h.length));

  for (const r of rows) {
    for (let i=0;i<headers.length;i++){
      const s = (r[i] ?? "").toString();
      widths[i] = Math.min(maxWidth, Math.max(widths[i], s.length));
    }
  }

  const line = "+" + widths.map(w => "-".repeat(w+2)).join("+") + "+";
  const fmt = (arr) => "|" + arr.map((v,i)=>{
    const s = (v ?? "").toString();
    const cut = s.length>widths[i] ? s.slice(0,widths[i]-1)+"…" : s;
    return " " + cut.padEnd(widths[i]," ") + " ";
  }).join("|") + "|";

  const out = [line, fmt(headers), line];
  rows.forEach(r=>out.push(fmt(r)));
  out.push(line);
  return out.join("\n");
}

function escapeHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

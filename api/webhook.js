export default async function handler(req, res) {
  const BOT = process.env.BOT_TOKEN;
  const GAS = process.env.GAS_API_URL;

  if (req.method !== "POST") return res.send("ok");

  const msg = req.body.message;
  if (!msg) return res.send("ok");

  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // REGISTER
  if (text === "/start") {
    await fetch(`${GAS}?action=add_sub&chat_id=${chatId}&username=${msg.from.username||""}&name=${msg.from.first_name||""}`);
    await send(BOT, chatId, "✅ Kamu terdaftar.\nInfo akan dikirim otomatis.");
  }
if (text.startsWith("/daftar")) {
  const chatId = msg.chat.id;
  const title = msg.chat.title || "";
  const u = msg.from?.username || "";
  const n = msg.from?.first_name || "";

  await fetch(`${GAS}?action=add_sub&chat_id=${encodeURIComponent(chatId)}&username=${encodeURIComponent(u)}&name=${encodeURIComponent(title || n)}`);
  await send(BOT, chatId, "✅ Grup ini sudah terdaftar. Nanti broadcast dari Spreadsheet bakal masuk sini.");
}
  // TEST
  if (text === "/pvt") {
    const report = await buildReport(GAS);
    await send(BOT, chatId, report);
  }

  res.send("ok");
}

async function buildReport(api) {
  const r = await fetch(`${api}?action=get_pvt`);
  const j = await r.json();

  if (!j.rows.length) return "<b>HASIL UKUR FFG BGES</b>\n<pre>(Kosong)</pre>";

  const table = ascii(["A","B","C","D","E","F","G"], j.rows);
  return `<b>HASIL UKUR FFG BGES</b>\n<pre>${table}</pre>`;
}

async function send(token, chat, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ chat_id:chat, text, parse_mode:"HTML" })
  });
}

function ascii(h,r){
  const w=h.map(x=>x.length);
  r.forEach(a=>a.forEach((v,i)=>w[i]=Math.max(w[i],String(v).length)));
  const L="+"+w.map(x=>"-".repeat(x+2)).join("+")+"+";
  const R=a=>"|"+a.map((v,i)=>" "+String(v).padEnd(w[i])+" ").join("|")+"|";
  return [L,R(h),L,...r.map(R),L].join("\n");
}



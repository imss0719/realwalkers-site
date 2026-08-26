/* ══════════════════════════════════════════════════════════════
   sitemap.xml 자동 생성 — Cloudflare Pages Function

   /sitemap.xml 로 접속하면 이 파일이 실행되어, 구글시트에 있는
   매물을 하나하나 돌면서 검색엔진에 "이런 페이지들이 있다"고
   알려주는 sitemap.xml을 그 자리에서 만들어 돌려줍니다.
   매물이 추가되거나 빠져도 코드를 손댈 필요 없이 항상 최신
   목록으로 만들어집니다.

   ※ 주의: 아래 SHEET_CSV_URL은 index.html의 CONFIG.SHEET_CSV_URL,
   그리고 functions/m/[no].js 의 값과 반드시 같아야 합니다.
   구글시트 주소를 바꾸시면 이 세 곳 모두 함께 바꿔주세요.
   ══════════════════════════════════════════════════════════════ */

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-V_ZJtPtye1Or9bEkQpDOxyofS-x837-NyuaRDR948PvkRRc9-MivFlDWC7sjlGCyucPvRg_fs8tt/pub?gid=0&single=true&output=csv";

export async function onRequest(context) {
  const { request } = context;
  const origin = new URL(request.url).origin;

  let urls = [];
  try {
    // 1시간 동안 캐시해서, 방문자가 몰려도 시트를 매번 새로 읽지 않습니다
    const csvRes = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (csvRes.ok) {
      const text = await csvRes.text();
      urls = listingUrls_(text, origin);
    }
  } catch (e) {
    // 시트를 못 가져와도 최소한 홈 주소 하나는 포함된 사이트맵을 돌려줍니다
  }

  const today = new Date().toISOString().slice(0, 10);
  const items = [
    "  <url>\n    <loc>" + origin + "/</loc>\n    <lastmod>" + today +
      "</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>",
  ].concat(urls.map(function (u) {
    return "  <url>\n    <loc>" + u + "</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>";
  }));

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    items.join("\n") + "\n</urlset>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/* CSV에서 사이트맵에 넣을 매물 주소 목록을 뽑아냅니다.
   index.html이 매물을 걸러내는 기준과 똑같이 맞췄습니다.
   ─ '노출' 칸이 "N"이면 제외 (숨긴 매물)
   ─ 매물명이 없거나, 위치(위도·경도 또는 주소)가 없으면 제외
   ─ 매물번호가 있어야 전용 주소(/m/매물번호)를 만들 수 있으므로
     매물번호가 없는 매물은 사이트맵에 넣지 않습니다
     (거래완료 매물은 가격이 가려질 뿐 페이지는 그대로 있으므로 포함합니다) */
function listingUrls_(csvText, origin) {
  const rows = parseCSV(csvText);
  if (!rows.length) return [];
  const head = rows[0].map(function (h) { return h.trim(); });
  const idx = function (name) { return head.indexOf(name); };
  const iNo = idx("매물번호"), iN = idx("매물명"), iAddr = idx("주소"),
        iLat = idx("위도"), iLng = idx("경도"), iShow = idx("노출");
  if (iNo < 0) return [];

  const seen = {};
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row[iN] || !row[iN].trim()) continue;

    const showVal = iShow >= 0 ? (row[iShow] || "").trim().toUpperCase() : "";
    if (showVal === "N") continue;

    const lat = parseFloat(row[iLat]), lng = parseFloat(row[iLng]);
    const addr = iAddr >= 0 ? (row[iAddr] || "").trim() : "";
    if ((isNaN(lat) || isNaN(lng)) && !addr) continue;

    const no = (row[iNo] || "").trim();
    if (!no || seen[no]) continue;
    seen[no] = true;
    out.push(origin + "/m/" + encodeURIComponent(no));
  }
  return out;
}

/* index.html / functions/m/[no].js 의 parseCSV()와 동일한 로직입니다. */
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cell); cell = ""; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== '\r') cell += c;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

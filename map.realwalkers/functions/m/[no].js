/* ══════════════════════════════════════════════════════════════
   매물별 검색엔진 미리보기(SEO) 자동 생성 — Cloudflare Pages Function

   주소 /m/매물번호 로 접속하면(검색엔진 로봇이든 사람이든) 이 파일이
   먼저 실행됩니다. 하는 일은 딱 하나 — index.html은 그대로 두고,
   <head> 안의 제목·설명·미리보기 사진(og:image 등)만 그 매물 정보로
   바꿔치기해서 돌려줍니다. 화면은 지금과 똑같이 지도 페이지가 열리고,
   자바스크립트가 알아서 그 매물 정보창을 자동으로 엽니다.

   ※ 주의: 아래 SHEET_CSV_URL은 index.html의 CONFIG.SHEET_CSV_URL과
   반드시 같은 값이어야 합니다. 나중에 구글시트 주소를 바꾸시면
   이 파일의 값도 함께 바꿔주세요.
   ══════════════════════════════════════════════════════════════ */

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-V_ZJtPtye1Or9bEkQpDOxyofS-x837-NyuaRDR948PvkRRc9-MivFlDWC7sjlGCyucPvRg_fs8tt/pub?gid=0&single=true&output=csv";

export async function onRequest(context) {
  const { request, env, params } = context;
  const no = decodeURIComponent(params.no || "");
  const origin = new URL(request.url).origin;

  // 1) 원본 페이지(index.html)를 가져옵니다. 이 내용은 그대로 유지됩니다.
  const pageRes = await env.ASSETS.fetch(`${origin}/index.html`);
  if (!pageRes.ok || !no) return pageRes;

  // 2) 구글시트(CSV)에서 이 매물번호에 해당하는 매물을 찾습니다.
  //    (5분간 캐시해서, 접속할 때마다 매번 시트를 새로 불러오지 않습니다)
  let listing = null;
  try {
    const csvRes = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (csvRes.ok) {
      const text = await csvRes.text();
      listing = findListingByNo(text, no);
    }
  } catch (e) {
    // 시트를 못 가져와도 방문자 화면에는 지장이 없도록, 원본 페이지를 그대로 보여줍니다.
  }

  // 매물을 못 찾은 경우(삭제됐거나 번호가 틀린 경우)에도 원본 페이지를 그대로 보여줍니다.
  // (화면은 정상적으로 뜨고, 자바스크립트가 "찾을 수 없다"는 안내만 띄웁니다)
  if (!listing) return pageRes;

  // 3) 이 매물에 맞는 제목·설명·미리보기 사진을 만듭니다.
  const title = `${listing.name}${listing.deal ? " " + listing.deal : ""}${listing.price ? " " + listing.price : ""} | 리얼워커스 마포부동산`;
  const descParts = [listing.addr, listing.type, listing.deal, listing.meta].filter(Boolean);
  const description = (descParts.join(" · ") || "리얼워커스 마포부동산 매물 정보입니다.").slice(0, 150);
  const image = listing.photo || `${origin}/og-image.png`;
  const pageUrl = `${origin}/m/${encodeURIComponent(no)}`;

  // 4) <head> 안의 메타태그만 골라서 바꿔치기합니다. 나머지 페이지는 그대로입니다.
  class TitleRewriter {
    element(el) { el.setInnerContent(title); }
  }
  class CanonicalRewriter {
    element(el) { el.setAttribute("href", pageUrl); }
  }
  class MetaRewriter {
    element(el) {
      const key = el.getAttribute("property") || el.getAttribute("name");
      if (key === "description" || key === "og:description" || key === "twitter:description") {
        el.setAttribute("content", description);
      } else if (key === "og:title" || key === "twitter:title") {
        el.setAttribute("content", title);
      } else if (key === "og:image" || key === "twitter:image") {
        el.setAttribute("content", image);
      } else if (key === "og:url") {
        el.setAttribute("content", pageUrl);
      }
    }
  }

  return new HTMLRewriter()
    .on("title", new TitleRewriter())
    .on('link[rel="canonical"]', new CanonicalRewriter())
    .on('meta[name="description"]', new MetaRewriter())
    .on('meta[property^="og:"]', new MetaRewriter())
    .on('meta[name^="twitter:"]', new MetaRewriter())
    .transform(pageRes);
}

/* CSV 안에서 매물번호가 일치하는 한 줄을 찾아 필요한 값만 꺼냅니다. */
function findListingByNo(csvText, no) {
  const rows = parseCSV(csvText);
  if (!rows.length) return null;
  const head = rows[0].map(h => h.trim());
  const idx = name => head.indexOf(name);
  const iNo = idx("매물번호"), iT = idx("유형"), iD = idx("거래"), iN = idx("매물명"),
        iP = idx("가격"), iM = idx("설명"), iAddr = idx("주소");
  const photoIdxs = ["사진1", "사진2", "사진3", "사진4", "사진5"].map(idx).filter(i => i >= 0);
  const legacyPhotoIdx = idx("사진");

  if (iNo < 0) return null;

  // 앞뒤 공백·대소문자·하이픈 차이로 못 찾는 일이 없도록 정리해서 비교합니다
  const norm = s => String(s || "").trim().toUpperCase().replace(/[\s\-_]/g, "");
  const target = norm(no);

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (norm(row[iNo]) !== target) continue;

    let rawPhoto = "";
    for (const i of photoIdxs) {
      if (row[i] && row[i].trim()) { rawPhoto = row[i].trim(); break; }
    }
    if (!rawPhoto && legacyPhotoIdx >= 0) rawPhoto = (row[legacyPhotoIdx] || "").trim();

    return {
      no: row[iNo] || "",
      type: iT >= 0 ? (row[iT] || "").trim() : "",
      deal: iD >= 0 ? (row[iD] || "").trim() : "",
      name: iN >= 0 ? (row[iN] || "").trim() : "",
      price: iP >= 0 ? (row[iP] || "").trim() : "",
      meta: iM >= 0 ? (row[iM] || "").trim() : "",
      addr: iAddr >= 0 ? (row[iAddr] || "").trim() : "",
      photo: toImageUrl(rawPhoto),
    };
  }
  return null;
}

/* index.html의 parseCSV()와 동일한 로직입니다(따옴표 포함 셀 처리). */
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

/* index.html의 toImageUrl()과 동일한 로직입니다.
   구글드라이브 공유링크를 미리보기용 썸네일 주소로 바꿔줍니다. */
function toImageUrl(url) {
  if (!url) return "";
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
  return url;
}

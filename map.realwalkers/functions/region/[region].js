/* ══════════════════════════════════════════════════════════════
   지역별 랜딩 페이지 자동 생성 — Cloudflare Pages Function

   /region/지역명 으로 접속하면 이 파일이 실행되어, 구글시트에 있는
   해당 지역의 매물들을 모아서 보여주는 페이지를 만듭니다.

   지역별로 SEO 최적화된 페이지를 만들어서, 사용자가
   "마포구 오피스텔", "김포시 부동산" 같은 검색을 할 때
   검색 결과에 노출되도록 합니다.

   ※ 주의: 아래 SHEET_CSV_URL은 index.html의 CONFIG.SHEET_CSV_URL,
   그리고 functions/m/[no].js 의 값과 반드시 같아야 합니다.
   구글시트 주소를 바꾸시면 이 세 곳 모두 함께 바꿔주세요.
   ══════════════════════════════════════════════════════════════ */

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-V_ZJtPtye1Or9bEkQpDOxyofS-x837-NyuaRDR948PvkRRc9-MivFlDWC7sjlGCyucPvRg_fs8tt/pub?gid=0&single=true&output=csv";

export async function onRequest(context) {
  const { request, params } = context;
  const region = decodeURIComponent(params.region || "");
  const origin = new URL(request.url).origin;

  // 원본 페이지(index.html)를 가져옵니다
  const { env } = context;
  const pageRes = await env.ASSETS.fetch(`${origin}/index.html`);
  if (!pageRes.ok || !region) return pageRes;

  // 구글시트(CSV)에서 이 지역의 모든 매물을 찾습니다
  let listings = [];
  try {
    const csvRes = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (csvRes.ok) {
      const text = await csvRes.text();
      listings = findListingsByRegion(text, region);
    }
  } catch (e) {
    // 시트를 못 가져와도 기본 페이지는 보여줍니다
  }

  // 지역별 페이지에 맞는 제목·설명을 만듭니다
  const title = `${region} 부동산 매물 | 리얼워커스`;
  const description = `${region} 지역의 최신 부동산 매물 정보입니다. 오피스텔, 아파트, 전원주택 등 다양한 매물을 확인하세요.`.slice(0, 150);
  const pageUrl = `${origin}/region/${encodeURIComponent(region)}`;
  const image = `${origin}/og-image.png`;

  // <head> 안의 메타태그만 골라서 바꿔치기합니다
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

  // 데이터를 JSON 문자열로 만들어서 페이지에 embedded합니다
  class ScriptInjector {
    element(el) {
      if (el.tagName === "script" && el.getAttribute("id") === "listings-data") {
        // 기존 데이터 스크립트를 지역 필터링 데이터로 대체
        el.setInnerContent(`window.REGION_FILTER = "${region}"; window.FILTERED_LISTINGS = ${JSON.stringify(listings)};`);
      }
    }
  }

  let html = await pageRes.text();

  // 만약 기존 HTML에 listings-data 스크립트가 없으면, head 끝에 추가합니다
  if (!html.includes('id="listings-data"')) {
    const dataScript = `<script id="listings-data">window.REGION_FILTER = "${region}"; window.FILTERED_LISTINGS = ${JSON.stringify(listings)};</script>`;
    html = html.replace('</head>', dataScript + '</head>');
  }

  const rewriter = new HTMLRewriter()
    .on("title", new TitleRewriter())
    .on('link[rel="canonical"]', new CanonicalRewriter())
    .on('meta[name="description"]', new MetaRewriter())
    .on('meta[property^="og:"]', new MetaRewriter())
    .on('meta[name^="twitter:"]', new MetaRewriter());

  // 만약 스크립트가 있으면 그것도 대체
  if (html.includes('id="listings-data"')) {
    return rewriter.on('script[id="listings-data"]', new ScriptInjector()).transform(new Response(html));
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

/* CSV 안에서 특정 지역에 해당하는 매물들을 모두 찾습니다. */
function findListingsByRegion(csvText, region) {
  const rows = parseCSV(csvText);
  if (!rows.length) return [];

  const head = rows[0].map(h => h.trim());
  const idx = name => head.indexOf(name);
  const iAddr = idx("주소"), iNo = idx("매물번호"), iN = idx("매물명"),
        iP = idx("가격"), iT = idx("유형"), iD = idx("거래"), iM = idx("설명");
  const photoIdxs = ["사진1", "사진2", "사진3", "사진4", "사진5"].map(idx).filter(i => i >= 0);
  const legacyPhotoIdx = idx("사진");
  const iShow = idx("노출"), iLat = idx("위도"), iLng = idx("경도");

  if (iAddr < 0 || iNo < 0) return [];

  const listings = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const addr = (row[iAddr] || "").trim();

    // "노출" 칸이 "N"이면 제외
    const showVal = iShow >= 0 ? (row[iShow] || "").trim().toUpperCase() : "";
    if (showVal === "N") continue;

    // 매물명이 없거나 주소가 없으면 제외
    const name = iN >= 0 ? (row[iN] || "").trim() : "";
    if (!name) continue;

    // 주소에서 지역명 추출해서 비교
    const extractedRegion = extractRegion(addr);
    if (extractedRegion !== region) continue;

    // 위도/경도 또는 주소가 있어야 함
    const lat = parseFloat(row[iLat]), lng = parseFloat(row[iLng]);
    if ((isNaN(lat) || isNaN(lng)) && !addr) continue;

    // 매물번호가 있어야 함
    const no = (row[iNo] || "").trim();
    if (!no) continue;

    let rawPhoto = "";
    for (const i of photoIdxs) {
      if (row[i] && row[i].trim()) { rawPhoto = row[i].trim(); break; }
    }
    if (!rawPhoto && legacyPhotoIdx >= 0) rawPhoto = (row[legacyPhotoIdx] || "").trim();

    listings.push({
      no: no,
      name: name,
      addr: addr,
      type: iT >= 0 ? (row[iT] || "").trim() : "",
      deal: iD >= 0 ? (row[iD] || "").trim() : "",
      price: iP >= 0 ? (row[iP] || "").trim() : "",
      meta: iM >= 0 ? (row[iM] || "").trim() : "",
      photo: toImageUrl(rawPhoto),
      lat: lat,
      lng: lng,
    });
  }

  return listings;
}

/* 주소에서 지역명(시/군/구)을 추출합니다 */
function extractRegion(addr) {
  if (!addr) return "";

  // "경기도 김포시 통진읍" → "김포시"
  // "서울 마포구 아현동" → "마포구"
  // "인천 부평구" → "부평구"

  const parts = addr.split(/\s+/);
  if (parts.length < 2) return "";

  // 첫 번째는 도/시, 두 번째가 시/군/구
  // "경기도" "김포시" "..." → "김포시" 반환
  // "서울" "마포구" "..." → "마포구" 반환
  // "서울특별시" "마포구" "..." → "마포구" 반환

  if (parts.length >= 2) {
    return parts[1]; // 두 번째 항목이 지역명(시/군/구)
  }

  return "";
}

/* index.html의 parseCSV()와 동일한 로직입니다 */
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

/* 구글드라이브 링크를 썸네일 주소로 바꿔줍니다 */
function toImageUrl(url) {
  if (!url) return "";
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
  return url;
}

/* ══════════════════════════════════════════════════════════════
   REAL WALKERS - 현재 사이트용 sitemap.xml 자동 생성
   Cloudflare Pages Function

   /sitemap.xml
   → 현재 Supabase에서 "노출 = true"인 매물을 읽어
     현재 상세 URL(?id=UUID) 기준으로 sitemap을 자동 생성합니다.

   기존 구사이트의 /RW-매물번호/ 주소는 더 이상 sitemap에 넣지 않습니다.
   ══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://ggnpjqqjwkxptbvkvgpc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IfevSekhTOzwlFBzRvd0gw_VHq2A9LO";
const SITE_URL = "https://www.realwalkers.com";

export async function onRequest(context) {
  let listings = [];

  try {
    const params = new URLSearchParams({
      select: "id,address",
      limit: "1000",
    });

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?${params.toString()}`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          Accept: "application/json",
        },
        cf: {
          cacheTtl: 3600,
          cacheEverything: true,
        },
      }
    );

    if (res.ok) {
      listings = await res.json();
    }
  } catch (e) {
    listings = [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  /* 메인 페이지 */
  urls.push({
    loc: `${SITE_URL}/`,
    lastmod: today,
    changefreq: "daily",
    priority: "1.0",
  });

  /* 현재 공개 매물 상세 페이지 */
  const seenIds = new Set();

  for (const listing of listings) {
    const id = String(listing?.id || "").trim();

    if (!id || seenIds.has(id)) continue;

    seenIds.add(id);

    urls.push({
      loc: `${SITE_URL}/?id=${encodeURIComponent(id)}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  /* 지역 페이지 */
  const seenRegions = new Set();

  for (const listing of listings) {
    const address = String(listing?.address || "").trim();
    const region = extractRegion_(address);

    if (!region || seenRegions.has(region)) continue;

    seenRegions.add(region);

    urls.push({
      loc: `${SITE_URL}/region/${encodeURIComponent(region)}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(toXmlUrl_).join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}

/* 주소에서 지역 페이지에 사용할 시/군/구 이름을 추출합니다. */
function extractRegion_(address) {
  if (!address) return "";

  const parts = address.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) return parts[1];

  return "";
}

/* XML 특수문자 처리 */
function xmlEscape_(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* URL 한 개를 sitemap XML로 변환 */
function toXmlUrl_(item) {
  return [
    "  <url>",
    `    <loc>${xmlEscape_(item.loc)}</loc>`,
    item.lastmod ? `    <lastmod>${item.lastmod}</lastmod>` : "",
    `    <changefreq>${item.changefreq}</changefreq>`,
    `    <priority>${item.priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

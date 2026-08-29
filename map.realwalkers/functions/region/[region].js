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

  if (!region) {
    const { env } = context;
    return env.ASSETS.fetch(`${origin}/index.html`);
  }

  // 구글시트(CSV)에서 이 지역의 모든 매물과 블로그링크를 찾습니다
  let listings = [];
  let blogLinks = [];
  try {
    const csvRes = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (csvRes.ok) {
      const text = await csvRes.text();
      listings = findListingsByRegion(text, region);
      blogLinks = findBlogLinksByRegion(text, region);
    }
  } catch (e) {
    // CSV를 못 가져와도 계속 진행합니다
  }

  // SEO 메타태그
  const title = `${region} 부동산 매물 | 리얼워커스`;
  const description = `${region} 지역의 최신 부동산 매물 정보입니다. 오피스텔, 아파트, 전원주택 등 다양한 매물을 확인하세요.`.slice(0, 150);
  const pageUrl = `${origin}/region/${encodeURIComponent(region)}`;
  const image = `${origin}/og-image.png`;

  // HTML 생성
  const html = generateRegionPage(region, listings, blogLinks, title, description, pageUrl, image);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

/* 지역별 통계 계산 */
function calculateStats(listings) {
  const typeCount = {};
  const priceRanges = { '1억~3억': 0, '3억~5억': 0, '5억~10억': 0, '10억+': 0 };

  listings.forEach(l => {
    // 유형별 개수
    typeCount[l.type] = (typeCount[l.type] || 0) + 1;

    // 가격대별 분류 (억 단위로 파싱)
    const priceStr = l.price.replace(/[^0-9.]/g, '');
    const price = parseFloat(priceStr);
    if (!isNaN(price)) {
      if (price < 3) priceRanges['1억~3억']++;
      else if (price < 5) priceRanges['3억~5억']++;
      else if (price < 10) priceRanges['5억~10억']++;
      else priceRanges['10억+']++;
    }
  });

  return { typeCount, priceRanges };
}

/* 지역별 페이지 HTML을 생성합니다 */
function generateRegionPage(region, listings, blogLinks, title, description, pageUrl, image) {
  const stats = calculateStats(listings);

  const typeCountHtml = Object.entries(stats.typeCount).map(([type, count]) => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
      <span style="font-weight: 600; color: var(--navy);">${escapeHtml(type)}</span>
      <span style="font-weight: 700; color: var(--gold);">${count}개</span>
    </div>
  `).join('');

  const priceRangeHtml = Object.entries(stats.priceRanges).map(([range, count]) => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
      <span style="font-weight: 600; color: var(--navy);">${range}</span>
      <span style="font-weight: 700; color: var(--gold);">${count}개</span>
    </div>
  `).join('');

  const featuredListings = listings.slice(0, 3).map(l => `
    <div style="padding: 12px; background: var(--gray-light); border-radius: 6px; margin-bottom: 8px;">
      <div style="font-weight: 700; color: var(--navy); font-size: 13px; margin-bottom: 4px;">${escapeHtml(l.name)}</div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--gray-text);">
        <span>${escapeHtml(l.type)} · ${escapeHtml(l.deal)}</span>
        <span style="font-weight: 700; color: var(--gold);">${escapeHtml(l.price)}</span>
      </div>
    </div>
  `).join('');

  const listingsHtml = listings.map((l, idx) => `
    <div class="listing-item" data-index="${idx}" style="${idx >= 8 ? 'display: none;' : ''}">
      <div class="listing-info">
        <div class="listing-name">${escapeHtml(l.name)}</div>
        <div class="listing-meta"><span class="badge">${escapeHtml(l.type)}</span>${escapeHtml(l.deal)}</div>
      </div>
      <div class="listing-price">${escapeHtml(l.price)}</div>
      <a href="/m/${encodeURIComponent(l.no)}" class="view-btn">상세</a>
    </div>
  `).join('') + (listings.length > 8 ? `
    <div style="text-align: center; margin-top: 20px;">
      <button onclick="loadMoreListings()" style="padding: 10px 24px; background: var(--navy); color: var(--gold); border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 13px;">더 보기 (${listings.length - 8}개)</button>
    </div>
  ` : '');

  const blogsHtml = blogLinks.slice(0, 3).map(b => `
    <div class="blog-item">
      <div class="blog-title">${escapeHtml(b.title)}</div>
      <a href="${escapeHtml(b.url)}" class="blog-link" target="_blank">보기</a>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(pageUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(pageUrl)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <style>
        :root {
            --navy: #1B2A4A;
            --gold: #C9A227;
            --gray-light: #F9F8F6;
            --gray-text: #5F6B7A;
            --white: #FFFFFF;
            --border: #E8E6E1;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
            background: var(--gray-light);
            color: #333;
            font-size: 15px;
            line-height: 1.6;
        }

        .container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            background: var(--white);
            padding: 40px;
            margin-bottom: 40px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--navy);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        header .header-left h1 {
            font-size: 32px;
            font-weight: 700;
            color: var(--navy);
            margin-bottom: 8px;
            letter-spacing: -0.02em;
        }

        header .header-left p {
            font-size: 14px;
            color: var(--gray-text);
            font-weight: 500;
        }

        header .office-info {
            text-align: right;
            padding: 16px 20px;
            border-left: 2px solid var(--gold);
            padding-left: 20px;
        }

        header .office-info div {
            font-size: 13px;
            font-weight: 600;
            color: var(--navy);
            line-height: 1.8;
        }

        header .office-info div:nth-child(2) {
            font-size: 15px;
            font-weight: 700;
            margin: 4px 0;
        }

        header .office-info div:last-child {
            font-size: 12px;
            color: var(--gray-text);
            font-weight: 500;
        }

        .content-wrapper {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 30px;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 30px;
        }

        .section {
            background: var(--white);
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border);
        }

        .section h2 {
            font-size: 18px;
            font-weight: 700;
            color: var(--navy);
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--gold);
            letter-spacing: -0.01em;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }

        .stat-item {
            background: var(--gray-light);
            padding: 20px;
            border-radius: 6px;
            border-left: 3px solid var(--gold);
        }

        .stat-label {
            font-size: 11px;
            color: var(--gray-text);
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: var(--navy);
        }

        .info-highlight {
            background: var(--gray-light);
            border-left: 3px solid var(--gold);
            padding: 18px 20px;
            border-radius: 6px;
            margin-top: 16px;
            font-size: 14px;
            line-height: 1.7;
            color: #555;
        }

        .info-highlight strong {
            color: var(--navy);
            display: block;
            margin-bottom: 8px;
            font-weight: 700;
        }

        .blog-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .blog-item {
            background: var(--gray-light);
            padding: 16px 18px;
            border-radius: 6px;
            border-left: 3px solid var(--gold);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
            gap: 12px;
        }

        .blog-item:hover {
            background: #F0EDE5;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .blog-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--navy);
            flex: 1;
            line-height: 1.5;
        }

        .blog-link {
            background: var(--navy);
            color: var(--gold);
            padding: 6px 14px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            flex-shrink: 0;
            display: inline-block;
        }

        .blog-link:hover {
            background: var(--gold);
            color: var(--white);
            box-shadow: 0 2px 6px rgba(201, 162, 39, 0.2);
        }

        .listings-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .listing-item {
            background: var(--gray-light);
            padding: 16px 18px;
            border-radius: 6px;
            border-left: 3px solid var(--navy);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
            gap: 12px;
        }

        .listing-item:hover {
            background: #F0EDE5;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .listing-info {
            flex: 1;
            min-width: 0;
        }

        .listing-name {
            font-weight: 700;
            color: var(--navy);
            font-size: 13px;
            margin-bottom: 4px;
        }

        .listing-meta {
            font-size: 12px;
            color: var(--gray-text);
            font-weight: 600;
        }

        .listing-price {
            font-size: 14px;
            font-weight: 700;
            color: var(--navy);
            min-width: 80px;
            text-align: right;
            flex-shrink: 0;
        }

        .view-btn {
            background: var(--navy);
            color: var(--gold);
            padding: 6px 14px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            flex-shrink: 0;
            display: inline-block;
        }

        .view-btn:hover {
            background: var(--gold);
            color: var(--white);
            box-shadow: 0 2px 6px rgba(201, 162, 39, 0.2);
        }

        .contact-section {
            background: var(--navy);
            color: var(--white);
        }

        .contact-section h2 {
            border-bottom-color: var(--gold);
            color: var(--gold);
        }

        .contact-content {
            font-size: 13px;
            line-height: 1.8;
            margin-bottom: 20px;
            color: rgba(255, 255, 255, 0.95);
        }

        .contact-btn {
            display: block;
            width: 100%;
            text-align: center;
            background: var(--gold);
            color: var(--navy);
            border: none;
            font-weight: 700;
            padding: 12px 0;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s ease;
        }

        .contact-btn:hover {
            background: #E8D9A8;
            box-shadow: 0 4px 10px rgba(201, 162, 39, 0.3);
            transform: translateY(-1px);
        }

        .info-section h2 {
            border-bottom-color: var(--gold);
            color: var(--navy);
        }

        .info-content {
            font-size: 13px;
            line-height: 2;
        }

        .info-item {
            display: flex;
            gap: 12px;
            margin-bottom: 8px;
        }

        .info-item:last-child {
            margin-bottom: 0;
        }

        .info-label {
            font-weight: 700;
            min-width: 50px;
            color: var(--navy);
            font-size: 12px;
        }

        .info-item div:last-child {
            color: #555;
            font-weight: 500;
        }

        .badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            background: var(--navy);
            color: var(--gold);
            border-radius: 3px;
            margin-right: 6px;
        }

        .chart-container {
            margin-top: 16px;
        }

        .chart-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .chart-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--navy);
            min-width: 70px;
        }

        .chart-bar {
            flex: 1;
            height: 24px;
            background: linear-gradient(90deg, var(--gold) 0%, var(--navy) 100%);
            border-radius: 4px;
            position: relative;
        }

        .chart-value {
            font-size: 12px;
            font-weight: 700;
            color: var(--navy);
            min-width: 50px;
            text-align: right;
        }

        @media (max-width: 768px) {
            .container {
                padding: 25px 15px;
            }

            header {
                flex-direction: column;
                gap: 20px;
                padding: 25px;
            }

            header .office-info {
                border-left: none;
                border-top: 2px solid var(--gold);
                padding-left: 0;
                padding-top: 20px;
                text-align: left;
            }

            .content-wrapper {
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .listing-item, .blog-item {
                flex-wrap: wrap;
            }

            .listing-price {
                width: 100%;
                text-align: left;
                margin-top: 6px;
            }

            .view-btn, .blog-link {
                width: 100%;
                text-align: center;
                margin-top: 8px;
            }

            .section {
                padding: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1>${escapeHtml(region)} 부동산</h1>
                <p>서울 중심의 최신 매물 및 시장 정보</p>
            </div>
            <div class="office-info">
                <div>REALWALKERS</div>
                <div>리얼워커스</div>
                <div>공인중개사사무소 · 마포</div>
            </div>
        </header>

        <div class="content-wrapper">
            <div class="main-content">
                <div class="section">
                    <h2>매물현황</h2>
                    <div style="background: var(--gray-light); padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 800; color: var(--navy); margin-bottom: 4px;">${listings.length}개</div>
                        <div style="font-size: 12px; color: var(--gray-text); font-weight: 600;">전체 매물</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 13px; font-weight: 700; color: var(--navy); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--gold);">유형별</div>
                            ${typeCountHtml}
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 700; color: var(--navy); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--gold);">가격대별</div>
                            ${priceRangeHtml}
                        </div>
                    </div>

                    <div style="background: var(--gray-light); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 13px; font-weight: 700; color: var(--navy); margin-bottom: 12px;">주요 매물</div>
                        ${featuredListings}
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button onclick="goToMap()" style="flex: 1; padding: 10px; background: var(--navy); color: var(--gold); border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 13px;">지도로 보기</button>
                        <button onclick="goHome()" style="flex: 1; padding: 10px; background: var(--navy); color: var(--gold); border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 13px;">홈페이지</button>
                    </div>
                </div>

                ${blogLinks.length > 0 ? `
                <div class="section">
                    <h2>관련 글</h2>
                    <div class="blog-list">
                        ${blogsHtml}
                    </div>
                </div>
                ` : ''}

                <div class="section">
                    <h2>현재 매물 (${listings.length}개)</h2>
                    <div class="listings-list">
                        ${listingsHtml}
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <div class="section contact-section">
                    <h2>빠른 문의</h2>
                    <div class="contact-content">
                        ${escapeHtml(region)}의 매물이나 시장 정보에 대해 궁금하신 점이 있으신가요? 저희 전문가에게 직접 상담받으세요.
                    </div>
                    <button class="contact-btn" onclick="handleContactClick(event)">문의하기</button>
                </div>

                <div class="section info-section">
                    <h2>연락처</h2>
                    <div class="info-content">
                        <div class="info-item">
                            <div class="info-label">전화</div>
                            <div>010-4280-0869</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">카톡</div>
                            <div>@realwalkers</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">이메일</div>
                            <div>realwalkers@naver.com</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">블로그</div>
                            <div>blog.naver.com/realwalkers</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        let currentPage = 1;

        // 모바일/PC 감지 및 문의하기 처리
        function handleContactClick(event) {
            event.preventDefault();
            const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);

            if (isMobile) {
                // 모바일: SMS 발송
                window.location.href = 'sms:01042800869?body=안녕하세요. 리얼워커스입니다. 부동산 매물에 대해 문의드립니다.';
            } else {
                // PC: 카톡 오픈
                window.open('https://pf.kakao.com/_mxewen', '_blank');
            }
        }

        // 더 보기 버튼 클릭
        function loadMoreListings() {
            const listings = document.querySelectorAll('[data-index]');
            let visibleCount = 0;

            listings.forEach(item => {
                const index = parseInt(item.getAttribute('data-index'));
                if (index < (currentPage + 1) * 8) {
                    item.style.display = '';
                    visibleCount++;
                }
            });

            currentPage++;

            // 모든 항목이 표시되면 버튼 숨기기
            const button = document.querySelector('button:has-text("더 보기")');
            if (visibleCount >= listings.length) {
                const btnContainer = document.querySelector('[style*="text-align: center"]');
                if (btnContainer) btnContainer.remove();
            }
        }

        // 지도 보기 버튼 클릭
        function goToMap() {
            window.location.href = '/#map';
        }

        // 홈페이지 버튼 클릭
        function goHome() {
            window.location.href = '/';
        }
    </script>
</body>
</html>`;
}

/* HTML 특수문자 이스케이프 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

/* CSV 안에서 특정 지역의 블로그 링크들을 찾습니다. */
function findBlogLinksByRegion(csvText, region) {
  const rows = parseCSV(csvText);
  if (!rows.length) return [];

  const head = rows[0].map(h => h.trim());
  const idx = name => head.indexOf(name);
  const iAddr = idx("주소"), iN = idx("매물명"), iShow = idx("노출"),
        iLat = idx("위도"), iLng = idx("경도"), iBlog = idx("블로그링크");

  if (iAddr < 0 || iBlog < 0) return [];

  const seen = {};
  const blogLinks = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const addr = (row[iAddr] || "").trim();
    const blogUrl = (row[iBlog] || "").trim();

    // 필터링: 노출 N 제외, 매물명 필수, 위치 필수, 블로그링크 필수
    const showVal = iShow >= 0 ? (row[iShow] || "").trim().toUpperCase() : "";
    if (showVal === "N") continue;

    const name = iN >= 0 ? (row[iN] || "").trim() : "";
    if (!name) continue;

    const lat = parseFloat(row[iLat]), lng = parseFloat(row[iLng]);
    if ((isNaN(lat) || isNaN(lng)) && !addr) continue;

    if (!blogUrl) continue;

    // 주소에서 지역명 추출해서 비교
    const extractedRegion = extractRegion(addr);
    if (extractedRegion !== region) continue;

    // 블로그 URL 중복 제거
    if (!seen[blogUrl]) {
      seen[blogUrl] = true;

      // 블로그 URL에서 제목 추출 (네이버 블로그 포스트 번호로 식별)
      const title = extractBlogTitle(blogUrl) || name;

      blogLinks.push({
        title: title,
        url: blogUrl,
      });
    }
  }

  return blogLinks;
}

/* 블로그 URL에서 제목을 추출합니다 (간단한 버전) */
function extractBlogTitle(blogUrl) {
  // 네이버 블로그 URL 형식: https://blog.naver.com/realwalkers/XXXXXXXXX
  // 포스트 번호로 식별하면 되고, 제목은 페이지 타이틀에서 가져와야 하지만
  // 여기서는 간단하게 URL에서 추출하거나 기본값 사용
  try {
    const url = new URL(blogUrl);
    // 여기서는 단순 구조이므로 기본값 반환
    return null;
  } catch (e) {
    return null;
  }
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

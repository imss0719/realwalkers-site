/* ══════════════════════════════════════════════════════════════
   지역별 매물 선택 페이지 — Cloudflare Pages Function

   /regions 으로 접속하면 모든 지역을 카드 그리드로 보여줍니다.
   각 카드는 해당 지역의 /region/[지역명] 페이지로 링크됩니다.
   ══════════════════════════════════════════════════════════════ */

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-V_ZJtPtye1Or9bEkQpDOxyofS-x837-NyuaRDR948PvkRRc9-MivFlDWC7sjlGCyucPvRg_fs8tt/pub?gid=0&single=true&output=csv";

export async function onRequest(context) {
  const { request } = context;
  const origin = new URL(request.url).origin;

  // 구글시트에서 모든 지역과 매물 수를 가져옵니다
  let regionStats = {};
  try {
    const csvRes = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (csvRes.ok) {
      const text = await csvRes.text();
      regionStats = getRegionStats(text);
    }
  } catch (e) {
    // CSV를 못 가져와도 계속 진행합니다
  }

  const html = generateRegionsPage(regionStats, origin);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

/* 모든 지역별 매물 통계를 계산합니다 */
function getRegionStats(csvText) {
  const rows = parseCSV(csvText);
  if (!rows.length) return {};

  const head = rows[0].map(h => h.trim());
  const iAddr = head.indexOf("주소");
  const iShow = head.indexOf("노출");
  const iN = head.indexOf("매물명");
  const iP = head.indexOf("가격");
  const iD = head.indexOf("거래");

  if (iAddr < 0) return {};

  const stats = {};

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const addr = (row[iAddr] || "").trim();

    // "노출" 칸이 "N"이면 제외
    const showVal = iShow >= 0 ? (row[iShow] || "").trim().toUpperCase() : "";
    if (showVal === "N") continue;

    // "거래" 칸이 "완료"면 제외
    const dealVal = iD >= 0 ? (row[iD] || "").trim() : "";
    if (dealVal === "완료") continue;

    // 매물명이 없으면 제외
    const name = iN >= 0 ? (row[iN] || "").trim() : "";
    if (!name) continue;

    const region = extractRegion(addr);
    if (!region) continue;

    if (!stats[region]) {
      stats[region] = { count: 0, prices: [] };
    }

    stats[region].count++;

    // 평균가 계산용 가격 수집
    const price = iP >= 0 ? (row[iP] || "").trim() : "";
    if (price) {
      const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
      if (!isNaN(priceNum)) {
        stats[region].prices.push(priceNum);
      }
    }
  }

  // 평균가 계산
  Object.keys(stats).forEach(region => {
    const prices = stats[region].prices;
    if (prices.length > 0) {
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      stats[region].avgPrice = formatPrice(avg);
    }
    delete stats[region].prices; // 불필요한 데이터 제거
  });

  return stats;
}

/* 가격을 "X.XB" 형식으로 포맷팅합니다 */
function formatPrice(num) {
  if (num >= 10) return Math.round(num / 10) / 10 + 'B';
  if (num >= 1) return Math.round(num * 10) / 10 + 'B';
  return num + '만';
}

/* 주소에서 지역명(시/군/구)을 추출합니다 */
function extractRegion(addr) {
  if (!addr) return "";
  const parts = addr.split(/\s+/);
  if (parts.length >= 2) {
    return parts[1];
  }
  return "";
}

/* 지역별 매물 페이지 HTML을 생성합니다 */
function generateRegionsPage(regionStats, origin) {
  // 지역을 매물 수 기준으로 내림차순 정렬
  const allRegions = Object.keys(regionStats).sort((a, b) => regionStats[b].count - regionStats[a].count);

  // 가장 많은 매물 수를 기준으로 바의 최대값 설정
  const maxCount = allRegions.length > 0 ? regionStats[allRegions[0]].count : 1;

  // 지역을 그룹별로 분류
  const groupedRegions = {};
  allRegions.forEach(region => {
    const group = getRegionGroup(region);
    if (!groupedRegions[group]) {
      groupedRegions[group] = [];
    }
    groupedRegions[group].push(region);
  });

  // 그룹 순서 정의
  const groupOrder = ['서울', '경기도', '인천'];
  const sortedGroups = groupOrder.filter(g => groupedRegions[g]);
  if (Object.keys(groupedRegions).some(g => !groupOrder.includes(g))) {
    const otherGroups = Object.keys(groupedRegions).filter(g => !groupOrder.includes(g)).sort();
    sortedGroups.push(...otherGroups);
  }

  // 섹션별 HTML 생성
  const sectionsHtml = sortedGroups.map(group => {
    const regions = groupedRegions[group];
    const regionCardsHtml = regions.map(region => {
      const stat = regionStats[region];
      const emoji = getRegionEmoji(region);
      const barWidth = (stat.count / maxCount) * 100;

      return `
      <a href="/region/${encodeURIComponent(region)}" class="region-card">
        <div class="region-header">
          <span class="region-emoji">${emoji}</span>
          <div class="region-info">
            <div class="region-name">${escapeHtml(region)}</div>
            <div class="region-count">${stat.count}개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: ${barWidth}%"></div>
        </div>
      </a>
    `;
    }).join('');

    return `
    <div class="region-section">
      <div class="section-header-title">◀ ${group} (${regions.length}개 지역)</div>
      <div class="regions-grid">
        ${regionCardsHtml}
      </div>
    </div>
  `;
  }).join('');

  const regionCardsHtml = sectionsHtml;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>지역별 부동산 매물 | 리얼워커스</title>
    <meta name="description" content="서울·경기 지역별 부동산 매물 정보. 아파트, 상가, 건물, 토지 등 다양한 매물을 지역별로 확인하세요.">
    <link rel="canonical" href="${escapeHtml(origin)}/regions">
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
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .section-header {
            text-align: center;
            margin-bottom: 50px;
        }

        .section-header h1 {
            font-size: 36px;
            font-weight: 700;
            color: var(--navy);
            margin-bottom: 12px;
            letter-spacing: -0.02em;
        }

        .section-header p {
            font-size: 16px;
            color: var(--gray-text);
            font-weight: 500;
        }

        .region-section {
            margin-bottom: 50px;
        }

        .region-section:last-child {
            margin-bottom: 0;
        }

        .section-header-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--navy);
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--gold);
            letter-spacing: -0.01em;
        }

        .regions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px;
        }

        .region-card {
            background: var(--white);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
            cursor: pointer;
            border: 1px solid var(--border);
            text-decoration: none;
            color: inherit;
            display: flex;
            flex-direction: column;
            padding: 16px;
        }

        .region-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: var(--gold);
        }

        .region-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .region-emoji {
            font-size: 32px;
            flex-shrink: 0;
        }

        .region-info {
            flex: 1;
            min-width: 0;
        }

        .region-name {
            font-size: 16px;
            font-weight: 700;
            color: var(--navy);
            transition: color 0.2s ease;
        }

        .region-card:hover .region-name {
            color: var(--gold);
        }

        .region-count {
            font-size: 14px;
            font-weight: 700;
            color: var(--gold);
            margin-top: 2px;
        }

        .region-bar-container {
            width: 100%;
            height: 8px;
            background: var(--gray-light);
            border-radius: 4px;
            overflow: hidden;
        }

        .region-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--navy) 0%, var(--gold) 100%);
            transition: width 0.3s ease;
            border-radius: 4px;
        }

        .footer-link {
            text-align: center;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid var(--border);
        }

        .footer-link a {
            display: inline-block;
            background: var(--navy);
            color: var(--gold);
            padding: 12px 28px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 700;
            transition: all 0.2s ease;
        }

        .footer-link a:hover {
            background: var(--gold);
            color: var(--navy);
        }

        @media (max-width: 768px) {
            .region-section {
                margin-bottom: 40px;
            }

            .regions-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .section-header {
                font-size: 28px;
            }

            .section-header-title {
                font-size: 16px;
                margin-bottom: 16px;
            }

            .region-card {
                padding: 14px;
            }

            .region-emoji {
                font-size: 28px;
            }

            .region-name {
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="section-header">
            <h1>지역별 부동산 매물</h1>
            <p>원하시는 지역을 선택해 최신 매물 정보를 확인하세요</p>
        </div>

        <div class="regions-grid">
            ${regionCardsHtml}
        </div>

        <div class="footer-link">
            <a href="/">← 지도로 돌아가기</a>
        </div>
    </div>
</body>
</html>`;
}

/* 지역별 이모지를 반환합니다 */
function getRegionEmoji(region) {
  const emojiMap = {
    '마포구': '🏢', '강남구': '🏙️', '송파구': '🌳', '서초구': '🏛️',
    '종로구': '🏯', '강북구': '⛰️', '중구': '🌐', '김포시': '🌾',
    '고양시': '🏘️', '서대문구': '🎓', '은평구': '🌲', '광진구': '🚇',
    '강동구': '🌊', '양천구': '🏞️', '노원구': '🏞️',
    '인천': '⚓', '부천': '🏭', '성남': '🏗️'
  };
  return emojiMap[region] || '🏠';
}

/* 지역을 대분류 그룹으로 분류합니다 */
function getRegionGroup(region) {
  const groupMap = {
    // 서울
    '마포구': '서울', '강남구': '서울', '송파구': '서울', '서초구': '서울',
    '종로구': '서울', '강북구': '서울', '중구': '서울', '서대문구': '서울',
    '은평구': '서울', '광진구': '서울', '강동구': '서울', '양천구': '서울',
    '노원구': '서울', '동대문구': '서울', '성동구': '서울', '구로구': '서울',
    '영등포구': '서울', '금천구': '서울', '동작구': '서울', '관악구': '서울',
    '강서구': '서울',
    // 경기도
    '김포시': '경기도', '고양시': '경기도', '파주시': '경기도', '부천시': '경기도',
    '성남시': '경기도', '수원시': '경기도', '용인시': '경기도', '안산시': '경기도',
    '안양시': '경기도', '군포시': '경기도', '동두천시': '경기도', '의정부시': '경기도',
    '남양주시': '경기도', '오산시': '경기도', '평택시': '경기도', '화성시': '경기도',
    '광주시': '경기도', '이천시': '경기도', '여주시': '경기도', '가평군': '경기도',
    // 인천
    '인천': '인천', '인천시': '인천',
  };
  return groupMap[region] || '기타';
}

/* 지역별 설명을 반환합니다 */
function getRegionSubtitle(region) {
  const subtitleMap = {
    '마포구': '서울 중심의 현대적 지역',
    '강남구': '프리미엄 주거 지역',
    '송파구': '한강 조망 최고 명소',
    '서초구': '교육·문화 중심지',
    '종로구': '역사 문화의 중심',
    '강북구': '자연과 도시의 조화',
    '중구': '비즈니스 중심가',
    '김포시': '경기도 신흥 도시',
    '고양시': '신도시 개발 지역',
    '서대문구': '대학 문화의 중심',
    '은평구': '주거 안정 지역',
    '광진구': '교통 요지 지역'
  };
  return subtitleMap[region] || '최신 매물 정보';
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

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>지역별 부동산 매물 | 리얼워커스</title>
    <meta name="description" content="서울·경기 지역별 부동산 매물 정보. 아파트, 상가, 건물, 토지 등 다양한 매물을 지역별로 확인하세요.">
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

            .section-header h1 {
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

        
    <div class="region-section">
      <div class="section-header-title">◀ 서울 (9개 지역)</div>
      <div class="regions-grid">
        
      <a href="/region/%EB%A7%88%ED%8F%AC%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏢</span>
          <div class="region-info">
            <div class="region-name">마포구</div>
            <div class="region-count">5개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 100%"></div>
        </div>
      </a>
    
      <a href="/region/%EA%B0%95%EB%82%A8%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏙️</span>
          <div class="region-info">
            <div class="region-name">강남구</div>
            <div class="region-count">3개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 60%"></div>
        </div>
      </a>
    
      <a href="/region/%EC%84%9C%EC%B4%88%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏛️</span>
          <div class="region-info">
            <div class="region-name">서초구</div>
            <div class="region-count">3개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 60%"></div>
        </div>
      </a>
    
      <a href="/region/%EC%86%A1%ED%8C%8C%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🌳</span>
          <div class="region-info">
            <div class="region-name">송파구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EC%A2%85%EB%A1%9C%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏯</span>
          <div class="region-info">
            <div class="region-name">종로구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EC%A4%91%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🌐</span>
          <div class="region-info">
            <div class="region-name">중구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EC%9D%80%ED%8F%89%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🌲</span>
          <div class="region-info">
            <div class="region-name">은평구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EA%B4%91%EC%A7%84%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🚇</span>
          <div class="region-info">
            <div class="region-name">광진구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EA%B0%95%EB%B6%81%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">⛰️</span>
          <div class="region-info">
            <div class="region-name">강북구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      </div>
    </div>
  
    <div class="region-section">
      <div class="section-header-title">◀ 경기도 (5개 지역)</div>
      <div class="regions-grid">
        
      <a href="/region/%EA%B3%A0%EC%96%91%EC%8B%9C" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏘️</span>
          <div class="region-info">
            <div class="region-name">고양시</div>
            <div class="region-count">2개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 40%"></div>
        </div>
      </a>
    
      <a href="/region/%EA%B9%80%ED%8F%AC%EC%8B%9C" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🌾</span>
          <div class="region-info">
            <div class="region-name">김포시</div>
            <div class="region-count">2개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 40%"></div>
        </div>
      </a>
    
      <a href="/region/%ED%8C%8C%EC%A3%BC%EC%8B%9C" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🌳</span>
          <div class="region-info">
            <div class="region-name">파주시</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EB%B6%80%EC%B2%9C%EC%8B%9C" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏭</span>
          <div class="region-info">
            <div class="region-name">부천시</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      <a href="/region/%EC%84%B1%EB%82%A8%EC%8B%9C" class="region-card">
        <div class="region-header">
          <span class="region-emoji">🏗️</span>
          <div class="region-info">
            <div class="region-name">성남시</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      </div>
    </div>
  
    <div class="region-section">
      <div class="section-header-title">◀ 인천 (1개 지역)</div>
      <div class="regions-grid">
        
      <a href="/region/%EB%82%A8%EB%8F%99%EA%B5%AC" class="region-card">
        <div class="region-header">
          <span class="region-emoji">⚓</span>
          <div class="region-info">
            <div class="region-name">남동구</div>
            <div class="region-count">1개</div>
          </div>
        </div>
        <div class="region-bar-container">
          <div class="region-bar" style="width: 20%"></div>
        </div>
      </a>
    
      </div>
    </div>
  

        <div class="footer-link">
            <a href="/">← 지도로 돌아가기</a>
        </div>
    </div>
</body>
</html>

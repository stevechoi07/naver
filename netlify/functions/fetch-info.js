// 이 파일은 Netlify 서버에서만 실행되는 비밀 요원(서버리스 함수)이야!
// CORS 정책을 우회해서 지정된 URL의 HTML을 싹 긁어오는 임무를 수행하지. (v1.5)

const axios = require('axios');
const cheerio = require('cheerio');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// [v1.4] '투명 망토' 역할을 해줄 CORS 프록시 주소
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

async function fetchDataWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[요원] 잠입 시도 (${i + 1}/${maxRetries})...`);
      
      const proxyRequestUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
      console.log(`[요원] 프록시를 통해 다음 주소로 요청: ${proxyRequestUrl}`);

      const response = await axios.get(proxyRequestUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://shopping.naver.com/',
        },
        timeout: 15000 
      });
      return response;
    } catch (error) {
      if (error.response && error.response.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`[요원] 문전박대 당함 (429 에러)! ${Math.round(delay / 100) / 10}초 후 재시도합니다.`);
        await sleep(delay);
      } else {
        // [v1.5 추가] 에러에 응답 데이터를 포함시켜서 프론트엔드로 전달
        const enhancedError = new Error(error.message);
        enhancedError.response = error.response;
        throw enhancedError;
      }
    }
  }
}

exports.handler = async (event, context) => {
  console.log('[요원] 출동! 임무 접수 완료. (v1.5)');
  const targetUrl = event.queryStringParameters.url;
  console.log(`[요원] 타겟 URL: ${targetUrl}`);

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL이 필요합니다.' }),
    };
  }

  try {
    const response = await fetchDataWithRetry(targetUrl);
    const html = response.data;
    console.log('[요원] 잠입 성공! HTML 문서 확보 완료.');

    const $ = cheerio.load(html);

    const keywords = $('meta[name="keywords"]').attr('content');
    const tags = keywords ? keywords.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    console.log('[요원] 관련 태그 추출 완료:', tags);
    
    // [v1.5 개선] '전지적 스캐너' 장착! 다양한 페이지 구조에 대응하도록 선택자 강화
    const attributes = [];
    const selectors = [
      'div[class^="attribute_wrapper"] table tr', 
      'div[class*="product_info_notice"] table tr',
      'div.m_PTftTaj7 table tr'
    ];

    $(selectors.join(', ')).each((i, elem) => {
      const th = $(elem).find('th');
      const td = $(elem).find('td');
      
      if (th.length > 0 && td.length > 0) {
        const name = th.first().text().trim();
        const value = td.first().text().trim();
        if (name && value) {
          // 중복 속성 방지
          if (!attributes.some(attr => attr.name === name)) {
            attributes.push({ name, value });
          }
        }
      }
    });
    console.log('[요원] 상품 속성 추출 완료:', attributes);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes, tags }),
    };
  } catch (error) {
    console.error('[요원] 임무 최종 실패! 원인:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response ? (error.response.data || error.message) : error.message;
    return {
      statusCode: status,
      body: JSON.stringify({ error: `정보를 가져오는 데 실패했습니다: ${message}` }),
    };
  }
};
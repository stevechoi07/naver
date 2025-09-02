// 이 파일은 Netlify 서버에서만 실행되는 비밀 요원(서버리스 함수)이야!
// CORS 정책을 우회해서 지정된 URL의 HTML을 싹 긁어오는 임무를 수행하지. (v1.4)

const axios = require('axios');
const cheerio = require('cheerio');

// [v1.2] 잠시 대기하는 헬퍼 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// [v1.4 수정] 더 강력하고 안정적인 새 조력자(CORS 프록시)로 교체!
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

// [v1.3] '완벽한 위장술' 적용!
async function fetchDataWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[요원] 잠입 시도 (${i + 1}/${maxRetries})...`);
      
      // [v1.4 수정] 새 프록시 주소 형식에 맞게 URL 인코딩 추가
      const proxyRequestUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
      console.log(`[요원] 프록시를 통해 다음 주소로 요청: ${proxyRequestUrl}`);

      const response = await axios.get(proxyRequestUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          // [v1.3] '어디서 오셨소?'에 대한 답변 준비 (가짜 추천서)
          'Referer': 'https://shopping.naver.com/',
        },
        // [v1.3] 응답이 너무 늦어도 기다려주는 인내심
        timeout: 15000 
      });
      return response; // 성공!
    } catch (error) {
      if (error.response && error.response.status === 429 && i < maxRetries - 1) {
        // [v1.3] 기계처럼 보이지 않게 랜덤 딜레이 추가
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`[요원] 문전박대 당함 (429 에러)! ${Math.round(delay / 100) / 10}초 후 재시도합니다.`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

exports.handler = async (event, context) => {
  console.log('[요원] 출동! 임무 접수 완료. (v1.4)');
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
    
    // [v1.1 개선] 상품 속성 테이블 선택자 명확화
    const attributes = [];
    $('div[class^="attribute_wrapper"] table tr, div[class*="product_info_notice"] table tr').each((i, elem) => {
      const th = $(elem).find('th');
      const td = $(elem).find('td');
      
      if (th.length > 0 && td.length > 0) {
        const name = th.first().text().trim();
        const value = td.first().text().trim();
        if (name && value) {
          attributes.push({ name, value });
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
    return {
      statusCode: error.response ? error.response.status : 500,
      body: JSON.stringify({ error: `정보를 가져오는 데 실패했습니다: ${error.message}` }),
    };
  }
};
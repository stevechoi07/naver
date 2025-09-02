// 이 파일은 Netlify 서버에서만 실행되는 비밀 요원(서버리스 함수)이야!
// CORS 정책을 우회해서 지정된 URL의 HTML을 싹 긁어오는 임무를 수행하지.

const axios = require('axios');
const cheerio = require('cheerio');

// [v1.2 추가] 잠시 대기하는 헬퍼 함수 (삼고초려 스킬의 핵심!)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// [v1.2 추가] 데이터를 가져오는 핵심 로직을 '재시도' 기능이 포함된 별도 함수로 분리
async function fetchDataWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 🔥 디버깅: 몇 번째 시도인지 로그로 확인
      console.log(`[요원] 잠입 시도 (${i + 1}/${maxRetries})...`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });
      return response; // 성공하면 바로 결과 반환
    } catch (error) {
      // 429 에러(Too Many Requests)이고, 마지막 시도가 아니라면
      if (error.response && error.response.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1초, 2초, 4초... 순으로 대기 시간 증가
        // 🔥 디버깅: 재시도 전 대기 시간 확인
        console.log(`[요원] 문전박대 당함 (429 에러)! ${delay / 1000}초 후 재시도합니다.`);
        await sleep(delay);
      } else {
        // 다른 종류의 에러거나, 모든 재시도 실패 시 에러를 던짐
        throw error;
      }
    }
  }
}

exports.handler = async (event, context) => {
  console.log('[요원] 출동! 임무 접수 완료. (v1.2)');
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

    const attributes = [];
    $('div.attribute_wrapper table tr').each((i, elem) => {
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attributes,
        tags,
      }),
    };
  } catch (error) {
    console.error('[요원] 임무 최종 실패! 원인:', error.message);
    return {
      statusCode: error.response ? error.response.status : 500,
      body: JSON.stringify({ error: `정보를 가져오는 데 실패했습니다: ${error.message}` }),
    };
  }
};
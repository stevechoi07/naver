// [v1.7.1] '인내심 강화 키트' 탑재 버전!
// 성급한 axios의 타임아웃을 20초로 늘리고, 디버깅 모드를 탑재하여 작전 수행 능력을 강화했다.
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  // 1. URL과 디버그 모드 쿼리 파라미터 가져오기
  const targetUrl = event.queryStringParameters.url;
  const isDebugMode = event.queryStringParameters.debug === 'true';

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL을 입력해주세요.' }),
    };
  }

  const proxyUrl = 'https://cors.sh/';
  const fullUrl = `${proxyUrl}${targetUrl}`;

  try {
    // ⭐ 작전명: 성급한 axios 길들이기! ⭐
    // 기본 대기 시간(약 15초)이 너무 짧아 작전에 실패하는 것을 방지하기 위해,
    // 대기 시간을 20초(20000ms)로 넉넉하게 설정!
    const response = await axios.get(fullUrl, {
      timeout: 20000, // 20초 안에 응답이 없으면 작전 실패로 간주!
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://www.naver.com/',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const html = response.data;

    // 2. 디버깅 모드가 활성화된 경우, 원본 HTML을 바로 반환
    if (isDebugMode) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: html,
      };
    }

    // 3. 디버깅 모드가 아닐 때만 파싱 수행
    const $ = cheerio.load(html);
    let attributes = [];
    let tags = [];

    // '만능 스캐너' 로직: URL에 따라 분기 처리
    if (targetUrl.includes('smartstore.naver.com')) {
      // 스마트스토어 파싱 로직
      $('div[class^="_2_Ac3_-pd-"] table tbody tr').each((i, elem) => {
        const th = $(elem).find('th').text().trim();
        const td = $(elem).find('td').text().trim();
        if (th && td) {
          attributes.push({ key: th, value: td });
        }
      });
      $('a[class^="TagGroup_tag__"]').each((i, elem) => {
        tags.push($(elem).text().trim());
      });
    } else if (targetUrl.includes('search.shopping.naver.com/catalog')) {
      // 쇼핑 카탈로그 파싱 로직
      $('div[class^="product_info_item__"] div[class^="product_info_basis__"]').each((i, elem) => {
        const key = $(elem).find('div[class^="product_info_title__"]').text().trim();
        const value = $(elem).find('div[class^="product_info_value__"]').text().trim();
        if (key && value) {
          attributes.push({ key, value });
        }
      });
      $('a[class^="top_breadcrumb_item__"]').each((i, elem) => {
        tags.push($(elem).text().trim());
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ attributes, tags }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `정보를 가져오는 데 실패했습니다: ${error.message}`,
      }),
    };
  }
};
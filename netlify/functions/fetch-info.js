// [v1.9] 'CSI 과학수사 블랙박스' 탑재 버전!
// 요원이 기절하더라도, 마지막 순간까지 모든 것을 기록하여 보고한다.
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  const targetUrl = event.queryStringParameters.url;
  const isDebugMode = event.queryStringParameters.debug === 'true';

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL을 입력해주세요.' }),
    };
  }

  const proxyUrl = 'https://api.allorigins.win/raw?url=';
  const fullUrl = `${proxyUrl}${encodeURIComponent(targetUrl)}`;

  try {
    const response = await axios.get(fullUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://www.naver.com/',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const html = response.data;

    if (isDebugMode) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: html,
      };
    }

    const $ = cheerio.load(html);
    let attributes = [];
    let tags = [];

    if (targetUrl.includes('smartstore.naver.com')) {
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
    // ⭐ 작전명: 기절한 요원에게 '블랙박스'를 달아주자! ⭐
    // axios 에러의 상세 정보를 모두 추출하여, 기절 원인을 낱낱이 밝힌다!
    const blackbox = {};
    if (error.response) {
      // 서버가 응답했지만, 상태 코드가 2xx 범위를 벗어남 (예: 403, 404, 500)
      blackbox.reason = 'Server responded with an error';
      blackbox.status = error.response.status;
      blackbox.statusText = error.response.statusText;
      // blackbox.headers = error.response.headers; // 너무 길어서 일단 주석처리
      blackbox.data = error.response.data; // 서버가 보낸 에러 메시지 (결정적 단서!)
    } else if (error.request) {
      // 요청은 보냈지만, 응답을 받지 못함 (예: 네트워크 문제, 프록시 서버 다운)
      blackbox.reason = 'No response received from server';
    } else {
      // 요청을 설정하는 중에 오류 발생
      blackbox.reason = 'Error setting up the request';
      blackbox.message = error.message;
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "요원이 작전 중 기절했습니다! (아래 블랙박스 기록 확인)",
        blackbox: blackbox,
      }),
    };
  }
};
// [v1.10] '전광석화' 최종 버전
// Netlify의 10초 폭탄이 터지기 전에, 9초 안에 스스로 작전을 판단하고 보고한다!
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
      // ⭐ 작전명: 전광석화 (Operation: Lightning Speed) ⭐
      // Netlify의 10초 '하드 리미트'가 터지기 전에 결과를 보기 위해 타임아웃을 9초로 설정!
      timeout: 9000, 
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
    const blackbox = {};
    if (error.response) {
      blackbox.reason = 'Server responded with an error';
      blackbox.status = error.response.status;
      blackbox.statusText = error.response.statusText;
      blackbox.data = error.response.data;
    } else if (error.request) {
      blackbox.reason = 'No response received from server';
      // axios 타임아웃 에러 메시지를 명확하게 포함!
      if (error.code === 'ECONNABORTED') {
        blackbox.details = `Request timed out after ${error.config.timeout}ms`;
      }
    } else {
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
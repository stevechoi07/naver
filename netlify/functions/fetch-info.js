// [v2.0] '스마트스토어 전문의' 최종 버전
// axios, 프록시, 타임아웃 등 모든 잠입 장비 제거!
// 오직 프론트엔드에서 전달받은 HTML 코드만 'cheerio' 메스로 분석한다.
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  try {
    // v2.0 핵심: event.queryStringParameters (GET) 대신 event.body (POST)에서 데이터를 받는다.
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '분석할 HTML 코드가 없습니다.' }),
        };
    }

    const { html } = JSON.parse(event.body);

    if (!html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '전달된 HTML 데이터가 비어있습니다.' }),
      };
    }

    // v2.0 핵심: 이제는 복잡한 분기 없이 오직 스마트스토어 분석 로직만 존재!
    const $ = cheerio.load(html);
    const attributes = [];
    const tags = [];

    // 스마트스토어 '상품 속성' 추출 로직 (기존과 동일)
    $('div[class^="_2_Ac3_-pd-"] table tbody tr').each((i, elem) => {
      const th = $(elem).find('th').text().trim();
      const td = $(elem).find('td').text().trim();
      if (th && td) {
        attributes.push({ key: th, value: td });
      }
    });

    // 스마트스토어 '관련 태그' 추출 로직 (기존과 동일)
    $('a[class^="TagGroup_tag__"]').each((i, elem) => {
      tags.push($(elem).text().trim());
    });
    
    // 분석 결과를 성공적으로 반환
    return {
      statusCode: 200,
      body: JSON.stringify({ attributes, tags }),
    };

  } catch (error) {
    // v2.0 핵심: 복잡한 블랙박스 대신, 간결한 에러 핸들링!
    console.error('HTML Parsing Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'HTML 코드를 분석하는 중에 에러가 발생했습니다.',
        details: error.message,
      }),
    };
  }
};
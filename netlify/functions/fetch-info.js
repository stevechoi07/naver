// [v2.1] '스마트스토어 전문의' 최종 버전
// 낡은 CSS 선택자를 현재 네이버 구조에 맞는 최신 버전으로 교체!
// '상품명' 추출 기능 (홍채 인식 스캐너) 신규 탑재!
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  try {
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

    const $ = cheerio.load(html);
    let productName = '';
    const attributes = [];
    const tags = [];

    // [v2.1] 신규 기능: 상품명 추출 (홍채 인식 스캐너)
    // NOTE: 네이버는 여러 종류의 클래스 이름을 사용하므로, 가장 일반적인 것들을 모두 찾아봅니다.
    productName = $('h3[class*="product_title"]').text().trim() || 
                  $('h3[class*="Name_name"]').text().trim();

    // [v2.1] 지도 업데이트: 상품 속성 추출 (최신 GPS)
    // NOTE: 좀 더 넓은 범위의, 안정적인 클래스 이름으로 교체합니다.
    $('div[class*="attribute_wrapper"] table tbody tr, div[class*="product_info_table"] table tbody tr').each((i, elem) => {
      const th = $(elem).find('th').text().trim();
      const td = $(elem).find('td').text().trim();
      if (th && td) {
        attributes.push({ key: th, value: td });
      }
    });

    // [v2.1] 지도 업데이트: 관련 태그 추출 (최신 GPS)
    $('div[class*="TagGroup_group"] a, div[class*="tag_list_box"] a').each((i, elem) => {
      // 태그에 붙어있는 '#' 기호는 제거하고 순수한 텍스트만 저장합니다.
      tags.push($(elem).text().trim().replace('#', ''));
    });
    
    // [v2.1] 분석 결과에 '상품명'을 추가하여 반환!
    return {
      statusCode: 200,
      body: JSON.stringify({ productName, attributes, tags }),
    };

  } catch (error) {
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
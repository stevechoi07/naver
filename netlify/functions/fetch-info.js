// [v2.2] '스마트스토어 전문의' 최종 버전
// 네이버의 잦은 인테리어 변경에 대응하기 위해 CSS 선택자 전면 업데이트!
// '군용 등급' 초정밀 스캐너 탑재!
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

    // [v2.2] 스캐너 업데이트: 상품명 추출
    // <meta property="og:title"> 태그의 content 속성을 직접 가져오는 것이 가장 안정적이다!
    productName = $('meta[property="og:title"]').attr('content') || '상품명을 찾을 수 없습니다.';
    
    // 네이버 쇼핑, 스토어 등에서 공통적으로 사용하는 상품명 포맷에서 스토어 이름 부분 제거
    if (productName.includes(':')) {
        productName = productName.split(':')[0].trim();
    }


    // [v2.2] GPS 업데이트: 상품 속성 추출
    // 'detail_attributes'라는, 더 의미가 명확한 클래스 이름을 가진 div를 직접 타겟팅한다!
    $('div.detail_attributes table.RCLS1uAn0a tbody tr').each((i, elem) => {
      const th = $(elem).find('th').text().trim();
      const td = $(elem).find('td').text().trim();
      if (th && td) {
        attributes.push({ key: th, value: td });
      }
    });

    // [v2.2] 위성 탐지기 업데이트: 관련 태그 추출
    // 'NAR95xKIue'라는 클래스를 가진 div 아래의 모든 a 태그를 찾는다!
    $('div.NAR95xKIue a.og34GRpFBf').each((i, elem) => {
      // 태그에 붙어있는 '#' 기호는 제거하고 순수한 텍스트만 저장합니다.
      const tagText = $(elem).text().trim().replace('#', '');
      if (tagText) {
          tags.push(tagText);
      }
    });
    
    // [v2.2] 분석 결과에 '상품명'을 추가하여 반환!
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
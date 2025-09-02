// [v2.3] 'HTML CSI' 버전
// 상품 속성 테이블의 복잡한 구조를 완벽하게 분해하는 '핀셋 수술' 로직 도입
// 관련 태그 탐지 범위를 넓히는 '광역 탐지' 스킬 적용
// 분석 과정을 낱낱이 기록하는 '블랙박스(디버깅)' 기능 탑재!
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
    
    // [v2.3] CSI 수사 기록을 위한 블랙박스 변수
    let debug_attributes_html = 'N/A';
    let debug_attributes_count = 0;
    let debug_tags_html = 'N/A';
    let debug_tags_count = 0;

    // 상품명 추출 (기존 v2.2 방식 유지 - 가장 안정적)
    productName = $('meta[property="og:title"]').attr('content') || '상품명을 찾을 수 없습니다.';
    if (productName.includes(':')) {
        productName = productName.split(':')[0].trim();
    }

    // [v2.3] 상품 속성 '핀셋 수술' 로직
    // 한 줄(tr)에 여러 개의 '항목(th)-값(td)' 쌍이 있는 구조에 대응!
    const attributeTable = $('div.detail_attributes table.RCLS1uAn0a');
    debug_attributes_html = attributeTable.parent().html() || '속성 테이블 영역을 찾지 못했습니다.';

    attributeTable.find('tbody tr').each((i, tr_elem) => {
      debug_attributes_count++; // 발견한 줄(tr) 개수 카운트
      const cells = $(tr_elem).children('th, td'); // th와 td를 순서대로 모두 가져옴
      // 2개씩 쌍을 지어 (th-td), (th-td)... 순서로 처리
      for (let i = 0; i < cells.length; i += 2) {
        const key = $(cells[i]).text().trim();
        const value = $(cells[i + 1]).text().trim();
        if (key && value) {
          attributes.push({ key, value });
        }
      }
    });

    // [v2.3] 관련 태그 '광역 탐지' 로직
    // 특정 클래스 이름(og34GRpFBf)을 고집하지 않고, 동네(NAR95xKIue) 안에 있는 모든 링크(a)를 탐색!
    const tagContainer = $('div.NAR95xKIue');
    debug_tags_html = tagContainer.html() || '관련 태그 영역을 찾지 못했습니다.';
    
    tagContainer.find('a').each((i, elem) => {
      debug_tags_count++; // 발견한 링크(a) 개수 카운트
      const tagText = $(elem).text().trim().replace('#', '');
      if (tagText) {
          tags.push(tagText);
      }
    });
    
    // [v2.3] 최종 분석 결과와 함께 '블랙박스(디버깅)' 기록을 반환!
    return {
      statusCode: 200,
      body: JSON.stringify({
        productName,
        attributes,
        tags,
        debug: {
          attributes_html: debug_attributes_html,
          attributes_count: debug_attributes_count,
          tags_html: debug_tags_html,
          tags_count: debug_tags_count,
        }
      }),
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
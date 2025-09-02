// [v2.4] 'X-RAY 투시' 버전
// 관련 태그 탐지 방식을 meta[name="keywords"] 태그를 직접 분석하는 'X-RAY' 스킬로 업그레이드!
// 더 이상 눈에 보이는 HTML 구조에만 의존하지 않는다!
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
    
    // [v2.3] CSI 수사 기록을 위한 블랙박스 변수 (v2.4에서도 유지)
    let debug_attributes_html = 'N/A';
    let debug_attributes_count = 0;
    let debug_tags_html = 'N/A';
    let debug_tags_count = 0;

    // 상품명 추출 (기존 v2.2 방식 유지 - 가장 안정적)
    productName = $('meta[property="og:title"]').attr('content') || '상품명을 찾을 수 없습니다.';
    if (productName.includes(':')) {
        productName = productName.split(':')[0].trim();
    }

    // [v2.3] 상품 속성 '핀셋 수술' 로직 (v2.4에서도 유지)
    const attributeTable = $('div.detail_attributes table.RCLS1uAn0a');
    debug_attributes_html = attributeTable.parent().html() || '속성 테이블 영역을 찾지 못했습니다.';

    attributeTable.find('tbody tr').each((i, tr_elem) => {
      debug_attributes_count++; // 발견한 줄(tr) 개수 카운트
      const cells = $(tr_elem).children('th, td'); // th와 td를 순서대로 모두 가져옴
      for (let i = 0; i < cells.length; i += 2) {
        const key = $(cells[i]).text().trim();
        const value = $(cells[i + 1]).text().trim();
        if (key && value) {
          attributes.push({ key, value });
        }
      }
    });

    // [v2.4] ★★★★★ 관련 태그 'X-RAY 투시' 로직 ★★★★★
    // 눈에 보이지 않는 meta[name="keywords"] 태그의 content를 직접 분석!
    const keywordsMeta = $('meta[name="keywords"]');
    const keywordsContent = keywordsMeta.attr('content');
    
    // 디버깅을 위해 meta 태그 자체를 기록
    debug_tags_html = keywordsMeta.parent().html().match(/<meta name="keywords"[^>]*>/)?.[0] || 'keywords meta 태그를 찾지 못했습니다.';

    if (keywordsContent) {
      // content를 쉼표(,)로 분리하여 배열로 만들고, 각 태그의 양쪽 공백을 제거합니다.
      const keywordArray = keywordsContent.split(',').map(tag => tag.trim()).filter(tag => tag); // 비어있는 태그는 제거
      tags.push(...keywordArray);
      debug_tags_count = keywordArray.length; // 발견한 태그 개수 카운트
    } else {
      // meta 태그가 없는 경우를 대비
      debug_tags_count = 0;
    }
    
    // [v2.4] 최종 분석 결과와 함께 '블랙박스(디버깅)' 기록을 반환!
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
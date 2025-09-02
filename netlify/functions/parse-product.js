// [v2.5] '상품 페이지 분석 전문의' (이름 변경)
// 기존 fetch-info.js의 역할을 명확히 하기 위해 파일 이름 변경.
// 기능은 v2.4와 동일하며, 단일 상품 페이지만을 정밀 분석합니다.
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
    
    let debug_attributes_html = 'N/A';
    let debug_attributes_count = 0;
    let debug_tags_html = 'N/A';
    let debug_tags_count = 0;

    productName = $('meta[property="og:title"]').attr('content') || '상품명을 찾을 수 없습니다.';
    if (productName.includes(':')) {
        productName = productName.split(':')[0].trim();
    }

    const attributeTable = $('div.detail_attributes table.RCLS1uAn0a');
    debug_attributes_html = attributeTable.parent().html() || '속성 테이블 영역을 찾지 못했습니다.';

    attributeTable.find('tbody tr').each((i, tr_elem) => {
      debug_attributes_count++;
      const cells = $(tr_elem).children('th, td');
      for (let i = 0; i < cells.length; i += 2) {
        const key = $(cells[i]).text().trim();
        const value = $(cells[i + 1]).text().trim();
        if (key && value) {
          attributes.push({ key, value });
        }
      }
    });

    const keywordsMeta = $('meta[name="keywords"]');
    const keywordsContent = keywordsMeta.attr('content');
    
    debug_tags_html = keywordsMeta.parent().html().match(/<meta name="keywords"[^>]*>/)?.[0] || 'keywords meta 태그를 찾지 못했습니다.';

    if (keywordsContent) {
      const keywordArray = keywordsContent.split(',').map(tag => tag.trim()).filter(tag => tag);
      tags.push(...keywordArray);
      debug_tags_count = keywordArray.length;
    } else {
      debug_tags_count = 0;
    }
    
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
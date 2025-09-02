// [v3.0] '상품 페이지 분석 전문의' (원격 진료 기능 추가!)
// 이제 HTML을 직접 받지 않고, 상품 URL만 받아서 직접 왕진(axios.get)을 간다!
// 네이버 경비팀을 통과하기 위해 '정식 방문증'(User-Agent)을 발급받아 요청!
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  try {
    if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: '분석할 URL이 없습니다.' }) };
    }

    // 이제 html 대신 url을 받습니다.
    const { url } = JSON.parse(event.body);

    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: '전달된 URL 데이터가 비어있습니다.' }) };
    }

    // --- 핵심 업그레이드: 직접 URL을 fetch 합니다! ---
    // '방문객 신분증' (User-Agent)을 장착해서, 봇으로 인식되지 않도록 위장합니다.
    const { data: html } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    // ---------------------------------------------

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
    console.error('URL Fetch/Parsing Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '상품 페이지를 가져와 분석하는 중에 에러가 발생했습니다.',
        details: error.message,
      }),
    };
  }
};
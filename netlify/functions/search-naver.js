// [v1.0] '네이버 쇼핑 역학조사관'
// 키워드를 받아 네이버 쇼핑 1페이지를 스캔하고, 상품 목록을 반환하는 전문 함수!
// axios와 cheerio를 사용하여 외부 페이지를 가져와 분석합니다.
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { keyword } = JSON.parse(event.body);
        if (!keyword) {
            return { statusCode: 400, body: JSON.stringify({ error: '검색할 키워드가 없습니다.' }) };
        }

        const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`;

        // 실제 브라우저처럼 보이게 하기 위한 User-Agent 설정
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // 네이버 쇼핑의 상품 리스트 아이템 선택자 (클래스 이름은 변경될 수 있으므로, 시작하는 값으로 검색)
        $('div[class^="product_item_"]').each((i, el) => {
            const productElement = $(el);
            
            // 광고 상품은 제외하는 로직 추가 (ad 클래스를 포함하는 경우가 많음)
            if (productElement.find('[class*="ad"]').length > 0) {
                return; // continue
            }

            const title = productElement.find('a[class*="product_link"]').attr('title');
            const link = productElement.find('a[class*="product_link"]').attr('href');
            const imageUrl = productElement.find('img[class*="thumbnail_thumb"]').attr('src');
            const price = productElement.find('span[class*="price_num"]').text();

            if (title && link && imageUrl && price) {
                products.push({
                    title,
                    link,
                    imageUrl,
                    price,
                });
            }
        });

        // 1페이지의 상품만 가져오도록 최대 40개로 제한
        const results = products.slice(0, 40);

        return {
            statusCode: 200,
            body: JSON.stringify({ results }),
        };

    } catch (error) {
        console.error('Naver Shopping Search Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: '네이버 쇼핑 페이지를 분석하는 중에 에러가 발생했습니다.',
                details: error.message,
            }),
        };
    }
};
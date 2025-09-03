const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 단일 키워드에 대한 순위를 찾는 헬퍼 함수
 * @param {object} keywordData - { keyword: string, searchVolume: number }
 * @param {string} productName - 검색할 상품명
 * @param {string} storeName - 검색할 스토어명 (선택)
 * @returns {Promise<object>} - { ...keywordData, rank: string }
 */
async function getRankForKeyword(keywordData, productName, storeName) {
    const { keyword } = keywordData;
    let rank = 'N/A';
    let found = false;

    // 최대 5페이지까지 검색
    for (let page = 1; page <= 5 && !found; page++) {
        try {
            const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}&pagingIndex=${page}&sort=rel&frm=NVSHPAG`;
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            
            // 네이버 쇼핑의 상품 리스트 아이템 클래스는 동적으로 변할 수 있어, 공통적인 부분을 선택자로 사용
            const productItems = $('[class^="product_item_"]').toArray();

            for (let i = 0; i < productItems.length; i++) {
                const el = productItems[i];
                const itemProductName = $(el).find('[class^="product_title"]').text().trim();
                const itemStoreName = $(el).find('[class^="product_mall_title"]').text().trim();

                // 상품명은 포함되는지 확인하고, 스토어명은 있을 경우에만 확인
                if (itemProductName.includes(productName) && (!storeName || itemStoreName.includes(storeName))) {
                    rank = `${page}페이지 ${i + 1}위`;
                    found = true;
                    break; 
                }
            }
        } catch (e) {
            console.error(`Error fetching page ${page} for keyword "${keyword}":`, e.message);
            // 한 페이지에서 에러가 나더라도 다음 페이지나 다음 키워드로 계속 진행
        }
    }
    return { ...keywordData, rank };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { keywords, productName, storeName } = JSON.parse(event.body);
        if (!keywords || !productName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Keywords and productName are required.' }) };
        }

        // 각 키워드에 대한 순위 확인 작업을 프로미스 배열로 생성
        const rankingPromises = keywords.map(keywordData => 
            getRankForKeyword(keywordData, productName, storeName)
        );

        // 모든 프로미스를 병렬로 실행하고 결과가 모두 돌아올 때까지 기다림
        const rankingResults = await Promise.all(rankingPromises);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ results: rankingResults }),
        };

    } catch (error) {
        console.error('Ranking check function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while checking rankings.' }),
        };
    }
};
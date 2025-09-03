const axios = require('axios');

const API_BASE_URL = 'https://openapi.naver.com/v1/search/shop.json';

// 단일 키워드 순위 확인 함수 (에러 핸들링 강화)
async function findRankForKeyword(keyword, productName, storeName, clientId, clientSecret) {
    let rank = '1000위 초과';
    let found = false;
    const display = 100;

    console.log(`[Rank Check START] Keyword: "${keyword}"`);

    for (let start = 1; start <= 1000 && !found; start += display) {
        try {
            const response = await axios.get(API_BASE_URL, {
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                },
                params: {
                    query: keyword,
                    display: display,
                    start: start,
                    sort: 'sim'
                },
                timeout: 5000 // 5초 타임아웃 설정
            });

            if (response.data && response.data.items) {
                for (let i = 0; i < response.data.items.length; i++) {
                    const item = response.data.items[i];
                    const itemTitle = item.title.replace(/<[^>]*>?/gm, '').trim();
                    
                    if (itemTitle.includes(productName) && (!storeName || item.mallName.includes(storeName))) {
                        rank = `${start + i}위`;
                        found = true;
                        break;
                    }
                }
            } else {
                 console.log(`[Rank Check WARN] Keyword: "${keyword}", No items found at start: ${start}`);
                 break;
            }
        } catch (e) {
            console.error(`[Rank Check ERROR] Keyword: "${keyword}", Start: ${start}, Status: ${e.response?.status}, Message: ${e.message}`);
            rank = `API ${e.response?.status || '오류'}`;
            break; 
        }
    }
    
    console.log(`[Rank Check END] Keyword: "${keyword}", Result: ${rank}`);
    return rank;
}


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        console.error("Server configuration error: Naver API credentials not set.");
        return { statusCode: 500, body: JSON.stringify({ error: '네이버 API 키가 서버에 설정되지 않았습니다.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        
        // mode 파라미터로 '랭킹 추적'과 '시장 분석'을 구분
        if (body.mode === 'rankCheck') {
            const { keyword, productName, storeName } = body;
            if (!keyword || !productName) {
                return { statusCode: 400, body: JSON.stringify({ error: '키워드와 상품명은 필수입니다.' }) };
            }
            
            const rank = await findRankForKeyword(keyword.keyword, productName, storeName, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET);
            
            return { statusCode: 200, body: JSON.stringify({ result: { ...keyword, rank } }) };

        } else { // 기본 '시장 분석' 모드
            const { keyword } = body;
             if (!keyword) {
                return { statusCode: 400, body: JSON.stringify({ error: '키워드는 필수입니다.' }) };
            }
            const response = await axios.get(API_BASE_URL, {
                headers: {
                    'X-Naver-Client-Id': NAVER_CLIENT_ID,
                    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
                },
                params: { 
                    query: keyword, 
                    display: 40, 
                    sort: 'sim'
                },
            });
            
            const results = response.data.items.map(item => ({
                title: item.title.replace(/<[^>]*>?/gm, ''),
                link: item.link,
                imageUrl: item.image,
                price: Number(item.lprice).toLocaleString(),
            }));
            return { statusCode: 200, body: JSON.stringify({ results }) };
        }

    } catch (error) {
        console.error('[Function CRASH]', error);
        return { statusCode: 500, body: JSON.stringify({ error: '서버 내부 오류가 발생했습니다.', details: error.toString() }) };
    }
};
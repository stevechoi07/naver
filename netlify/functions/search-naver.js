const axios = require('axios');

// API 요청을 위한 기본 설정
const API_BASE_URL = 'https://openapi.naver.com/v1/search/shop.json';

// 단일 키워드에 대한 순위를 찾는 헬퍼 함수
async function findRankForKeyword(keyword, productName, storeName, clientId, clientSecret) {
    let rank = '1000위 초과';
    let found = false;
    const display = 100; // API는 한번에 최대 100개까지 호출 가능

    // API는 최대 1000위까지 조회가 가능 (start=1, 101, 201, ..., 901)
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
                    sort: 'rel' // 정확도순으로 검색
                },
            });

            if (response.data && response.data.items) {
                for (let i = 0; i < response.data.items.length; i++) {
                    const item = response.data.items[i];
                    // HTML 태그 제거 및 상품명 비교
                    const itemTitle = item.title.replace(/<[^>]*>?/gm, '').trim();
                    
                    if (itemTitle.includes(productName) && (!storeName || item.mallName.includes(storeName))) {
                        rank = `${start + i}위`;
                        found = true;
                        break;
                    }
                }
            } else {
                break;
            }
        } catch (e) {
            console.error(`Error fetching API for keyword "${keyword}" at start ${start}:`, e.message);
            rank = 'API 오류';
            break;
        }
    }
    return rank;
}


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        return { statusCode: 500, body: JSON.stringify({ error: '네이버 API 키가 서버에 설정되지 않았습니다.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        
        // mode 파라미터로 '랭킹 추적'과 '시장 분석'을 구분
        if (body.mode === 'rankCheck') {
            const { keywords, productName, storeName } = body;
            if (!keywords || !productName) {
                return { statusCode: 400, body: JSON.stringify({ error: '키워드와 상품명은 필수입니다.' }) };
            }

            const rankingPromises = keywords.map(keywordData =>
                findRankForKeyword(keywordData.keyword, productName, storeName, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)
                    .then(rank => ({ ...keywordData, rank }))
            );
            
            const results = await Promise.all(rankingPromises);
            return { statusCode: 200, body: JSON.stringify({ results }) };

        } else { // 기본값은 '시장 분석' 모드
            const { keyword } = body;
            if (!keyword) {
                return { statusCode: 400, body: JSON.stringify({ error: '키워드는 필수입니다.' }) };
            }

            const response = await axios.get(API_BASE_URL, {
                headers: {
                    'X-Naver-Client-Id': NAVER_CLIENT_ID,
                    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
                },
                params: { query: keyword, display: 40, sort: 'rel' },
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
        console.error('Function Error:', error.message);
        return { statusCode: 500, body: JSON.stringify({ error: '서버 내부 오류가 발생했습니다.' }) };
    }
};
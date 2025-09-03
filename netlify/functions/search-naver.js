const axios = require('axios');

const API_BASE_URL = 'https://openapi.naver.com/v1/search/shop.json';

// 단일 키워드 순위 확인 함수 (디버깅 데이터 추가)
async function findRankForKeyword(keyword, productName, storeName, clientId, clientSecret) {
    let rank = '1000위 초과';
    let found = false;
    const display = 100;
    let debugData = []; // 실패 시 원인 파악을 위한 디버그 데이터

    console.log(`[Rank Check START] Keyword: "${keyword}"`);

    for (let start = 1; start <= 1000 && !found; start += display) {
        try {
            const response = await axios.get(API_BASE_URL, {
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                },
                params: { query: keyword, display: display, start: start, sort: 'sim' },
                timeout: 5000
            });

            if (response.data && response.data.items) {
                // 첫 페이지의 경우, 디버깅을 위해 상위 5개 아이템 정보를 저장
                if (start === 1 && response.data.items.length > 0) {
                    debugData = response.data.items.slice(0, 5).map(item => ({
                        title: item.title.replace(/<[^>]*>?/gm, '').trim(),
                        mallName: item.mallName
                    }));
                }

                for (let i = 0; i < response.data.items.length; i++) {
                    const item = response.data.items[i];
                    const itemTitle = item.title.replace(/<[^>]*>?/gm, '').trim();
                    
                    if (itemTitle.includes(productName) && (!storeName || item.mallName.includes(storeName))) {
                        rank = `${start + i}위`;
                        found = true;
                        debugData = []; // 성공했으므로 디버그 데이터 필요 없음
                        break;
                    }
                }
            } else {
                 break;
            }
             await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            console.error(`[Rank Check ERROR] Keyword: "${keyword}", Start: ${start}, Status: ${e.response?.status}, Message: ${e.message}`);
            rank = `API ${e.response?.status || '오류'}`;
            break; 
        }
    }
    
    console.log(`[Rank Check END] Keyword: "${keyword}", Result: ${rank}`);
    // 순위를 찾았으면 debugData는 빈 배열, 못 찾았으면 수집된 데이터가 담김
    return { rank, debugData };
}


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        return { statusCode: 500, body: JSON.stringify({ error: '네이버 API 키가 서버에 설정되지 않았습니다.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        
        if (body.mode === 'rankCheck') {
            const { keyword, productName, storeName } = body;
            if (!keyword || !productName) {
                return { statusCode: 400, body: JSON.stringify({ error: '키워드와 상품명은 필수입니다.' }) };
            }
            
            const { rank, debugData } = await findRankForKeyword(keyword.keyword, productName, storeName, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET);
            
            // 최종 결과에 debugData 포함하여 반환
            return { statusCode: 200, body: JSON.stringify({ result: { ...keyword, rank, debugData } }) };

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
        return { statusCode: 500, body: JSON.stringify({ error: '서버 내부 오류가 발생했습니다.', details: error.message }) };
    }
};
// [v1.1] '네이버 쇼핑 역학조사관' (API 업그레이드)
// 기존의 불안정한 HTML 스크래핑 방식에서, Netlify 환경변수에 저장된
// NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 사용하는 공식 API 방식으로 변경!
// 이제 더 이상 쫓겨날 일 없다!
const axios = require('axios');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { keyword } = JSON.parse(event.body);
        if (!keyword) {
            return { statusCode: 400, body: JSON.stringify({ error: '검색할 키워드가 없습니다.' }) };
        }

        // Netlify에 저장된 환경 변수(API 키)를 가져옵니다.
        const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
        const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: '네이버 API 인증 정보가 서버에 설정되지 않았습니다. Netlify 환경변수를 확인해주세요.' })
            };
        }

        const apiUrl = 'https://openapi.naver.com/v1/search/shop.json';

        const { data } = await axios.get(apiUrl, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
            params: {
                query: keyword,
                display: 40, // 1페이지에 해당하는 최대 40개의 결과를 가져옵니다.
                sort: 'sim' // 관련도 순으로 정렬
            }
        });

        // API 응답(data.items)을 프론트엔드가 사용하는 형식으로 변환합니다.
        const results = data.items.map(item => ({
            title: item.title.replace(/<[^>]*>?/gm, ''), // 제목에서 HTML 태그 제거
            link: item.link,
            imageUrl: item.image,
            price: parseInt(item.lprice).toLocaleString('ko-KR') // 가격에 콤마 추가
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ results }),
        };

    } catch (error) {
        console.error('Naver API Error:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({
                error: '네이버 쇼핑 API를 호출하는 중에 에러가 발생했습니다.',
                details: error.response ? error.response.data : error.message
            }),
        };
    }
};

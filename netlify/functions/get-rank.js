// -----------------------------------------------------------------------------
// 🕵️‍♂️ 네이버 순위 탐정 조종기 - Netlify 서버 함수 v1.5 (get-rank.js)
// 역할: 사용자 API 키 또는 서버 기본 키를 사용하여 순위를 조회하는 '하이브리드 주방장'
// -----------------------------------------------------------------------------

const axios = require('axios');

const NAVER_API_URL = 'https://openapi.naver.com/v1/search/shop.json';

exports.handler = async function(event, context) {
    // 1. 프론트엔드에서 사용자 키를 보냈는지 확인하고, 없으면 서버 기본 키를 사용합니다.
    const { keyword, product, store, clientId, clientSecret } = event.queryStringParameters;

    // 사용자 키가 있으면 그걸 쓰고(userClientId), 없으면 서버에 저장된 키(process.env...)를 사용
    const finalClientId = clientId || process.env.NAVER_CLIENT_ID;
    const finalClientSecret = clientSecret || process.env.NAVER_CLIENT_SECRET;

    // 최종적으로 사용할 키가 아무것도 없으면 에러!
    if (!finalClientId || !finalClientSecret) {
        console.error('사용할 네이버 API 키가 없습니다.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '서버 또는 사용자의 API 키가 설정되지 않았습니다.' }),
        };
    }

    if (!keyword || !product) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '키워드와 상품명은 필수입니다.' }),
        };
    }

    try {
        const display = 100;
        for (let start = 1; start <= 1000; start += display) {
            const response = await axios.get(NAVER_API_URL, {
                headers: {
                    // 최종적으로 결정된 API 키를 헤더에 담아 보냅니다.
                    'X-Naver-Client-Id': finalClientId,
                    'X-Naver-Client-Secret': finalClientSecret,
                },
                params: {
                    query: keyword,
                    display: display,
                    start: start,
                    sort: 'sim'
                }
            });

            const items = response.data.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const productName = item.title.replace(/<[^>]*>?/gm, '').trim();
                    const storeName = item.mallName.trim();

                    let productMatch = productName.includes(product);
                    let storeMatch = store ? storeName.includes(store) : true;

                    if (productMatch && storeMatch) {
                        const rank = start + i;
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ rank: rank }),
                        };
                    }
                }
            } else {
                break;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ rank: -1 }),
        };

    } catch (error) {
        console.error('네이버 API 호출 에러:', error.response ? error.response.data : error.message);
        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({ error: '순위 조회 중 API 서버에서 에러가 발생했습니다.' }),
        };
    }
};
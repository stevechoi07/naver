// /netlify/functions/analyze.js (v2.0)

// API 요청을 보내기 위한 'axios' 라이브러리를 불러옵니다.
const axios = require('axios');

exports.handler = async function(event, context) {
    // 1. Netlify 비밀 금고에서 API 키를 꺼냅니다.
    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;

    // 2. 손님이 요청한 키워드를 확인합니다.
    const keyword = event.queryStringParameters.keyword;

    // 키워드가 없으면 에러 메시지를 보냅니다.
    if (!keyword) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "에러: 키워드를 입력해 주세요." })
        };
    }

    // 3. 네이버 쇼핑 API에 요청을 보냅니다.
    const url = "https://openapi.naver.com/v1/search/shop.json";
    
    // 요청 헤더에 우리 신분증(API 키)을 넣습니다.
    const headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    };
    
    // 검색어, 한번에 100개 표시 등의 조건을 설정합니다.
    const params = {
        query: keyword,
        display: 100
    };

    try {
        // 실제로 네이버에 요청을 보냅니다!
        const response = await axios.get(url, { params, headers });

        // 네이버가 보내준 데이터를 그대로 손님에게 전달합니다.
        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        // API 요청 중 에러가 발생하면, 에러 내용을 손님에게 알려줍니다.
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `API 요청 중 에러 발생: ${error.message}` })
        };
    }
};
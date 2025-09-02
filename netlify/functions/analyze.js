// /netlify/functions/analyze.js (v3.2 - 실제 선택자 적용 최종 버전)

const axios = require('axios');
const cheerio = require('cheerio');

// 개별 상품 페이지를 방문해서 '속성'과 '태그' 정보를 긁어오는 탐정 함수
async function scrapeData(url) {
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        
        // 1. '상품 속성' 긁어오기 (네가 찾아준 코드를 바탕으로!)
        const attributes = {};
        $('tbody tr').each((rowIndex, rowElement) => {
            const keys = [];
            $(rowElement).find('th').each((keyIndex, keyElement) => {
                keys.push($(keyElement).text().trim());
            });
            
            const values = [];
            $(rowElement).find('td').each((valueIndex, valueElement) => {
                values.push($(valueElement).text().trim());
            });

            keys.forEach((key, index) => {
                if (key && values[index]) {
                    attributes[key] = values[index];
                }
            });
        });

        // 2. '태그 정보' 긁어오기 (네가 찾아준 코드를 바탕으로!)
        const tags = [];
        $('ul.lq1wDHp4iu a').each((index, element) => {
            // '#' 문자를 제거해서 깔끔한 텍스트만 저장합니다.
            const tag = $(element).text().trim().replace('#', '');
            tags.push(tag);
        });

        // 3. 두 가지 정보를 모두 반환하기
        return { attributes, tags };

    } catch (error) {
        console.error(`Scraping error for ${url}:`, error.message);
        return { error: "속성 정보를 가져올 수 없습니다.", attributes: {}, tags: [] };
    }
}

exports.handler = async function(event, context) {
    // --- (이하 코드는 이전과 동일) ---
    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
    const keyword = event.queryStringParameters.keyword;

    if (!keyword) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "에러: 키워드를 입력해 주세요." })
        };
    }

    const url = "https://openapi.naver.com/v1/search/shop.json";
    const headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    };
    const params = {
        query: keyword,
        display: 10
    };

    try {
        const response = await axios.get(url, { params, headers });
        const items = response.data.items;

        const scrapingJobs = items.map(item => scrapeData(item.link));
        const scrapedDataArray = await Promise.all(scrapingJobs);

        const finalResults = items.map((item, index) => ({
            ...item,
            attributes: scrapedDataArray[index].attributes,
            tags: scrapedDataArray[index].tags
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(finalResults)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `API 요청 중 에러 발생: ${error.message}` })
        };
    }
};
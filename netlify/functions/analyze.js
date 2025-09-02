// /netlify/functions/analyze.js (v3.3 - 디버그 모드)

const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeData(url) {
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        
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

        const tags = [];
        $('ul.lq1wDHp4iu a').each((index, element) => {
            const tag = $(element).text().trim().replace('#', '');
            tags.push(tag);
        });

        return { attributes, tags };

    } catch (error) {
        // ✨ 실패했을 때, 에러 메시지를 함께 반환하도록 수정!
        return { 
            error: `스크래핑 실패: ${error.message}`, 
            attributes: {}, 
            tags: [] 
        };
    }
}

// 이하 handler 함수는 이전과 동일합니다.
exports.handler = async function(event, context) {
    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
    const keyword = event.queryStringParameters.keyword;

    if (!keyword) { return { statusCode: 400, body: JSON.stringify({ message: "에러: 키워드를 입력해 주세요." }) }; }

    const url = "https://openapi.naver.com/v1/search/shop.json";
    const headers = { "X-Naver-Client-Id": NAVER_CLIENT_ID, "X-Naver-Client-Secret": NAVER_CLIENT_SECRET };
    const params = { query: keyword, display: 10 };

    try {
        const response = await axios.get(url, { params, headers });
        const items = response.data.items;

        const scrapingJobs = items.map(item => scrapeData(item.link));
        const scrapedDataArray = await Promise.all(scrapingJobs);

        const finalResults = items.map((item, index) => ({
            ...item,
            ...scrapedDataArray[index] // error, attributes, tags를 모두 합쳐줍니다.
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
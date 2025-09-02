// /netlify/functions/analyze.js (v3.3 - 순차적 요청으로 변경)

const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeData(url) {
    try {
        // ✨ 일반 브라우저인 척 위장하기 위한 헤더 추가!
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        const { data: html } = await axios.get(url, { headers });
        const $ = cheerio.load(html);
        
        const attributes = {};
        $('tbody tr').each((rowIndex, rowElement) => {
            const keys = [];
            $(rowElement).find('th').each((keyIndex, keyElement) => { keys.push($(keyElement).text().trim()); });
            const values = [];
            $(rowElement).find('td').each((valueIndex, valueElement) => { values.push($(valueElement).text().trim()); });
            keys.forEach((key, index) => { if (key && values[index]) { attributes[key] = values[index]; } });
        });

        const tags = [];
        $('ul.lq1wDHp4iu a').each((index, element) => {
            const tag = $(element).text().trim().replace('#', '');
            tags.push(tag);
        });

        return { attributes, tags };
    } catch (error) {
        return { error: `스크래핑 실패: ${error.message}`, attributes: {}, tags: [] };
    }
}

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

        // ✨ Promise.all 대신, 한 번에 하나씩 순서대로 요청하는 'for...of' 반복문으로 변경!
        const finalResults = [];
        for (const item of items) {
            const scrapedData = await scrapeData(item.link);
            finalResults.push({
                ...item,
                ...scrapedData
            });
        }

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
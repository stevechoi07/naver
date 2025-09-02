// /netlify/functions/analyze.js (v3.1 - meta 태그 스크래핑 추가)

const axios = require('axios');
const cheerio = require('cheerio');

// 개별 상품 페이지를 방문해서 '속성'과 '태그' 정보를 긁어오는 탐정 함수
async function scrapeAttributes(url) {
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        
        const attributes = {};
        // 1. 기존 '상품 속성' 긁어오기 (테이블)
        $('div[class^="product_attribute"] table tbody tr').each((index, element) => {
            const key = $(element).find('th').text().trim();
            const value = $(element).find('td').text().trim();
            if (key && value) {
                attributes[key] = value;
            }
        });

        // ✨ ----- 2. '키워드 태그' 긁어오기 (meta 태그) ----- ✨
        let tags = [];
        // 'keywords'라는 이름(name)을 가진 meta 태그를 찾습니다.
        const keywordsContent = $('meta[name="keywords"]').attr('content');
        
        if (keywordsContent) {
            // 쉼표(,)를 기준으로 잘라서 배열로 만듭니다.
            tags = keywordsContent.split(',').map(tag => tag.trim());
        }

        // 3. 두 가지 정보를 모두 반환하기
        return { attributes, tags };

    } catch (error) {
        console.error(`Scraping error for ${url}:`, error.message);
        return { error: "속성 정보를 가져올 수 없습니다.", attributes: {}, tags: [] };
    }
}

exports.handler = async function(event, context) {
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

        const scrapingJobs = items.map(item => scrapeAttributes(item.link));
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
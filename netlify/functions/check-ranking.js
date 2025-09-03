const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { keywords, productName, storeName } = JSON.parse(event.body);
        if (!keywords || !productName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Keywords and productName are required.' }) };
        }

        const rankingResults = [];

        for (const keywordData of keywords) {
            const { keyword } = keywordData;
            let rank = 'N/A';
            let found = false;
            
            // Search up to 5 pages
            for (let page = 1; page <= 5 && !found; page++) {
                const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}&pagingIndex=${page}&sort=rel&frm=NVSHPAG`;
                
                const response = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                const $ = cheerio.load(response.data);
                
                const productItems = $('[class^="product_item_"]').toArray();

                for (let i = 0; i < productItems.length; i++) {
                    const el = productItems[i];
                    const itemProductName = $(el).find('[class^="product_title"]').text().trim();
                    const itemStoreName = $(el).find('[class^="product_mall_title"]').text().trim();

                    // Check if the product title matches and if the store name matches (if provided)
                    if (itemProductName.includes(productName) && (!storeName || itemStoreName.includes(storeName))) {
                        rank = `${page}페이지 ${i + 1}위`;
                        found = true;
                        break;
                    }
                }
                 // Add a small delay between page requests to avoid being blocked
                if(!found) await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            rankingResults.push({ ...keywordData, rank });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ results: rankingResults }),
        };

    } catch (error) {
        console.error('Ranking check error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while checking rankings.' }),
        };
    }
};
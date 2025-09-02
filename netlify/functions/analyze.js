// /netlify/functions/analyze.js (v3.4 - Final Version)

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes a single product page for its attributes and tags.
 * @param {string} url - The URL of the product page to scrape.
 * @returns {Promise<object>} - An object containing the scraped attributes and tags.
 */
async function scrapeData(url) {
    try {
        // Add a User-Agent header to mimic a real browser request.
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        const { data: html } = await axios.get(url, { headers });
        const $ = cheerio.load(html);
        
        // 1. Scrape product attributes from the table.
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

        // 2. Scrape tags from the visible tag list.
        const tags = [];
        $('ul.lq1wDHp4iu a').each((index, element) => {
            // Remove the '#' symbol for cleaner data.
            const tag = $(element).text().trim().replace('#', '');
            tags.push(tag);
        });

        // 3. Return both sets of scraped data.
        return { attributes, tags };

    } catch (error) {
        // If scraping fails, return an error message.
        return { 
            error: `Scraping failed: ${error.message}`, 
            attributes: {}, 
            tags: [] 
        };
    }
}

/**
 * The main Netlify serverless function handler.
 */
exports.handler = async function(event, context) {
    // Get secrets from environment variables.
    const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
    // Get keyword from the URL query.
    const keyword = event.queryStringParameters.keyword;

    if (!keyword) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ message: "Error: Please provide a keyword." }) 
        };
    }

    const url = "https://openapi.naver.com/v1/search/shop.json";
    const headers = { 
        "X-Naver-Client-Id": NAVER_CLIENT_ID, 
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET 
    };
    const params = { 
        query: keyword, 
        display: 5 // Fetch 5 items to stay under the 10-second timeout.
    };

    try {
        // Call Naver's API to get the product list.
        const response = await axios.get(url, { params, headers });
        const items = response.data.items;

        // Scrape each product page one-by-one to avoid being blocked.
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
            body: JSON.stringify({ message: `API request error: ${error.message}` })
        };
    }
};
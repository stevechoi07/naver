// v4.0: 키워드 DNA 분석 기능 추가
const cheerio = require('cheerio');
const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { html, url, keywordsToAnalyze } = JSON.parse(event.body);
        let content = html;

        if (url) {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            content = response.data;
        }

        if (!content) {
            return { statusCode: 400, body: JSON.stringify({ error: '분석할 HTML 데이터가 비어있습니다.' }) };
        }

        const $ = cheerio.load(content);

        // --- 1. 상품명 추출 ---
        const titleSelectors = [
            'h3.DCVBehA8ZB',
            'h3[class*="product_title"]',
            'h3[class*="Name_name"]',
            '.zz_S_product_name_on',
            'meta[property="og:title"]'
        ];
        let productName = '';
        for (const selector of titleSelectors) {
            if (selector === 'meta[property="og:title"]') {
                productName = $(selector).attr('content');
            } else {
                productName = $(selector).text().trim();
            }
            if (productName) break;
        }

        // --- 2. 상품 속성 추출 ---
        const attributes = [];
        const attributeSelectors = [
            'div.detail_attributes table tbody tr',
            'div[class*="attribute_wrapper"] table tbody tr',
            'div[class*="product_info_table"] table tbody tr'
        ];

        let selectedAttrSelector = '';
        for (const selector of attributeSelectors) {
            if ($(selector).length) {
                selectedAttrSelector = selector;
                break;
            }
        }
        
        let attributes_html = 'N/A';
        if (selectedAttrSelector) {
            attributes_html = $(selectedAttrSelector).parent().html() || '<tbody> not found';
            $(selectedAttrSelector).each((i, el) => {
                const ths = $(el).find('th');
                const tds = $(el).find('td');
                for (let j = 0; j < ths.length; j++) {
                    const key = $(ths[j]).text().trim();
                    const value = $(tds[j]).text().trim();
                    if (key && value) {
                        attributes.push({ key, value });
                    }
                }
            });
        }
        
        // --- 3. 관련 태그 추출 ---
        const tags = [];
        const tagContainerSelectors = [
            'div.NAR95xKIue', 
            'div[class*="TagGroup_group"]', 
            'div[class*="tag_list_box"]'
        ];
        
        let selectedTagContainer = null;
        for (const selector of tagContainerSelectors) {
            if ($(selector).length) {
                selectedTagContainer = $(selector);
                break;
            }
        }

        let tags_html = 'N/A';
        if (selectedTagContainer) {
            tags_html = selectedTagContainer.html();
            selectedTagContainer.find('a').each((i, el) => {
                const tag = $(el).text().replace(/#/g, '').trim();
                if (tag) tags.push(tag);
            });
        } else {
            const keywordsMeta = $('meta[name="keywords"]').attr('content');
            if (keywordsMeta) {
                tags_html = `<meta name="keywords" content="${keywordsMeta}">`;
                keywordsMeta.split(',').forEach(tag => {
                    if (tag.trim()) tags.push(tag.trim());
                });
            }
        }
        
        // --- 4. 키워드 DNA 분석 ---
        const keywordAnalysis = {};
        if (keywordsToAnalyze && Array.isArray(keywordsToAnalyze)) {
            const attributesText = attributes.map(a => `${a.key} ${a.value}`).join(' ');
            const tagsText = tags.join(' ');

            keywordsToAnalyze.forEach(keyword => {
                keywordAnalysis[keyword] = {
                    title: productName.includes(keyword) ? 1 : 0,
                    attributes: attributesText.includes(keyword) ? 1 : 0,
                    tags: tagsText.includes(keyword) ? 1 : 0,
                };
            });
        }


        return {
            statusCode: 200,
            body: JSON.stringify({
                productName,
                attributes,
                tags,
                keywordAnalysis,
                debug: {
                    attributes_count: $(selectedAttrSelector).length,
                    attributes_html,
                    tags_count: tags.length,
                    tags_html,
                }
            }),
        };
    } catch (error) {
        console.error('Error in parse-product function:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
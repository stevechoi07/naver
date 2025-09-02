// 이 파일은 Netlify 서버에서만 실행되는 비밀 요원(서버리스 함수)이야!
// v1.6에서는 '만능 마스터키'를 장착해서, 스마트스토어와 쇼핑 카탈로그 페이지를 모두 분석할 수 있게 됐지!

const axios = require('axios');
const cheerio = require('cheerio');

// [v1.4 수정] 더 안정적인 '투명 망토'로 교체!
const PROXY_URL = 'https://cors.sh/';

exports.handler = async (event, context) => {
  console.log('[요원] 출동! 임무 접수 완료. (v1.6)');
  const targetUrl = event.queryStringParameters.url;
  console.log(`[요원] 타겟 URL: ${targetUrl}`);

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL이 필요합니다.' }),
    };
  }

  try {
    const proxyRequestUrl = `${PROXY_URL}${targetUrl}`;
    console.log(`[요원] 프록시를 통해 다음 주소로 요청: ${proxyRequestUrl}`);
    
    // [v1.3 수정] 사람인 척 위장하기 위한 헤더 정보 강화
    const response = await axios.get(proxyRequestUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://shopping.naver.com/',
        // [v1.4 추가] cors.sh 사용 시 필요한 헤더
        'x-cors-api-key': 'temp_a31993215db81a9133748052cf07850a',
      },
      // Netlify의 기본 타임아웃(10초)보다 짧게 설정
      timeout: 9500 
    });

    const html = response.data;
    console.log('[요원] 잠입 성공! HTML 문서 확보 완료.');

    const $ = cheerio.load(html);

    let tags = [];
    let attributes = [];
    
    // [v1.6 추가] '만능 마스터키' 기능! URL 종류에 따라 다른 스캐너 작동
    if (targetUrl.includes('smartstore.naver.com')) {
      // --- 스마트스토어 페이지 스캐너 ---
      console.log('[요원] 스마트스토어 페이지로 판단, A-스캐너 작동!');
      
      // 관련 태그 추출 (두 가지 선택자 모두 시도)
      let keywords = $('meta[name="keywords"]').attr('content');
      if (!keywords) {
        keywords = $('meta[property="og:description"]').attr('content');
      }
      
      if(keywords) {
          tags = keywords.split(',').map(tag => tag.trim()).filter(tag => tag && tag.length > 1 && tag.length < 20);
      }
      
       $('.NAR95xKIue a, .bd_1uncc, .bd_3sPDC').each((i, elem) => {
          const tag = $(elem).text().replace('#', '').trim();
          if (tag && !tags.includes(tag)) {
              tags.push(tag);
          }
      });


      // 상품 속성 추출 (두 가지 선택자 모두 시도)
      $('div[class*="attribute_wrapper"] table tr, .m_PTftTaj7 table tr').each((i, elem) => {
          const name = $(elem).find('th').text().trim();
          const value = $(elem).find('td').text().trim();
          if(name && value) {
              attributes.push({ name, value });
          }
      });

    } else if (targetUrl.includes('search.shopping.naver.com/catalog')) {
      // --- 쇼핑 카탈로그 페이지 스캐너 ---
      console.log('[요원] 쇼핑 카탈로그 페이지로 판단, B-스캐너 작동!');
      
      // 관련 태그 추출
      $('a[class*="tag_link"]').each((i, elem) => {
        const tag = $(elem).text().trim();
        if(tag) {
            tags.push(tag.replace('#', ''));
        }
      });

      // 상품 속성 추출
      $('div[class*="productAttribute_"] table tbody tr').each((i, elem) => {
        const name = $(elem).find('th').text().trim();
        const value = $(elem).find('td').text().trim();
        if(name && value) {
            attributes.push({ name, value });
        }
      });
    } else {
        console.log('[요원] 지원하지 않는 페이지 타입입니다.');
    }

    console.log('[요원] 관련 태그 추출 완료:', tags);
    console.log('[요원] 상품 속성 추출 완료:', attributes);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes, tags }),
    };
  } catch (error) {
    console.error('[요원] 임무 최종 실패! 원인:', error);
    const status = error.response ? error.response.status : 500;
    let message = error.message;
    if (error.response && typeof error.response.data === 'string' && error.response.data.trim() !== '') {
        message = error.response.data;
    }
    
    return {
      statusCode: status,
      body: JSON.stringify({ error: `정보를 가져오는 데 실패했습니다: ${message}` }),
    };
  }
};
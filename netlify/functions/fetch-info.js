// 이 파일은 Netlify 서버에서만 실행되는 비밀 요원(서버리스 함수)이야!
// CORS 정책을 우회해서 지정된 URL의 HTML을 싹 긁어오는 임무를 수행하지.

// [필수] 이 함수를 실행하려면 axios와 cheerio 라이브러리가 필요해!
// 프로젝트 폴더에 package.json을 만들고 아래 내용을 넣은 다음,
// 터미널에서 `npm install` 명령어를 실행해서 설치해줘야 해. (자세한 건 README.md 참고!)
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  // 🔥 디버깅: 함수가 호출되었는지, 어떤 URL을 받았는지 Netlify 로그에서 확인!
  console.log('[요원] 출동! 임무 접수 완료.');
  const targetUrl = event.queryStringParameters.url;
  console.log(`[요원] 타겟 URL: ${targetUrl}`);

  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL이 필요합니다.' }),
    };
  }

  try {
    // 1. Axios를 사용해 타겟 URL의 HTML 페이지를 가져옴
    // 🔥 디버깅: 타겟 URL로 요청 보내기 직전
    console.log('[요원] 타겟 사이트로 잠입 시도...');
    const response = await axios.get(targetUrl, {
      headers: {
        // 실제 브라우저인 것처럼 위장! (가끔 이걸로 차단을 피할 수 있거든)
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    // 🔥 디버깅: HTML을 성공적으로 가져왔는지 확인
    console.log('[요원] 잠입 성공! HTML 문서 확보 완료.');

    // 2. Cheerio로 HTML을 분석할 수 있게 준비
    const $ = cheerio.load(html);

    // 3. 'keywords' 메타 태그에서 관련 태그 정보 추출
    const keywords = $('meta[name="keywords"]').attr('content');
    const tags = keywords ? keywords.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    // 🔥 디버깅: 추출된 태그 확인
    console.log('[요원] 관련 태그 추출 완료:', tags);
    
    // 4. 상품 속성 정보 테이블에서 정보 추출
    const attributes = [];
    $('div.detail_attributes table tr').each((i, elem) => {
      const th = $(elem).find('th');
      const td = $(elem).find('td');

      // th나 td가 여러 개일 경우를 대비해 첫 번째 요소의 텍스트만 가져옴
      if (th.length > 0 && td.length > 0) {
        const name = th.first().text().trim();
        const value = td.first().text().trim();
        if (name && value) {
          attributes.push({ name, value });
        }
      }
    });
    // 🔥 디버깅: 추출된 속성 정보 확인
     console.log('[요원] 상품 속성 추출 완료:', attributes);


    // 5. 추출한 정보를 JSON 형태로 예쁘게 포장해서 보고
    return {
      statusCode: 200,
      body: JSON.stringify({
        attributes,
        tags,
      }),
    };
  } catch (error) {
    // 🔥 디버깅: 에러 발생 시 Netlify 로그에서 확인
    console.error('[요원] 임무 실패! 원인:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `정보를 가져오는 데 실패했습니다: ${error.message}` }),
    };
  }
};
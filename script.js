// Netlify 함수의 주소입니다. Netlify에 배포하면 이 주소로 동작해요.
const FUNCTION_URL = '/.netlify/functions/search-naver';

// HTML 요소들을 가져옵니다.
const marketKeywordInput = document.getElementById('market-keyword');
const marketAnalysisBtn = document.getElementById('market-analysis-btn');

const rankKeywordInput = document.getElementById('rank-keyword');
const productNameInput = document.getElementById('product-name');
const storeNameInput = document.getElementById('store-name');
const rankCheckBtn = document.getElementById('rank-check-btn');

const loader = document.getElementById('loader');
const resultContent = document.getElementById('result-content');

// 로딩 화면을 보여주고/숨기는 함수
const showLoader = (show) => {
    loader.style.display = show ? 'block' : 'none';
};

// 결과를 화면에 표시하는 함수
const displayResult = (data) => {
    // 객체 형태의 데이터를 예쁘게 문자열로 변환해서 보여줍니다.
    resultContent.textContent = JSON.stringify(data, null, 2);
};

// '시장 분석 시작' 버튼 클릭 이벤트
marketAnalysisBtn.addEventListener('click', async () => {
    const keyword = marketKeywordInput.value.trim();
    if (!keyword) {
        alert('분석할 키워드를 입력해주세요!');
        return;
    }

    showLoader(true);
    resultContent.textContent = ''; // 이전 결과 초기화

    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: keyword }) // mode가 없으면 기본 모드로 동작
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
        }

        displayResult(data.results);

    } catch (error) {
        resultContent.textContent = `오류 발생: ${error.message}`;
    } finally {
        showLoader(false);
    }
});


// '내 순위 추적!' 버튼 클릭 이벤트
rankCheckBtn.addEventListener('click', async () => {
    const keyword = rankKeywordInput.value.trim();
    const productName = productNameInput.value.trim();
    const storeName = storeNameInput.value.trim();

    if (!keyword || !productName) {
        alert('키워드와 상품명은 필수 입력 항목입니다!');
        return;
    }
    
    showLoader(true);
    resultContent.textContent = ''; // 이전 결과 초기화

    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'rankCheck',
                // search-naver.js가 keyword 객체 안의 keyword를 사용하므로 이 구조를 따릅니다.
                keyword: { keyword: keyword, id: 1 }, 
                productName: productName,
                storeName: storeName
            })
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
        }

        displayResult(data.result);

    } catch (error) {
        resultContent.textContent = `오류 발생: ${error.message}`;
    } finally {
        showLoader(false);
    }
});
// script.js (v1.3 - 버그 수정)

// 1. 필요한 HTML 요소들을 미리 찾아놓습니다.
const keywordInput = document.getElementById('keyword-input');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingIndicator = document.getElementById('loading');
const resultsContainer = document.getElementById('results-container');

// 2. '분석 시작' 버튼을 클릭했을 때 일어날 일을 정의합니다.
analyzeBtn.addEventListener('click', async () => {
    const keyword = keywordInput.value;
    if (!keyword) {
        alert('키워드를 입력해 주세요!');
        return;
    }

    // 3. 로딩 화면을 보여주고, 이전 결과는 깨끗하게 지웁니다.
    loadingIndicator.style.display = 'block';
    resultsContainer.innerHTML = '';

    try {
        // 4. 우리 주방(Back-end)에 요리(분석)를 주문합니다!
        const response = await fetch(`/api/analyze?keyword=${keyword}`);
        const results = await response.json();

        // 5. 요리가 도착하면 화면에 예쁘게 차려줍니다.
        displayResults(results);

    } catch (error) {
        resultsContainer.innerHTML = `에러가 발생했습니다: ${error.message}`;
    } finally {
        // 6. 모든 과정이 끝나면 로딩 화면을 숨깁니다.
        loadingIndicator.style.display = 'none';
    }
});

// 받아온 데이터를 화면에 표시하는 함수
function displayResults(items) {
    if (!items || items.length === 0) {
        resultsContainer.innerHTML = '분석 결과가 없습니다.';
        return;
    }

    items.forEach(item => {
        const cleanTitle = item.title.replace(/<[^>]*>/g, '');
        
        let detailsHTML = '';
        // ✨ 만약 스크래핑 에러가 있다면, item.error를 확인하도록 수정!
        if (item.error) {
            detailsHTML = `<span style="color: red;">${item.error}</span>`;
        } else {
            // 에러가 없다면 속성과 태그를 정상적으로 표시합니다.
            let attrContent = '';
            for (const key in item.attributes) {
                attrContent += `<li><strong>${key}:</strong> ${item.attributes[key]}</li>`;
            }
            let attributesHTML = `<ul>${attrContent}</ul>`;

            let tagsContent = '';
            // item.tags가 존재하는지 확인
            if (item.tags && item.tags.length > 0) {
                item.tags.forEach(tag => {
                    tagsContent += `<span class="tag">#${tag}</span>`;
                });
            }
            let tagsHTML = `<div class="tags">${tagsContent}</div>`;
            
            detailsHTML = `
                <div><strong>속성:</strong> ${attributesHTML}</div>
                <div><strong>태그:</strong> ${tagsHTML}</div>
            `;
        }

        const itemHTML = `
            <div class="result-item">
                <a href="${item.link}" target="_blank">
                    <img src="${item.image}" alt="${cleanTitle}">
                </a>
                <div class="info">
                    <span class="title">${cleanTitle}</span>
                    <span class="mall">${item.mallName}</span>
                    <span class="price">${Number(item.lprice).toLocaleString()}원</span>
                    <hr>
                    ${detailsHTML}
                </div>
            </div>
        `;
        resultsContainer.innerHTML += itemHTML;
    });
}
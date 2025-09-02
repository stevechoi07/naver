// script.js (v1.2 - 디버그 모드)

// ... (파일 윗부분은 이전과 동일) ...

// 받아온 데이터를 화면에 표시하는 함수
function displayResults(items) {
    if (items.length === 0) {
        resultsContainer.innerHTML = '분석 결과가 없습니다.';
        return;
    }

    items.forEach(item => {
        const cleanTitle = item.title.replace(/<[^>]*>/g, '');
        
        let attributesHTML = '';
        // ✨ 만약 스크래핑 에러가 있다면, 에러 메시지를 보여줍니다.
        if (item.error) {
            attributesHTML = `<span style="color: red;">${item.error}</span>`;
        } else {
            // 에러가 없다면 속성과 태그를 정상적으로 표시합니다.
            let attrContent = '';
            for (const key in item.attributes) {
                attrContent += `<li><strong>${key}:</strong> ${item.attributes[key]}</li>`;
            }
            attributesHTML = `<ul>${attrContent}</ul>`;

            let tagsContent = '';
            item.tags.forEach(tag => {
                tagsContent += `<span class="tag">#${tag}</span>`;
            });
            attributesHTML += `<div class="tags">${tagsContent}</div>`;
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
                    <div>${attributesHTML}</div>
                </div>
            </div>
        `;
        resultsContainer.innerHTML += itemHTML;
    });
}
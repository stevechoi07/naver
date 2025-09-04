// -----------------------------------------------------------------------------
// 🕵️‍♂️ 네이버 순위 탐정 조종기 v1.1 - script.js
// -----------------------------------------------------------------------------

// --- DOM 요소 가져오기 ---
// 시장 분석 관련
const marketKeywordInput = document.getElementById('market-keyword');
const marketAnalysisBtn = document.getElementById('market-analysis-btn');

// 순위 추적 관련
const rankKeywordsTextarea = document.getElementById('rank-keywords');
const productNameInput = document.getElementById('product-name');
const storeNameInput = document.getElementById('store-name');
const rankCheckBtn = document.getElementById('rank-check-btn');

// 대시보드 관련
const rankChartCanvas = document.getElementById('rank-chart');
const updateDashboardBtn = document.getElementById('update-dashboard-btn');
const clearDataBtn = document.getElementById('clear-data-btn');

// 기타 UI 요소
const loader = document.getElementById('loader');
const resultContent = document.getElementById('result-content');
const debugLog = document.getElementById('debug-log');
const debugContainer = document.getElementById('debug-container');


// --- 전역 변수 ---
let myRankChart; // Chart.js 인스턴스를 저장할 변수


// -----------------------------------------------------------------------------
// --- 이벤트 리스너 설정 ---
// -----------------------------------------------------------------------------

// 페이지가 완전히 로드되면 대시보드를 한번 그려줍니다.
document.addEventListener('DOMContentLoaded', () => {
    logDebug("DOM 로드 완료. 대시보드 초기화를 시작합니다.");
    // debugContainer.style.display = 'block'; // 디버깅 필요시 주석 해제
    updateDashboard();
});

// '내 순위 추적 & 기록!' 버튼 클릭 이벤트
rankCheckBtn.addEventListener('click', handleRankCheck);

// '대시보드 업데이트' 버튼 클릭 이벤트
updateDashboardBtn.addEventListener('click', () => {
    logDebug("'대시보드 업데이트' 버튼 클릭됨.");
    updateDashboard();
});

// '기록 전체 삭제' 버튼 클릭 이벤트
clearDataBtn.addEventListener('click', handleClearData);


// -----------------------------------------------------------------------------
// --- 핵심 기능 함수 ---
// -----------------------------------------------------------------------------

/**
 * '내 순위 추적 & 기록!' 버튼 클릭 시 실행되는 메인 함수
 */
async function handleRankCheck() {
    const keywords = rankKeywordsTextarea.value.split('\n').filter(kw => kw.trim() !== '');
    const productName = productNameInput.value;
    const storeName = storeNameInput.value;

    logDebug(`순위 추적 시작. 상품명: ${productName}, 키워드 개수: ${keywords.length}`);

    if (keywords.length === 0 || !productName) {
        resultContent.innerHTML = `<p style="color: red;">🚨 키워드와 상품명은 필수 입력 항목입니다!</p>`;
        logDebug("필수 입력값 누락으로 작업 중단.");
        return;
    }

    loader.style.display = 'flex'; // 로딩 시작
    resultContent.innerHTML = ''; // 이전 결과 초기화
    
    let resultsHTML = '<h3>🔍 다중 키워드 순위 추적 결과</h3><ul>';
    let newRankData = [];

    for (const keyword of keywords) {
        logDebug(`'${keyword}' 키워드로 순위 조회 중...`);
        // 실제 Netlify 함수를 호출하는 부분입니다.
        // 지금은 임시로 랜덤 순위를 반환하는 가짜 함수를 사용합니다.
        const rank = await fetchRankFromNetlify(keyword, productName, storeName); 
        
        logDebug(`'${keyword}' 결과: ${rank}위`);
        
        if(rank > 0) {
            resultsHTML += `<li>'${keyword}': <strong>${rank}위</strong> 🎉</li>`;
            // 저장할 데이터 객체 생성
            const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' 형식
            newRankData.push({ date: today, keyword: keyword.trim(), rank: rank });
        } else {
            resultsHTML += `<li>'${keyword}': <strong>순위권(10페이지) 밖</strong> 😭</li>`;
        }
    }
    resultsHTML += '</ul><p>결과를 LocalStorage에 성공적으로 기록했습니다.</p>';
    
    resultContent.innerHTML = resultsHTML;
    saveRankData(newRankData); // 새로운 데이터를 LocalStorage에 저장
    
    loader.style.display = 'none'; // 로딩 끝

    logDebug("모든 키워드 순위 추적 완료. 대시보드를 업데이트합니다.");
    updateDashboard(); // 데이터가 변경되었으니 대시보드를 새로고침
}


/**
 * 대시보드(차트)를 업데이트하는 함수
 */
function updateDashboard() {
    logDebug("대시보드 업데이트 함수 호출됨.");
    const data = getRankData(); // LocalStorage에서 데이터 가져오기

    if (data.length === 0) {
        logDebug("저장된 데이터가 없어 기본 메시지를 표시합니다.");
        // 데이터가 없을 경우 처리
        if (myRankChart) myRankChart.destroy(); // 기존 차트가 있으면 파괴
        const ctx = rankChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, rankChartCanvas.width, rankChartCanvas.height);
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("아직 기록된 순위 데이터가 없습니다.", rankChartCanvas.width / 2, rankChartCanvas.height / 2);
        return;
    }
    
    logDebug(`차트용 데이터 가공 시작. 총 ${data.length}개의 기록.`);
    // Chart.js가 이해할 수 있는 형태로 데이터 가공
    const { labels, datasets } = processDataForChart(data);

    // 기존에 차트가 있었다면 파괴 (중복 생성을 막기 위함)
    if (myRankChart) {
        logDebug("기존 차트 파괴.");
        myRankChart.destroy();
    }
    
    logDebug("새로운 차트 생성.");
    const ctx = rankChartCanvas.getContext('2d');
    myRankChart = new Chart(ctx, {
        type: 'line', // 꺾은선 그래프
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '키워드별 순위 변화 추이'
                }
            },
            scales: {
                y: {
                    // 순위는 숫자가 낮을수록 좋으므로 Y축을 뒤집습니다.
                    reverse: true, 
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '순위'
                    }
                },
                x: {
                     title: {
                        display: true,
                        text: '날짜'
                    }
                }
            }
        }
    });
}


/**
 * '기록 전체 삭제' 버튼 클릭 시 실행되는 함수
 */
function handleClearData() {
    logDebug("'기록 전체 삭제' 버튼 클릭됨.");
    // 실제로는 confirm을 사용하는 것이 좋지만, 
    // 여기서는 iframe 환경을 고려하여 바로 삭제합니다.
    // UI/UX 개선을 위해선 직접 만든 모달창을 띄우는 것이 좋습니다.
    localStorage.removeItem('rankData');
    logDebug("LocalStorage의 'rankData'를 삭제했습니다.");
    resultContent.innerHTML = `<p>모든 기록이 삭제되었습니다.</p>`;
    updateDashboard(); // 데이터가 삭제되었으니 대시보드도 업데이트
}


// -----------------------------------------------------------------------------
// --- 데이터 처리 및 API 연동 함수 ---
// -----------------------------------------------------------------------------

/**
 * LocalStorage에서 순위 데이터를 가져오는 함수
 * @returns {Array} 저장된 순위 데이터 배열
 */
function getRankData() {
    const data = localStorage.getItem('rankData');
    return data ? JSON.parse(data) : [];
}

/**
 * LocalStorage에 새로운 순위 데이터를 추가하여 저장하는 함수
 * @param {Array} newEntries - 새로 추가할 데이터 객체들의 배열
 */
function saveRankData(newEntries) {
    if (newEntries.length === 0) return;
    const existingData = getRankData();
    const updatedData = existingData.concat(newEntries);
    localStorage.setItem('rankData', JSON.stringify(updatedData));
    logDebug(`${newEntries.length}개의 새 기록을 포함하여 총 ${updatedData.length}개의 데이터를 저장했습니다.`);
}

/**
 * 순위 데이터를 Chart.js 형식으로 가공하는 함수
 * @param {Array} data - LocalStorage에서 가져온 원본 데이터
 * @returns {Object} Chart.js에 필요한 labels와 datasets
 */
function processDataForChart(data) {
    // 1. 날짜(labels)들을 중복 없이 오름차순으로 정렬
    const labels = [...new Set(data.map(item => item.date))].sort();
    
    // 2. 키워드별로 데이터를 그룹화
    const keywords = [...new Set(data.map(item => item.keyword))];
    
    // 3. 각 키워드에 대한 데이터셋(datasets) 생성
    const datasets = keywords.map((keyword, index) => {
        const keywordData = labels.map(label => {
            // 해당 날짜와 키워드에 맞는 데이터를 찾습니다.
            const entry = data.find(d => d.date === label && d.keyword === keyword);
            // 데이터가 있으면 순위를, 없으면 null(선이 끊어짐)을 반환
            return entry ? entry.rank : null; 
        });

        const color = getRandomColor(index); // 각 선에 랜덤 색상 부여
        return {
            label: keyword, // 그래프 범례에 표시될 이름
            data: keywordData,
            borderColor: color,
            backgroundColor: color,
            fill: false,
            tension: 0.1 // 선을 약간 부드럽게
        };
    });

    return { labels, datasets };
}


/**
 * Netlify 서버리스 함수를 호출하는 (가짜)함수
 * @param {string} keyword 
 * @param {string} productName 
 * @param {string} storeName 
 * @returns {Promise<number>} 상품 순위 (1~500), 못찾으면 -1
 */
async function fetchRankFromNetlify(keyword, productName, storeName) {
    logDebug(`(가짜 API 호출) Keyword: ${keyword}, Product: ${productName}`);
    
    // 실제로는 여기서 fetch()를 사용해 Netlify 함수 URL을 호출해야 합니다.
    // 예: const response = await fetch(`/.netlify/functions/get-rank?keyword=${keyword}...`);
    // const data = await response.json();
    // return data.rank;

    // 지금은 2초간 기다렸다가 1~500 사이의 랜덤 숫자를 반환하도록 만듭니다.
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 딜레이
    
    // 20% 확률로 순위권 밖으로 처리
    if (Math.random() < 0.2) {
        return -1;
    }
    return Math.floor(Math.random() * 500) + 1;
}

// -----------------------------------------------------------------------------
// --- 유틸리티 및 디버깅 함수 ---
// -----------------------------------------------------------------------------

/**
 * 디버깅 메시지를 화면과 콘솔에 기록하는 함수
 * @param {string} message - 기록할 메시지
 */
function logDebug(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    if(debugContainer.style.display === 'block') {
        debugLog.innerHTML += logMessage;
        debugLog.scrollTop = debugLog.scrollHeight; // 자동 스크롤
    }
    console.log(`[DEBUG] ${message}`);
}

/**
 * 랜덤 HEX 색상 코드를 생성하는 함수
 * @param {number} seed - 색상 생성에 사용할 시드 값
 * @returns {string} #xxxxxx 형식의 색상 코드
 */
function getRandomColor(seed) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#E7E9ED', '#8D99AE', '#2B2D42', '#EF233C', '#D90429'
    ];
    return colors[seed % colors.length];
}
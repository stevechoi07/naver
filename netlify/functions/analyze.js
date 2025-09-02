// /netlify/functions/analyze.js (v2.1 - 진단용 코드)

exports.handler = async function(event, context) {
    // 어떤 복잡한 로직도 없이, 무조건 성공 메시지만 반환합니다.
    const responseBody = {
        message: "주방(JS) 가스레인지 정상 작동!"
    };

    return {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
};
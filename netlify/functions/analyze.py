# /netlify/functions/analyze.py (v1.0)

import json

def handler(event, context):
    # 1. 손님(Front-end)이 보낸 주문서(event)에서 쿼리스트링을 확인합니다.
    params = event.get('queryStringParameters', {})
    
    # 2. 주문서에서 'keyword'라는 재료를 꺼냅니다. 없으면 '없음'으로 처리합니다.
    keyword = params.get('keyword', '없음')
    
    # 3. 주방에서 요리가 성공적으로 끝났다는 신호(200)와 함께,
    #    손님에게 보여줄 메시지를 JSON 형태로 만듭니다.
    response_body = {
        "message": f"'{keyword}' 키워드 분석 요청을 성공적으로 받았습니다!",
        "received_keyword": keyword
    }
    
    # 4. 최종적으로 완성된 요리를 손님에게 전달합니다.
    return {
        "statusCode": 200,
        "body": json.dumps(response_body)
    }
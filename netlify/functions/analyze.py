# /netlify/functions/analyze.py (v2.0)

import json
import os
import requests

def handler(event, context):
    client_id = os.environ.get('NAVER_CLIENT_ID')
    client_secret = os.environ.get('NAVER_CLIENT_SECRET')

    params = event.get('queryStringParameters', {})
    keyword = params.get('keyword')

    if not keyword:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "에러: 키워드를 입력해 주세요."})
        }

    try:
        url = "https://openapi.naver.com/v1/search/shop.json"
        
        headers = {
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret
        }
        
        query_params = {
            "query": keyword,
            "display": 100 
        }

        response = requests.get(url, params=query_params, headers=headers)
        response.raise_for_status()

        naver_data = response.json()
        return {
            "statusCode": 200,
            "body": json.dumps(naver_data)
        }

    except requests.exceptions.RequestException as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": f"API 요청 중 에러 발생: {e}"})
        }
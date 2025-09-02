# /netlify/functions/analyze.py (v2.1 - 진단용 코드)
import json

def handler(event, context):
    # 어떤 복잡한 로직도 없이, 무조건 성공 메시지만 반환합니다.
    # 이 함수가 성공적으로 실행된다면, 우리 프로젝트의 기본 환경과
    # 폴더 구조, netlify.toml 설정은 완벽하다는 뜻입니다.
    return {
        "statusCode": 200,
        "body": json.dumps({ "message": "주방 가스레인지 정상 작동!" })
    }
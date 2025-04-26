from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.rest import Client
import os
from dotenv import load_dotenv
from twilio.twiml.voice_response import VoiceResponse, Start, Stream
import threading
import queue

load_dotenv()
app = Flask(__name__)
CORS(app)

# 全局队列，用于存储待转换的TTS文本
tts_queue = queue.Queue()
client = Client(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))

@app.route('/token', methods=['GET'])
def generate_token():
    identity = request.args.get('identity', 'default_user')
    try:
        token = AccessToken(
            os.getenv('TWILIO_ACCOUNT_SID'),
            os.getenv('TWILIO_API_KEY_SID'),
            os.getenv('TWILIO_API_KEY_SECRET'),
            identity=identity
        )
        
        voice_grant = VoiceGrant(
            outgoing_application_sid=os.getenv('TWILIO_TWIML_APP_SID'),
            incoming_allow=True
        )
        token.add_grant(voice_grant)
        
        token_str = token.to_jwt()
        print("Generated Token:", token_str) 

        return jsonify({'token': token_str})
    except Exception as e:
        print("Error generating token:", e)  
        return jsonify({'error': str(e)}), 500


@app.route('/call', methods=['POST'])
def initiate_call():
    try:
        data = request.get_json()
        to_number = data['to']
        from_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        if not to_number.startswith('+'):
            return jsonify({'error': 'Phone number must include country code'}), 400

        response = VoiceResponse()
        response.say("实时语音转换已连接", voice='alice')
        
        # 添加媒体流
        response.start().stream(
            url=f"wss://{request.host}/stream",
            name='live_tts'
        )
        
        call = client.calls.create(
            to=to_number,
            from_=from_number,
            twiml=str(response)
        )
        
        return jsonify({
            'status': 'success',
            'call_sid': call.sid,
            'message': 'Call initiated with live TTS'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/push_tts', methods=['POST'])
def push_tts():
    data = request.get_json()
    tts_queue.put(data['text'])
    return jsonify({'status': 'success'})

# 模拟WebSocket端点（实际部署需要真正的WebSocket支持）
@app.route('/stream', methods=['GET', 'POST'])
def stream():
    # 实际部署时应替换为真正的WebSocket实现
    text = tts_queue.get()
    return jsonify({'text': text})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

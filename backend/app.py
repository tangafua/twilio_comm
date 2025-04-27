from flask import Flask, jsonify, request
from flask_cors import CORS
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.rest import Client
import os
from dotenv import load_dotenv
from twilio.twiml.voice_response import VoiceResponse
from urllib.parse import quote

load_dotenv()

app = Flask(__name__)
CORS(app)

REQUIRED_ENV = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY_SID',
    'TWILIO_API_KEY_SECRET',
    'TWILIO_TWIML_APP_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'YOUR_SERVER_URL'
]

for var in REQUIRED_ENV:
    if not os.getenv(var):
        raise EnvironmentError(f"Missing required environment variable: {var}")

client = Client(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))

@app.route('/token', methods=['GET'])
def generate_token():
    identity = request.args.get('identity', 'default_user')  # Default identity if none provided
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
        data = request.json
        to_number = data['to']
        text = data.get('text', '')
        from_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        # 生成安全的TwiML URL
        base_url = os.getenv('YOUR_SERVER_URL')
        encoded_text = quote(text) 
        twiml_url = f"{base_url}/voice?text={encoded_text}"
        
        call = client.calls.create(
            to=to_number,
            from_=from_number,
            url=twiml_url
        )
        
        return jsonify({
            'status': 'success',
            'call_sid': call.sid,  
            'message': '通话已发起'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/send-text', methods=['POST'])
def handle_live_text():
    data = request.json
    call_sid = data['callSid']
    text = data['text']
    
    try:
        # 使用Twilio API更新通话
        client.calls(call_sid).update(
            twiml=f'<Response><Say language="zh-CN" voice="Polly.Zhiyu">{text}</Say></Response>'
        )
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    

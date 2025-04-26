from flask import Flask, jsonify, request, url_for
from flask_cors import CORS
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.rest import Client
import os
from dotenv import load_dotenv
from twilio.twiml.voice_response import VoiceResponse, Say

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration checks
REQUIRED_ENV = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY_SID',
    'TWILIO_API_KEY_SECRET',
    'TWILIO_TWIML_APP_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
]

for var in REQUIRED_ENV:
    if not os.getenv(var):
        raise EnvironmentError(f"Missing required environment variable: {var}")

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
        return jsonify({'error': str(e)}), 500

@app.route('/voice', methods=['GET'])
def voice():
    text = request.args.get('text', 'Hello, this is a default message.')
    response = VoiceResponse()
    response.say(text, voice='alice') 
    
    return str(response), 200, {'Content-Type': 'text/xml'}

@app.route('/call', methods=['POST'])
def initiate_call():
    try:
        data = request.get_json()
        to_number = data['to']
        text = data.get('text', 'Hello from Twilio')
        from_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        if not to_number.startswith('+'):
            return jsonify({'error': 'Phone number must include country code (e.g., +1)'}), 400

        voice_url = url_for('voice', text=text, _external=True)
        
        call = client.calls.create(
            to=to_number,
            from_=from_number,
            url=voice_url
        )
        
        return jsonify({
            'status': 'success',
            'call_sid': call.sid,
            'message': 'Call initiated with TTS'
        })
    except KeyError:
        return jsonify({'error': 'Missing required parameters'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

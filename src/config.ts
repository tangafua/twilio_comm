export const config = {
  twilio: {
    accountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID || '',
    authToken: process.env.REACT_APP_TWILIO_AUTH_TOKEN || '',
    apiKey: process.env.REACT_APP_TWILIO_API_KEY || '',
    apiSecret: process.env.REACT_APP_TWILIO_API_SECRET || '',
    twimlAppSid: process.env.REACT_APP_TWILIO_TWIML_APP_SID || '',
    phoneNumber: process.env.REACT_APP_TWILIO_PHONE_NUMBER || '',
  },
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  }
}; 
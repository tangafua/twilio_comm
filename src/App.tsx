import React, { useState } from 'react';
import TwilioVoice from './components/TwilioVoice';

const App: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  const handleStart = () => {
    if (phoneNumber.trim() !== '') {
      setSubmitted(true);
    } else {
      alert('请输入手机号');
    }
  };

  return (
    <div className="app" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>📞 Twilio 拨号系统</h2>

      {!submitted ? (
        <div>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handleInputChange}
            placeholder="请输入要拨打的手机号"
            style={{ padding: '0.5rem', marginRight: '1rem' }}
          />
          <button onClick={handleStart} style={{ padding: '0.5rem 1rem' }}>
            开始拨号
          </button>
        </div>
      ) : (
        <div>
          <p>📲 正在拨打: <strong>{phoneNumber}</strong></p>
          <TwilioVoice
            phoneNumber={phoneNumber}
            onCallStarted={() => console.log('Call started')}
            onCallEnded={() => {
              console.log('Call ended');
              setSubmitted(false); // 通话结束后允许重新输入
            }}
            onError={(err) => alert(`出错: ${err.message}`)}
          />
        </div>
      )}
    </div>
  );
};

export default App;



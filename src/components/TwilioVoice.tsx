import React, { useEffect, useState } from 'react';
import { Device } from '@twilio/voice-sdk';

interface TwilioVoiceProps {
  phoneNumber: string;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onError?: (error: Error) => void;
}

const TwilioVoice: React.FC<TwilioVoiceProps> = ({ phoneNumber, onCallStarted, onCallEnded, onError }) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState('');
  const [textToSpeech, setTextToSpeech] = useState('');

  useEffect(() => {
    const initializeDevice = async () => {
      try {
        const response = await fetch('http://localhost:5000/token');
        const { token } = await response.json();
   
        console.log('Received Token:', token);

        if (typeof token !== 'string') {
          throw new Error('Token is not a valid string');
        }
   
        const newDevice = new Device(token, {
          codecPreferences: ['opus', 'pcmu'] as any,
        });
   
        newDevice.on('ready', () => {
          setStatus('设备就绪');
          console.log('Device Ready');
        });
   
        newDevice.on('error', (error) => {
          setStatus(`错误: ${error.message}`);
          console.error('Device Error:', error);
          onError?.(error);
        });
   
        newDevice.on('disconnect', () => {
          setIsCalling(false);
          setStatus('通话结束');
          onCallEnded?.();
        });
   
        setDevice(newDevice);
        await newDevice.register();
      } catch (error) {
        console.error('初始化失败:', error);
        setStatus('初始化失败');
        onError?.(error as Error);
      }
    };
   
    initializeDevice();
   
    return () => {
      device?.destroy();
    };
   
  }, []); // Empty dependency array to run once on mount

  const startCall = async () => {
    if (!device || !phoneNumber) return;

    try {
      setIsCalling(true);
      setStatus('正在连接...');

      const response = await fetch('http://localhost:5000/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: phoneNumber, text: textToSpeech }), // 传递 TTS 文本
      });

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.error || '未知错误');
      }

      setStatus('通话进行中...');
      onCallStarted?.();
    } catch (error) {
      console.error('呼叫失败:', error);
      setStatus('呼叫失败');
      setIsCalling(false);
      onError?.(error as Error);
    }
  };

  // End the call
  const endCall = () => {
    if (device) {
      device.disconnectAll();
      setIsCalling(false);
      setStatus('已挂断');
      onCallEnded?.();
    }
  };

  return (
    <div className="voice-container" style={{ padding: '20px' }}>
      <div className="status-box" style={{ marginBottom: '10px', fontSize: '18px' }}>
        {status}
      </div>
      <input
        type="text"
        value={textToSpeech}
        onChange={(e) => setTextToSpeech(e.target.value)}
        placeholder="输入要说的话"
        style={{ marginBottom: '10px', padding: '10px', fontSize: '16px', width: '80%' }}
      />
      <button
        onClick={isCalling ? endCall : startCall}
        disabled={!device || !phoneNumber || !textToSpeech}
        className={`call-btn ${isCalling ? 'end' : 'start'}`}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: isCalling ? '#f44336' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
        }}
      >
        {isCalling ? '挂断' : '呼叫'}
        </button>
      </div>
    );
    };

export default TwilioVoice;

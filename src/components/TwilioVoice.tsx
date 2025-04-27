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
  const [liveText, setLiveText] = useState('');
  const [activeCallSid, setActiveCallSid] = useState(''); 
  
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: phoneNumber, 
          text: textToSpeech 
        }),
      });

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.error);
      
      setActiveCallSid(result.call_sid); // 存储call_sid
      setStatus('通话进行中...');
    } catch (error) {
      console.error('呼叫失败:', error);
      setStatus('呼叫失败');
      setIsCalling(false);
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

    // 发送实时文本
    const sendLiveText = async () => {
      if (!activeCallSid || !liveText) return;
  
      try {
        await fetch('http://localhost:5000/send-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callSid: activeCallSid,
            text: liveText 
          }),
        });
        setLiveText(''); // 清空输入框
      } catch (error) {
        console.error('发送失败:', error);
      }
    };
  
    return (
      <div style={{ padding: '20px', maxWidth: '500px' }}>
        {/* 初始文本输入 */}
        <div style={{ marginBottom: 15 }}>
          <input
            type="text"
            value={textToSpeech}
            onChange={(e) => setTextToSpeech(e.target.value)}
            placeholder="输入初始要说的话"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
  
        {/* 实时文本输入 */}
        <div style={{ marginBottom: 15 }}>
          <input
            type="text"
            value={liveText}
            onChange={(e) => setLiveText(e.target.value)}
            placeholder="输入实时文本（通话中可发送）"
            style={{ width: '100%', padding: 8 }}
            onKeyPress={(e) => e.key === 'Enter' && sendLiveText()}
          />
          <button 
            onClick={sendLiveText}
            style={{ marginTop: 5, padding: '8px 15px' }}
          >
            发送实时文本
          </button>
        </div>
  
        {/* 通话控制 */}
        <button
          onClick={isCalling ? endCall : startCall}
          style={{
            padding: '10px 20px',
            backgroundColor: isCalling ? '#ff4444' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {isCalling ? '挂断' : '开始呼叫'}
        </button>
        
        <div style={{ marginTop: 10, color: '#666' }}>
          {status}
        </div>
      </div>
    );
  };
  export default TwilioVoice;
  



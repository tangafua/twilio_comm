import React, { useEffect, useState, useRef } from 'react';
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
  const [status, setStatus] = useState('正在初始化...');
  const [textToSpeech, setTextToSpeech] = useState('');
  const [liveText, setLiveText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const initializeDevice = async () => {
      try {
        const response = await fetch('http://localhost:5000/token');
        const { token } = await response.json();

        const newDevice = new Device(token, {
          codecPreferences: ['opus', 'pcmu'] as any,
          logLevel: 1
        });

        newDevice.on('ready', () => setStatus('设备就绪'));
        newDevice.on('error', (error) => {
          setStatus(`错误: ${error.message}`);
          onError?.(error);
        });
        newDevice.on('disconnect', () => {
          setIsCalling(false);
          setStatus('通话结束');
          wsRef.current?.close();
          onCallEnded?.();
        });

        setDevice(newDevice);
        await newDevice.register();
      } catch (error) {
        setStatus('初始化失败');
        onError?.(error as Error);
      }
    };

    initializeDevice();

    return () => {
      device?.destroy();
      wsRef.current?.close();
    };
  }, []);

  const startCall = async () => {
    if (!device || !phoneNumber) return;

    try {
      setIsCalling(true);
      setStatus('正在连接...');

      // 建立WebSocket连接（实际部署需要HTTPS）
      wsRef.current = new WebSocket('ws://localhost:5000/stream');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket连接已建立');
      };

      const response = await fetch('http://localhost:5000/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneNumber })
      });

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.error || '呼叫失败');
      }

      setStatus('通话中...');
      onCallStarted?.();
    } catch (error) {
      console.error('呼叫失败:', error);
      setStatus('呼叫失败');
      setIsCalling(false);
      onError?.(error as Error);
    }
  };

  const sendLiveText = async () => {
    if (!isCalling || !textToSpeech.trim()) return;
    
    try {
      await fetch('http://localhost:5000/push_tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeech })
      });
      setLiveText(textToSpeech);
      setTextToSpeech('');
    } catch (error) {
      console.error('发送文本失败:', error);
    }
  };

  const endCall = () => {
    if (device) {
      device.disconnectAll();
      setIsCalling(false);
      setStatus('已挂断');
      wsRef.current?.close();
      onCallEnded?.();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        {status}
      </div>
      
      {isCalling && (
        <div style={{ marginBottom: '10px' }}>
          正在发送: <strong>{liveText}</strong>
        </div>
      )}
      
      <input
        type="text"
        value={textToSpeech}
        onChange={(e) => setTextToSpeech(e.target.value)}
        placeholder="输入要说的话"
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        onKeyPress={(e) => e.key === 'Enter' && sendLiveText()}
      />
      
      <button
        onClick={isCalling ? endCall : startCall}
        disabled={!device || !phoneNumber}
        style={{
          padding: '10px 20px',
          background: isCalling ? '#f44336' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }}
      >
        {isCalling ? '挂断' : '呼叫'}
      </button>
      
      {isCalling && (
        <button
          onClick={sendLiveText}
          disabled={!textToSpeech.trim()}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          发送语音
        </button>
      )}
    </div>
  );
};

export default TwilioVoice;

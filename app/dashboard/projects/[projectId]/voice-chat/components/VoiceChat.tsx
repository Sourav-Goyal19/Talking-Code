'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useGetQueryResponse } from '@/features/apis/use-get-query-response';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceChat = ({ projectId }: { projectId: string }) => {
  const session = useSession();
  const queryMutation = useGetQueryResponse(session.data?.user?.email || '');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;    
    utterance.volume = 1.0;   
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported. Please use Chrome or Edge.');
    }
  }, []);

  const toggleListening = async () => {
    window.speechSynthesis.cancel()
    try {
      setError('');
      
      if (isListening) {
        setIsListening(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        console.log(text)
        handleSubmit(text);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (event.error === 'network') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to access microphone. Please ensure microphone permissions are granted.');
      setIsListening(false);
    }
  };

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    try {
      queryMutation.mutate({ projectId, json:text },
        {
            onSuccess: (data) => {
              console.log(data);
              setResponse(data.output);
              speakResponse(data.output); // Added speech synthesis here
            },
            onError: (error) => {
              console.error(error);
              setError('Failed to get AI response. Please try again.');
            }
        }
      );
      
    } catch (err) {
      setError('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-800 rounded-xl shadow-md">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">AI Voice Chat</h2>
        
        {error && (
          <div className="p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-300">
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={toggleListening}
          disabled={isLoading}
          className={`w-full p-4 rounded-lg flex items-center justify-center space-x-2 
            ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} 
            text-white transition-colors disabled:opacity-50`}
        >
          {isListening ? (
            <>
              <MicOff className="w-6 h-6" />
              <span>Stop Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-6 h-6" />
              <span>Start Speaking</span>
            </>
          )}
        </button>

        {transcript && (
          <div className="p-3 bg-gray-700 rounded">
            <p className="text-gray-300 font-medium">You said:</p>
            <p className="text-white">{transcript}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Getting AI response...</span>
          </div>
        )}

        {response && (
          <div className="p-3 bg-gray-700 rounded">
            <p className="text-gray-300 font-medium">AI Response:</p>
            <p className="text-white">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
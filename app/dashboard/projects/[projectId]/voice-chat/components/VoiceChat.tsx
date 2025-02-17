"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Loader2, Globe } from "lucide-react";
import { useSession } from "next-auth/react";

// Language interface
interface Language {
  code: string;
  name: string;
  voiceName?: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en-US", name: "  " },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-PT", name: "Portuguese" },
  { code: "hi-IN", name: "Hindi" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "zh-CN", name: "Chinese" },
  { code: "ar-SA", name: "Arabic" },
  { code: "ru-RU", name: "Russian" },
];

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceChat = ({ projectId }: { projectId: string }) => {
  const session = useSession();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    SUPPORTED_LANGUAGES[0]
  );
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  useEffect(() => {
    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const getBestVoiceForLanguage = (langCode: string) => {
    const voices = availableVoices;
    const nativeVoice = voices.find(
      (voice) =>
        voice.lang.toLowerCase().includes(langCode.toLowerCase()) &&
        voice.localService
    );

    const anyVoice = voices.find((voice) =>
      voice.lang.toLowerCase().includes(langCode.toLowerCase())
    );
    return nativeVoice || anyVoice || voices[0];
  };

  const speakResponse = (text: string) => {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.code;
    utterance.voice = getBestVoiceForLanguage(selectedLanguage.code);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError(
        "Speech recognition is not supported. Please use Chrome or Edge."
      );
    }
  }, []);

  const toggleListening = async () => {
    try {
      setError("");

      if (isListening) {
        setIsListening(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = selectedLanguage.code;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleSubmit(text);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setError(
            "Microphone access denied. Please allow microphone access and try again."
          );
        } else if (event.error === "network") {
          setError(
            "Network error. Please check your connection and try again."
          );
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
      console.error("Error:", err);
      setError(
        "Failed to access microphone. Please ensure microphone permissions are granted."
      );
      setIsListening(false);
    }
  };

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/talk?projectId=${projectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text,
          language: selectedLanguage.name,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get AI response. Please try again.");
      }

      const data = await res.json();

      setResponse(data.content);
      speakResponse(data.content);
    } catch (err) {
      setError("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-800 rounded-xl shadow-md">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">
          AI Voice Chat
        </h2>

        {/* Language Selector */}
        <div className="flex items-center space-x-2 bg-gray-700 p-2 rounded">
          <Globe className="w-5 h-5 text-gray-300" />
          <select
            value={selectedLanguage.code}
            onChange={(e) => {
              const lang = SUPPORTED_LANGUAGES.find(
                (l) => l.code === e.target.value
              );
              if (lang) setSelectedLanguage(lang);
            }}
            className="bg-gray-700 text-white flex-1 outline-none"
            disabled={isListening}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-300">
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={toggleListening}
          disabled={isLoading}
          className={`w-full p-4 rounded-lg flex items-center justify-center space-x-2 
            ${
              isListening
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } 
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

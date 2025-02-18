"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Loader2, VolumeX, Globe } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Language {
  code: string;
  name: string;
  voiceName?: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en-US", name: "English (US)" },
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

export default function VoiceChat({ projectId }: { projectId: string }) {
  const session = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.code;
    utterance.voice = getBestVoiceForLanguage(selectedLanguage.code);
    window.speechSynthesis.speak(utterance);

    utterance.onend = () => {
      setIsSpeaking(false);
    }
  };

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
    <div className="">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">AI Voice Assistant</h1>
          <p className="text-gray-400">Speak naturally and get AI-powered responses</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <Card className="bg-gray-800 shadow-xl border border-gray-700 transition-all duration-200 hover:shadow-2xl hover:shadow-primary/5">
            <CardHeader className="pb-4 border-b border-gray-700">
              <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
                <Globe className="w-5 h-5 text-primary" />
                Voice Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Select
                    value={selectedLanguage.code}
                    onValueChange={(value) => {
                      const lang = SUPPORTED_LANGUAGES.find(
                        (l) => l.code === value
                      );
                      if (lang) setSelectedLanguage(lang);
                    }}
                    disabled={isLoading || isListening}
                  >
                    <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-gray-200 focus:ring-2 ring-primary/20">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem 
                          key={lang.code} 
                          value={lang.code}
                          className="text-gray-200 hover:bg-gray-600 focus:bg-gray-600"
                        >
                          <span className="font-medium">{lang.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={toggleListening}
                    disabled={isLoading}
                    variant={isListening ? "destructive" : "default"}
                    className={cn(
                      "min-w-[140px] shadow-sm transition-all duration-200",
                      isListening ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90",
                      "font-semibold text-gray-100"
                    )}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>

                  {isSpeaking && (
                    <Button
                      onClick={() => {
                        window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                      }}
                      disabled={isLoading}
                      variant="outline"
                      className="min-w-[140px] shadow-sm border-gray-600 text-gray-200 hover:bg-gray-700 transition-colors duration-200"
                    >
                      <VolumeX className="w-4 h-4 mr-2" />
                      Stop Audio
                    </Button>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" className="border border-red-400/50 bg-red-900/20">
                    <AlertDescription className="font-medium text-red-200">{error}</AlertDescription>
                  </Alert>
                )}

                {isLoading && (
                  <div className="flex items-center gap-3 text-primary bg-primary/10 p-3 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium text-primary">Processing your request...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transcript Card */}
          {transcript && (
            <Card className={cn(
              "bg-gray-800 shadow-xl border border-gray-700 transition-all duration-200 hover:shadow-2xl hover:shadow-rose-500/5",
              isLoading && "opacity-80"
            )}>
              <CardHeader className="pb-4 border-b border-gray-700">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-rose-400">
                  <Mic className="w-5 h-5" />
                  Your Message
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-lg text-gray-300 leading-relaxed font-medium">
                  {transcript}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Response Card */}
        {response && (
          <Card className={cn(
            "bg-gray-800 shadow-xl border border-gray-700 transition-all duration-200 hover:shadow-2xl hover:shadow-emerald-500/5",
            isLoading && "opacity-80"
          )}>
            <CardHeader className="pb-4 border-b border-gray-700">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-emerald-400">
                <Globe className="w-5 h-5" />
                AI Response
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-line">
                  {response}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

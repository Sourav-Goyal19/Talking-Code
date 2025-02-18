"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Loader2, VolumeX } from "lucide-react";
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
import { LiveAudioVisualizer } from "react-audio-visualize";
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
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="h-full lg:h-36 overflow-auto">
          <CardHeader>
            <CardTitle className="text-primary tracking-wide">
              AI voice chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-start w-fit gap-7 flex-wrap">
            <div className="flex items-center justify-start w-fit gap-4">
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center">
                        {/* <Globe className="w-4 h-4 mr-2" /> */}
                        {lang.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={toggleListening}
                disabled={isLoading}
                variant={isListening ? "destructive" : "default"}
                className="w-full text-foreground"
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Speaking
                  </>
                )}
              </Button>

              {
                isSpeaking && (
                  <Button
                    onClick={() => {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }}
                    disabled={isLoading}
                    variant="default"
                    className="w-full text-foreground"
                  >
                    <VolumeX className="w-4 h-4 mr-2" />
                    Stop Speaking
                  </Button>
                )
              }
            </div>

            {isLoading && (
              <p className="flex items-center space-x-2 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="w-fit">Generating AI response...</p>
              </p>
            )}
          </CardContent>
        </Card>
        {transcript && (
          <Card
            className={cn(
              "h-full lg:h-36 overflow-auto",
              isLoading && "opacity-80"
            )}
          >
            <CardHeader>
              <CardTitle className="text-rose-700 tracking-wide">
                You said:
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="uppercase text-base tracking-wider">{transcript}</p>
            </CardContent>
          </Card>
        )}
      </div>
      {response && (
        <Card
          className={cn("w-full overflow-auto mt-5", isLoading && "opacity-80")}
        >
          <CardHeader>
            <CardTitle className="text-green-700 tracking-wide">
              AI Response:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="tracking-wider text-lg">{response}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

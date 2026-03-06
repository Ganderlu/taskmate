"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, StopCircle } from "lucide-react";

interface VoiceCommandProps {
  onCommand: (action: any) => void;
}

export default function VoiceCommand({ onCommand }: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          handleProcessCommand(text);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleProcessCommand = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/ai/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text }),
      });

      const data = await response.json();
      onCommand(data);
    } catch (error) {
      console.error("Error processing voice command:", error);
      alert("Failed to process voice command");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!recognitionRef.current && typeof window !== "undefined") {
    return null; // Browser doesn't support speech recognition
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`p-3 rounded-full transition-all shadow-lg ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-red-500/30"
            : isProcessing
            ? "bg-gray-200 text-gray-500 cursor-wait"
            : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/30"
        }`}
        title="Voice Command"
      >
        {isProcessing ? (
          <Loader2 size={24} className="animate-spin" />
        ) : isListening ? (
          <StopCircle size={24} />
        ) : (
          <Mic size={24} />
        )}
      </button>
      
      {/* Transcript tooltip/toast */}
      {(isListening || isProcessing || transcript) && (
        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 text-sm z-50 animate-in slide-in-from-bottom-2 fade-in">
          {isListening && <p className="text-purple-600 font-medium mb-1">Listening...</p>}
          {isProcessing && <p className="text-blue-600 font-medium mb-1">Processing...</p>}
          <p className="text-gray-600 dark:text-gray-300 italic">
            {transcript || "Speak now..."}
          </p>
        </div>
      )}
    </div>
  );
}

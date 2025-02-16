import { useEffect, useState } from "react";
import axios from "axios";

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

function App() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeExtension = async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tabs[0]?.url) {
          setInitialError("No active tab found");
          return;
        }

        const url = tabs[0].url;
        setCurrentUrl(url);

        const response = await axios.post(
          "http://localhost:4000/api/extension/new",
          {
            github_url: url,
          }
        );

        if (response.status !== 200) {
          setInitialError(
            response.data.error || "Failed to initialize extension"
          );
          return;
        }
        setMessages([
          {
            id: Date.now(),
            content:
              "Extension initialized successfully! Ask any questions about the repository.",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setInitialError(err.response?.data?.error || "API Error");
        } else {
          setInitialError("An unexpected error occurred");
        }
      }
    };

    initializeExtension();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !currentUrl || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: query,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:4000/api/extension/query-stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            github_url: currentUrl,
            query: query,
          }),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: "",
          isUser: false,
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (!lastMessage.isUser) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: assistantMessage },
            ];
          }
          return prev;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: `Error: ${
            err instanceof Error ? err.message : "Failed to process query"
          }`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (initialError) {
    return <div className="p-4 text-red-500">Error: {initialError}</div>;
  }

  if (!currentUrl) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[400px] w-[300px] bg-gray-50">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Talk to Code</h2>
        <p className="text-sm text-gray-600 truncate">
          Repo:{" "}
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600"
          >
            {currentUrl}
          </a>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isUser ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-200"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask any query regarding the repo..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;

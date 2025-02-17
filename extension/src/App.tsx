import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

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
    return <div className="error-message">Error: {initialError}</div>;
  }

  if (!currentUrl) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h2 className="popup-title">Talk to Code</h2>
        <p className="repo-info">
          Repo:{" "}
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="repo-link"
          >
            {currentUrl}
          </a>
        </p>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-wrapper ${
              message.isUser ? "user-message" : "assistant-message"
            }`}
          >
            <div
              className={`message-bubble ${
                message.isUser ? "user" : "assistant"
              }`}
            >
              <p className="message-content">{message.content}</p>
              <p className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-bubble">
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask any query!"
            className="query-input"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} className="submit-button">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;

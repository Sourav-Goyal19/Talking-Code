"use client"
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { readStreamableValue } from "ai/rsc";
import { useSession } from "next-auth/react";
import { ArrowUp, MessageSquare, Code, FileSearch, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getQueryAnswer } from "@/lib/query-answer";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { atomDark as editorTheme } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ChatFormProps {
  projectId: string;
}

type ChatMessage = {
  query: string;
  ai_response: string;
  sources: {
    fileName: string;
    summary: string;
    sourceCode: string;
    similarity: number;
  }[];
};

const EXAMPLE_QUESTIONS = [
  {
    icon: <Code className="w-5 h-5" />,
    title: "Code Analysis",
    questions: [
      "Can you explain how the authentication flow works in this project?",
      "What design patterns are used in this codebase?",
      "How is state management implemented across the application?"
    ]
  },
  {
    icon: <FileSearch className="w-5 h-5" />,
    title: "Documentation",
    questions: [
      "What are the main components and their purposes?",
      "How should I structure new features in this project?",
      "What are the coding conventions used here?"
    ]
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Suggestions",
    questions: [
      "How can I improve the error handling in this code?",
      "What performance optimizations would you recommend?",
      "Are there any security vulnerabilities I should address?"
    ]
  }
];

const ChatForm: React.FC<ChatFormProps> = ({ projectId }) => {
  const [activeFileIndex, setActiveFileIndex] = useState<Record<number, number>>({});
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const { data: sessionData } = useSession();
  const formSchema = z.object({ query: z.string().min(1) });
  const markdownRef = useRef<HTMLDivElement>(null);

  type FormType = z.infer<typeof formSchema>;

  const form = useForm<FormType>({
    defaultValues: { query: "" },
    resolver: zodResolver(formSchema),
  });

  const handleFileClick = (index: number, idx: number) => {
    setActiveFileIndex((prev) => ({ ...prev, [index]: idx }));
  };

  const handleExampleClick = (question: string) => {
    form.setValue("query", question);
    form.handleSubmit(onSubmit)();
  };

  const getLastMessages = () =>
    chat.slice(-3).map(({ query, ai_response }) => ({ query, ai_response }));

  const onSubmit: SubmitHandler<FormType> = async (formdata) => {
    form.reset();

    const newChatMessage: ChatMessage = {
      query: formdata.query,
      ai_response: "",
      sources: [],
    };

    try {
      setChat((prev) => [...prev, newChatMessage]);
      const { data, output } = await getQueryAnswer(
        formdata.query,
        projectId,
        getLastMessages()
      );
      setChat((prev) => {
        const updatedChat = [...prev];
        updatedChat[prev.length - 1].sources = data;
        return updatedChat;
      });
      for await (const text of readStreamableValue(output)) {
        setChat((prev) => {
          const updatedChat = [...prev];
          const lastIndex = updatedChat.length - 1;
          if (lastIndex >= 0) {
            updatedChat[lastIndex] = {
              ...updatedChat[lastIndex],
              ai_response: updatedChat[lastIndex].ai_response + text,
            };
          }
          return updatedChat;
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again later.");
      form.setValue("query", formdata.query);
    }
  };

  useEffect(() => {
    setActiveFileIndex((prev) => {
      return Object.fromEntries(
        chat.map((_, index) => [index, prev?.[index] || 0])
      );
    });
  }, [chat.length]);

  useEffect(() => {
    if (markdownRef.current) {
      markdownRef.current.scrollTop = markdownRef.current.scrollHeight;
    }
  }, [chat]);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4">
        {chat.length === 0 ? (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-100">Welcome to Code Assistant</h1>
              <p className="text-gray-400">Ask questions about your codebase and get detailed answers</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {EXAMPLE_QUESTIONS.map((category, idx) => (
                <Card key={idx} className="bg-gray-800 border-gray-700 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      {category.icon}
                      <h2 className="font-semibold">{category.title}</h2>
                    </div>
                    <div className="space-y-2">
                      {category.questions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleExampleClick(q)}
                          className="w-full text-left p-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700/50 hover:text-primary transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mb-24">
            {chat.map((ct, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <p className="bg-gray-800 rounded-2xl rounded-tl-none py-3 px-4 text-gray-100 font-medium shadow-lg">
                    {ct.query}
                  </p>
                </div>
                
                <div className="ml-11 space-y-4 bg-gray-800/50 rounded-xl shadow-lg p-4">
                  <MDEditor.Markdown
                    source={ct.ai_response || "Thinking..."}
                    className="w-full !h-full max-h-[60vh] overflow-auto text-gray-200 bg-transparent text-base"
                    style={{
                      background: "transparent",
                      fontSize: "1.1rem",
                      lineHeight: "1.7rem",
                      letterSpacing: "0.025em",
                    }}
                  />
                  <div ref={markdownRef} />
                  
                  {ct.sources.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center overflow-auto scrollbar-hide gap-2 bg-gray-800 rounded-lg p-1">
                        {ct.sources.map((an, idx) => (
                          <button
                            key={idx}
                            className={cn(
                              "text-sm px-3 py-2 rounded-md transition-colors",
                              activeFileIndex[index] === idx
                                ? "bg-primary text-gray-900"
                                : "text-gray-300 hover:bg-gray-700"
                            )}
                            onClick={() => handleFileClick(index, idx)}
                          >
                            {an.fileName}
                          </button>
                        ))}
                      </div>
                      
                      {ct.sources.map((an, idx) => (
                        <div key={idx}>
                          {activeFileIndex[index] === idx && (
                            <div className="rounded-lg overflow-hidden">
                              <SyntaxHighlighter
                                language="typescript"
                                style={editorTheme}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: '0.5rem',
                                }}
                              >
                                {an.sourceCode}
                              </SyntaxHighlighter>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="fixed inset-x-0 bottom-6 px-4 md:px-28">
              <div className="max-w-5xl mx-auto">
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ask about your code..."
                            className="bg-gray-800 border-gray-700 pr-16 pl-6 py-7 rounded-full text-gray-100 placeholder:text-gray-500 focus:ring-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    size="icon"
                    type="submit"
                    className="absolute right-2 top-2 bg-primary hover:bg-primary/90 rounded-full w-10 h-10"
                    disabled={form.formState.isSubmitting}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ChatForm;
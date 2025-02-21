"use client";
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { readStreamableValue } from "ai/rsc";
import { useSession } from "next-auth/react";
import {
  ArrowUp,
  MessageSquare,
  Code,
  FileSearch,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getQueryAnswer, getQueryAnswerPro } from "@/lib/query-answer";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { atomDark as editorTheme } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import axios from "axios";

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
      "How is state management implemented across the application?",
    ],
  },
  {
    icon: <FileSearch className="w-5 h-5" />,
    title: "Documentation",
    questions: [
      "What are the main components and their purposes?",
      "How should I structure new features in this project?",
      "What are the coding conventions used here?",
    ],
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Suggestions",
    questions: [
      "How can I improve the error handling in this code?",
      "What performance optimizations would you recommend?",
      "Are there any security vulnerabilities I should address?",
    ],
  },
];

const models = [
  {
    value: "free",
    label: "Free",
    description: "Best for normal responses",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    value: "pro",
    label: "Pro",
    description: "3x more detailed response",
    icon: <Sparkles className="w-4 h-4" />,
  },
];

const ChatForm: React.FC<ChatFormProps> = ({ projectId }) => {
  const [activeFileIndex, setActiveFileIndex] = useState<
    Record<number, number>
  >({});
  const [selectedModel, setSelectedModel] = useState("free");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const formSchema = z.object({
    query: z.string().min(1),
    model: z.enum(["free", "pro"]),
  });
  const [isOpen, setIsOpen] = useState(false);

  const markdownRef = useRef<HTMLDivElement>(null);

  type FormType = z.infer<typeof formSchema>;

  const form = useForm<FormType>({
    defaultValues: { query: "", model: "free" },
    resolver: zodResolver(formSchema),
  });

  const handleFileClick = (index: number, idx: number) => {
    setActiveFileIndex((prev) => ({
      ...prev,
      [index]: prev[index] === idx ? -1 : idx,
    }));
  };

  const handleExampleClick = (question: string) => {
    form.setValue("query", question);
    form.handleSubmit(onSubmit)();
  };

  const getLastMessages = () =>
    chat
      .slice(-4, -1)
      .reverse()
      .map(({ query, ai_response }) => ({ query, ai_response }));

  const onSubmit: SubmitHandler<FormType> = async (formdata) => {
    form.reset({ model: formdata.model });

    const newChatMessage: ChatMessage = {
      query: formdata.query,
      ai_response: "",
      sources: [],
    };

    try {
      setChat((prev) => [...prev, newChatMessage]);
      if (formdata.model === "free") {
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
      } else {
        const { data, output } = await getQueryAnswerPro(
          formdata.query,
          projectId,
          getLastMessages()
        );

        setChat((prev) => {
          const updatedChat = [...prev];
          updatedChat[prev.length - 1].sources = data;
          updatedChat[prev.length - 1].ai_response = output;
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
        chat.map((_, index) => [index, prev?.[index] || -1])
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
      <div className="max-w-5xl px-4 mx-auto">
        {chat.length === 0 ? (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-gray-100">
                Welcome to Code Assistant
              </h1>
              <p className="text-gray-400">
                Ask questions about your codebase and get detailed answers
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {EXAMPLE_QUESTIONS.map((category, idx) => (
                <Card
                  key={idx}
                  className="transition-colors bg-gray-800 border-gray-700 hover:border-primary/50"
                >
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
                          className="w-full p-2 text-sm text-left text-gray-300 transition-colors rounded-lg hover:bg-gray-700/50 hover:text-primary"
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
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <p className="px-4 py-3 font-medium text-gray-100 bg-gray-800 rounded-tl-none shadow-lg rounded-2xl">
                    {ct.query}
                  </p>
                </div>

                <div className="p-4 space-y-4 shadow-lg ml-11 bg-gray-800/50 rounded-xl">
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
                      <div className="flex items-center gap-2 p-1 overflow-auto bg-gray-800 rounded-lg scrollbar-hide">
                        {ct.sources.map((an, idx) => (
                          <button
                            key={idx}
                            className={cn(
                              "text-sm px-3 py-2 rounded-md transition-colors text-nowrap",
                              activeFileIndex[index] === idx
                                ? "bg-primary text-foreground/80"
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
                            <div className="overflow-hidden rounded-lg">
                              <SyntaxHighlighter
                                language="typescript"
                                style={editorTheme}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: "0.5rem",
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
            <div className="fixed inset-x-0 px-4 bottom-6 md:px-28">
              <div className="max-w-5xl mx-auto">
                <div className="relative flex gap-2">
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="relative">
                          <div className="absolute top-2 left-2">
                            <Popover open={isOpen} onOpenChange={setIsOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={isOpen}
                                  className={cn(
                                    "flex items-center gap-2 px-3 bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-100",
                                    selectedModel == "pro" && "text-primary"
                                  )}
                                >
                                  {
                                    models.find(
                                      (model) => model.value === selectedModel
                                    )?.icon
                                  }
                                  <span className="hidden sm:inline">
                                    {
                                      models.find(
                                        (model) => model.value === selectedModel
                                      )?.label
                                    }
                                  </span>
                                  {isOpen ? (
                                    <ChevronUp className="w-4 h-4 ml-2" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 ml-2" />
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] p-0 bg-gray-800 border-gray-700">
                                <div className="grid">
                                  {models.map((model) => (
                                    <button
                                      key={model.value}
                                      className={cn(
                                        "flex items-start gap-2 w-full p-3 hover:bg-gray-700 transition-colors",
                                        selectedModel === model.value &&
                                          "bg-gray-700"
                                      )}
                                      onClick={() => {
                                        setSelectedModel(model.value);
                                        form.setValue(
                                          "model",
                                          model.value == "free" ? "free" : "pro"
                                        );
                                        setIsOpen(false);
                                      }}
                                    >
                                      <div className="mt-1">{model.icon}</div>
                                      <div className="text-left">
                                        <div className="text-sm font-medium text-gray-100">
                                          {model.label}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {model.description}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ask about your code..."
                              className="pl-32 pr-16 text-gray-100 bg-gray-800 border-gray-700 rounded-md py-7 placeholder:text-gray-500 focus:ring-primary"
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button
                    size="icon"
                    type="submit"
                    className="absolute w-10 h-10 rounded-full right-2 top-2 bg-primary hover:bg-primary/90"
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

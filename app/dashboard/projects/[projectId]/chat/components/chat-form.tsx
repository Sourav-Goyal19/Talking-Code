"use client";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { ArrowUp, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { getQueryAnswer } from "@/lib/query-answer";
import { readStreamableValue } from "ai/rsc";
import MDEditor from "@uiw/react-md-editor";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
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

const ChatForm: React.FC<ChatFormProps> = ({ projectId }) => {
  const [activeFileIndex, setActiveFileIndex] = useState<
    Record<number, number>
  >({});
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

  const onSubmit: SubmitHandler<FormType> = async (formdata) => {
    const newChatMessage: ChatMessage = {
      query: formdata.query,
      ai_response: "",
      sources: [],
    };

    setChat((prev) => [...prev, newChatMessage]);

    const { data, output } = await getQueryAnswer(formdata.query, projectId);
    setChat((prev) => {
      const updatedChat = [...prev];
      updatedChat[prev.length - 1].sources = data;
      return updatedChat;
    });
    for await (const text of readStreamableValue(output)) {
      setChat((prev) => {
        const updatedChat = [...prev];
        updatedChat[prev.length - 1].ai_response += text;
        return updatedChat;
      });
    }
    form.reset();
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
      <div className="flex flex-col gap-5 mb-24">
        {chat.map((ct, index) => (
          <div key={index}>
            <p className="bg-slate-200 w-fit rounded-full py-3 px-4 leading-4 text-black flex items-center flex-wrap font-medium mb-3 text-lg tracking-wider shadow-xl">
              {ct.query}
            </p>
            <div className="space-y-3 border rounded-md shadow-xl bg-custom2 py-2 px-4">
              <MDEditor.Markdown
                source={ct.ai_response || "Thinking......."}
                className="w-full !h-full max-h-[60vh] overflow-auto text-foreground bg-transparent text-base border-b-2 border-white pb-10"
                style={{
                  background: "transparent",
                  fontSize: "1rem",
                  lineHeight: "1.5rem",
                }}
              />
              <div ref={markdownRef} />
              <div className="flex items-center bg-custom1 rounded overflow-auto no-scrollbar gap-2">
                {ct.sources.map((an, idx) => (
                  <p
                    key={idx}
                    className={cn(
                      "text-foreground rounded text-nowrap p-2 px-3 cursor-pointer hover:bg-foreground hover:text-black transition",
                      activeFileIndex[index] === idx &&
                        "bg-foreground text-black"
                    )}
                    onClick={() => handleFileClick(index, idx)}
                  >
                    {an.fileName}
                  </p>
                ))}
              </div>
              {ct.sources.map((an, idx) => (
                <div key={idx}>
                  {activeFileIndex[index] === idx && (
                    <SyntaxHighlighter
                      language="typescript"
                      style={editorTheme}
                    >
                      {an.sourceCode}
                    </SyntaxHighlighter>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="fixed inset-x-0 bottom-10 px-28">
            <div className="relative">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your query"
                        className="p-6 rounded-full text-base py-7"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                size="icon"
                type="submit"
                className="absolute right-6 top-2 bg-foreground rounded-full"
                disabled={form.formState.isSubmitting}
              >
                <ArrowUp className="size-6" />
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ChatForm;

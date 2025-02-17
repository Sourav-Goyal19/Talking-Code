"use client";
import { Button } from "@/components/ui/button";
import MDEditor from "@uiw/react-md-editor";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark as editorTheme } from "react-syntax-highlighter/dist/esm/styles/prism";

interface TreeProps {
  data: string;
}

const Tree: React.FC<TreeProps> = ({ data }) => {
  return (
    <div className="h-full w-full relative overflow-hidden group">
      <SyntaxHighlighter
        language="text"
        style={editorTheme}
        customStyle={{
          background: "transparent",
          width: "100%",
          height: "100%",
          fontSize: "18px",
          padding: "8px 20px",
          overflow: "auto",
        }}
      >
        {data}
      </SyntaxHighlighter>
      <Button
        size="icon"
        className="absolute top-4 right-4 bg-foreground hover:bg-foreground hover:opacity-80 hidden group-hover:flex"
        onClick={() => {
          navigator.clipboard.writeText(data);
          toast.success("Copied to clipboard");
        }}
      >
        <Copy className="size-4" />
        <p className="sr-only">Copy</p>
      </Button>
    </div>
  );
};

export default Tree;

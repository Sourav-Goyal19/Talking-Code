"use client";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/zustand/project-store";
import { useRouter } from "next/navigation";
import React from "react";

const Chat = () => {
  const router = useRouter();
  const { project } = useProjectStore();

  return (
    <div>
      <div>
        <Input placeholder="Enter your query" />
      </div>
    </div>
  );
};

export default Chat;

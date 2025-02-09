"use client";
import { useProjectStore } from "@/zustand/project-store";
import { useRouter } from "next/navigation";
import React from "react";

const Chat = () => {
  const router = useRouter();
  const { project } = useProjectStore();

  return <div>{project?.name}</div>;
};

export default Chat;

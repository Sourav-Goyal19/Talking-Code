import React from "react";
import { validate } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { redirect } from "next/navigation";
import { projectsTable } from "@/db/schema";
import ChatForm from "./components/chat-form";
import getCurrentUser from "@/actions/getCurrentUser";

interface ChatProps {
  params: {
    projectId: string;
  };
}

const Chat: React.FC<ChatProps> = async ({ params }) => {
  if (!params.projectId) return redirect("/dashboard");
  if (!validate(params.projectId)) return redirect("/dashboard");
  const user = await getCurrentUser();
  if (!user) return redirect("/dashboard");
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.projectId));
  if (!project) return redirect("/dashboard");

  return (
    <div>
      <ChatForm projectId={params.projectId} />
    </div>
  );
};

export default Chat;

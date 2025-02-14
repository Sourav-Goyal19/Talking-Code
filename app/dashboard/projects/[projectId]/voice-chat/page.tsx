import getCurrentUser from "@/actions/getCurrentUser";
import { db } from "@/db/drizzle";
import { projectsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { validate } from "uuid";
import VoiceChat from "./components/VoiceChat";

interface VoiceChatProps {
    params: {
      projectId: string;
    };
  }
  

const Voice: React.FC<VoiceChatProps> = async ({ params }) => {
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
            <VoiceChat projectId={params.projectId}/>
        </div>
    );
}

export default Voice;
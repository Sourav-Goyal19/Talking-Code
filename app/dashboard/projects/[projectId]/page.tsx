import {
  ArrowRight,
  AudioWaveform,
  ExternalLink,
  Github,
  MessageCircleCode,
  Presentation,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { validate } from "uuid";
import { eq } from "drizzle-orm";
import { cn } from "@/lib/utils";
import { db } from "@/db/drizzle";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import getCurrentUser from "@/actions/getCurrentUser";
import { commitsTable, projectsTable } from "@/db/schema";
import Tree from "./components/tree";
import axios from "axios";

interface IndiviualProjectProps {
  params: {
    projectId: string;
  };
}

const IndiviualProject: React.FC<IndiviualProjectProps> = async ({
  params,
}) => {
  if (!params.projectId) return redirect("/dashboard");
  if (!validate(params.projectId)) return redirect("/dashboard");
  const user = await getCurrentUser();
  if (!user) return redirect("/dashboard");
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.projectId));
  // console.log(project);
  // const unprocessedCommits = await pullCommits(project.id);
  // console.log(unprocessedCommits);

  if (!project) return redirect("/dashboard");

  const commits = await db
    .select()
    .from(commitsTable)
    .where(eq(commitsTable.projectId, project.id));

  const commitsWithFormatSummary = commits.map((commit) => {
    const summary = commit.summary.split("#");
    return {
      ...commit,
      summary: summary.slice(1),
    };
  });

  // const res = await axios.get(
  //   `${process.env.PYTHON_BACKEND_URL}/tree?github_url=${project.githubUrl}`
  // );
  // const treeStructure = res.data.tree;
  // console.log(treeStructure);

  const features = [
    {
      icon: MessageCircleCode,
      heading: "Start a new conversation",
      description: "Talk with your repository and understand how it works.",
      button: "Let's Start",
      link: "/dashboard/projects/" + project.id + "/chat",
    },
    {
      icon: AudioWaveform,
      heading: "Start a voice conversation",
      description:
        "Talk with your repository with voice and know more about it.",
      button: "Let's Start",
      link: "/dashboard/projects/" + project.id + "/voice-chat",
    },
    // {
    //   icon: Presentation,
    //   heading: "Creat a new meeting",
    //   description: "Analyze your meetings with our AI.",
    //   button: "Let's Start",
    //   link: "/dashboard/projects/" + project.id + "/presentation",
    // },
  ];

  return (
    <div>
      <h2 className="text-secondary-foreground/70 text-3xl font-semibold mb-2 capitalize">
        {project.name}
      </h2>
      <p className="bg-slate-200 w-fit rounded-full py-2 px-4 leading-4 text-black flex items-center flex-wrap font-semibold mb-7 text-wrap whitespace-pre-line">
        <Github className="size-5 mr-1" /> Your project repository is{" "}
        <Link
          href={project.githubUrl}
          className="font-medium flex items-center text-wrap flex-wrap ml-1 hover:underline"
          target="_blank"
        >
          {project.githubUrl}{" "}
          <SquareArrowOutUpRight className="size-4 ml-1 hover:underline" />
        </Link>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-6 items-center">
          {features.map((feature) => (
            <div
              key={feature.heading}
              className="h-72 md:max-w-[90%] !w-full border shadow-lg bg-custom2 rounded-2xl flex flex-col items-center justify-center px-7 text-center"
            >
              <feature.icon className="size-20" />
              <p className="mt-2 text-xl tracking-wide">{feature.heading}</p>
              <p className="text-lg mb-5 text-secondary-foreground/60">
                {feature.description}
              </p>
              <Link href={feature.link}>
                <Button className="text-foreground text-base tracking-wide">
                  {feature.button} <ArrowRight className="size-4 ml-2" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <div className="border bg-zinc-900 max-h-[38rem] shadow-lg rounded-2xl flex flex-col items-center justify-center text-center">
          <Tree data={project.treeStructure} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-secondary-foreground/70 text-3xl font-semibold mb-2 capitalize">
          Commits
        </h2>
        {commits.length > 0 ? (
          commitsWithFormatSummary.map((commit, idx) => (
            <li key={commit.id} className="relative flex gap-x-4">
              <div
                className={cn(
                  idx == commits.length - 1 ? "h-6" : "-bottom-6",
                  "absolute justify-center left-4 top-0 flex"
                )}
              >
                <div className="w-px bg-gray-200"></div>
              </div>
              <>
                <Image
                  src={commit.commitAuthorAvatar}
                  alt="commit author avatar"
                  width={40}
                  height={40}
                  className="rounded-full relative mt-6 size-8 flex-none bg-gray-500"
                />
              </>
              <div className="flex-auto !text-wrap w-full overflow-auto border shadow bg-custom2 rounded-md mt-4 p-4">
                <div className="flex items-center">
                  <Link
                    href={`${project.githubUrl}/commit/${commit.commitHash}`}
                    target="_blank"
                    className="hover:underline group"
                  >
                    <span className="font-semibold text-lg">
                      {commit.commitAuthorName}
                    </span>{" "}
                    <span className="inline-flex items-center group-hover:underline">
                      commited
                      <ExternalLink className="size-4 ml-1" />
                    </span>
                  </Link>
                </div>
                <p className="text-xl font-semibold mt-">
                  {commit.commitMessage}
                </p>
                {commit.summary.map((summary, index) => (
                  <p
                    key={index}
                    className="text-base text-secondary-foreground/60 leading-6 mt-2"
                  >
                    #{summary}
                  </p>
                ))}
              </div>
            </li>
          ))
        ) : (
          <p className="text-lg mb-5 text-secondary-foreground/60">
            No commits found
          </p>
        )}
      </div>
    </div>
  );
};

export default IndiviualProject;

import getCurrentUser from "@/actions/getCurrentUser";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/hono";
import { validate } from "uuid";
import {
  ArrowRight,
  AudioWaveform,
  Github,
  MessageCircleCode,
  Presentation,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
  const res = await client.api[":email"]["projects"][":id"].$get({
    param: { email: user.email, id: params.projectId },
  });
  const { data: project } = await res.json();
  // console.log(project);

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
    {
      icon: Presentation,
      heading: "Creat a new meeting",
      description: "Analyze your meetings with our AI.",
      button: "Let's Start",
      link: "/dashboard/projects/" + project.id + "/presentation",
    },
  ];

  return (
    <div>
      <h2 className="text-secondary-foreground/70 text-3xl font-semibold mb-2 capitalize">
        {project.name}
      </h2>
      <p className="bg-slate-200 w-fit rounded-full py-2 px-4 leading-4 text-black flex items-center flex-wrap font-semibold mb-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <div
            key={feature.heading}
            className="h-72 border shadow-lg bg-custom2 rounded-2xl flex flex-col items-center justify-center px-7 text-center"
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
    </div>
  );
};

export default IndiviualProject;

"use client";

import { useGetAllProjects } from "@/features/apis/use-get-projects";
import { useProjectStore } from "@/zustand/project-store";
import { ArrowRight, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const ProjectsList = () => {
  const session = useSession();
  const email = session.data?.user?.email;
  const { setProject } = useProjectStore();
  const projectQuery = useGetAllProjects(email!);

  const projects = projectQuery.data || [];
  const isDisabled = projectQuery.isLoading || projectQuery.isPending;

  return (
    <div>
      <h2 className="mb-4 text-3xl font-semibold text-secondary-foreground/70">
        Your Projects
      </h2>
      <div className="w-full space-y-4">
        {isDisabled ? (
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin size-8" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-secondary-foreground/70">
            No Projects Found
          </div>
        ) : (
          <div>
            {projects.map((project) => (
              <Link
                href={`dashboard/projects/${project.id}`}
                key={project.id}
                className="flex items-center justify-between p-2 px-4 text-lg rounded-md cursor-pointer bg-custom2 hover:opacity-80"
                onClick={() => setProject(project)}
              >
                {project.name}
                <ArrowRight className="size-6" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsList;

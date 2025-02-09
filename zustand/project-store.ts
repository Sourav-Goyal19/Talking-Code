import { create } from "zustand";
import { insertProjectsSchema } from "@/db/schema";
import { z } from "zod";

type project = {
  id: string;
  name: string;
  githubUrl: string;
  createdAt: string | null;
  userId: string | null;
  deletedAt: string | null;
};

interface ProjectsStore {
  projects: project[];
  setProjects: (projects: project[]) => void;
  addProject: (project: project) => void;
  removeProject: (projectId: string) => void;
  clearAll: () => void;
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
    })),
  clearAll: () => set({ projects: [] }),
}));

interface ProjectStore {
  project: project | null;
  setProject: (project: project) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  setProject: (project) => set({ project }),
  clearProject: () => set({ project: null }),
}));

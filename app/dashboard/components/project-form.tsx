"use client";

import React from "react";
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Github, Link2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCreateProject } from "@/features/apis/use-create-project";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

const NewProjectForm = () => {
  const { data } = useSession();
  const projectMutation = useCreateProject(data?.user?.email!);

  const formSchema = z.object({
    projectName: z
      .string()
      .min(3, "Project name must be at least 3 characters long"),
    githubUrl: z.string().url("Please enter a valid GitHub URL"),
    accessToken: z.string().optional(),
  });

  type FormType = z.infer<typeof formSchema>;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      githubUrl: "",
      accessToken: "",
    },
  });

  const onSubmit = async (data: FormType) => {
    projectMutation.mutate(data, {
      onSuccess: (data) => {
        toast.success("Project Created Successfully");
        form.reset();
      },
      onError: (err) => {
        toast.error("Failed to create project");
        console.error(err);
      },
    });
  };

  return (
    <div>
      <h2 className="flex items-center mb-4 text-3xl font-semibold text-secondary-foreground/70">
        <Github className="w-6 h-6 mr-2" />
        New Project
      </h2>
      <Card className="pt-4 bg-custom2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Project Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter project name"
                        className="bg-custom2"
                        disabled={projectMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This name will be used to identify your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="githubUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      GitHub Repository URL
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="https://github.com/username/repository"
                          className="bg-custom2 pl-9"
                          disabled={projectMutation.isPending}
                          {...field}
                        />
                        <Link2 className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The URL of your GitHub repository
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Access Token (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="GitHub personal access token"
                        className="bg-custom2"
                        disabled={projectMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Required only for private repositories
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={projectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={projectMutation.isPending}
                className="min-w-[100px] text-foreground"
              >
                {projectMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default NewProjectForm;

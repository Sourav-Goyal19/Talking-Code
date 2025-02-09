"use client";

import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { useCreateProject } from "@/features/apis/use-create-project";

const NewProjectForm = () => {
  const { data } = useSession();
  const projectMutation = useCreateProject(data?.user?.email!);
  const formSchema = z.object({
    projectName: z
      .string()
      .min(3, "Atleast 3 characters project name is required"),
    githubUrl: z.string().url("Invalid URL"),
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

  const onSubmit: SubmitHandler<FormType> = (data) => {
    console.log(data);

    projectMutation.mutate(data, {
      onSuccess: (data) => {
        console.log(data);
        toast.success("Project Created Successfully");
        form.reset();
      },
      onError: (err) => {
        console.log(err);
      },
    });
  };

  return (
    <div>
      <h1 className="text-secondary-foreground/70 text-3xl font-semibold mb-4">
        Enter Your GitHub Repository Link
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-5">
          <FormField
            control={form.control}
            name="projectName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Project Name"
                    className="bg-custom1 border-[#374151] border-2 text-white p-3 rounded-md w-full text-base"
                    disabled={projectMutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="githubUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="GitHub Repository URL"
                    className="bg-custom1 border-[#374151] border-2 text-white p-3 rounded-md w-full text-base"
                    disabled={projectMutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessToken"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Access Token (optional, for private repositories)"
                    className="bg-custom1 border-[#374151] border-2 text-white p-3 rounded-md w-full text-base"
                    disabled={projectMutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              disabled={projectMutation.isPending}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={projectMutation.isPending}
              className="text-foreground"
            >
              {projectMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewProjectForm;

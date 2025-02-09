import toast from "react-hot-toast";
import { client } from "@/lib/hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

type RequestType = InferRequestType<
  (typeof client.api)[":email"]["projects"]["new"]["$post"]
>["json"];

type ResponseType = InferResponseType<
  (typeof client.api)[":email"]["projects"]["new"]["$post"]
>;

export const useCreateProject = (email: string) => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api[":email"]["projects"]["new"].$post({
        json,
        param: {
          email,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating project:", errorData);
        const errorMessage = response.statusText;
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    },
  });
};

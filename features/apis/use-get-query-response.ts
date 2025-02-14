import { client } from "@/lib/hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type RequestType = InferRequestType<
  (typeof client.api)[":email"]["projects"]["query"]["$post"]
>["json"];
type ResponseType = InferResponseType<
  (typeof client.api)[":email"]["projects"]["query"]["$post"]
>;

export const useGetQueryResponse = (email: string) => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, projectId }) => {
      const response = await client.api[":email"]["projects"]["query"]["$post"]({
        param: { email },
        json: { json, projectId },
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["query", email], data);
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || "Failed to fetch query response!");
    },
  });
};
import { client } from "@/lib/hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type RequestType = InferRequestType<
  (typeof client.api)[":email"]["projects"]["query"]["$get"]
>["query"];
type ResponseType = InferResponseType<
  (typeof client.api)[":email"]["projects"]["query"]["$get"]
>;

export const useGetQueryResponse = (email: string) => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api[":email"]["projects"]["query"]["$get"]({
        param: { email },
        query: json,
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["query", email], data);
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || "Something went wrong!");
    },
  });
};

import { client } from "@/lib/hono";
import { useQuery } from "@tanstack/react-query";

export const useGetProject = (email: string, id: string) => {
  return useQuery({
    queryKey: ["projects", email],
    queryFn: async () => {
      const res = await client.api[":email"].projects[":id"].$get({
        param: {
          email,
          id,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error("Failed to fetch projects");
      }
      const { data } = await res.json();
      return data;
    },
  });
};

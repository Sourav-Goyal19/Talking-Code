"use client";

import { Button } from "@/components/ui/button";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

const AuthForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(formSchema),
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        console.error("Sign-in error:", result.error);
        toast.error("Invalid Credentials");
      } else {
        toast.success("Login Successfully");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-blue-600 rounded-lg p-7 mt-5 max-w-[550px] mx-3 shadow-xl w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Email</FormLabel>
                <FormControl>
                  <Input
                    disabled={isLoading}
                    placeholder="Enter Your Email"
                    className="bg-custom1 border-[#374151] border-2 text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Password</FormLabel>
                <FormControl>
                  <Input
                    disabled={isLoading}
                    type="password"
                    placeholder="Enter Your Password"
                    className="bg-custom1 border-[#374151] border-2 text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-80 transition text-white"
          >
            Sign In
          </Button>
        </form>
      </Form>
      <div className="mt-4">
        <p className="text-center text-white">
          New Here?{" "}
          <Link href={"/sign-up"} className="font-medium underline">
            Create An Account
          </Link>{" "}
        </p>
      </div>
    </div>
  );
};

export default AuthForm;

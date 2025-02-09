"use client";

import { useState } from "react";
import axios from "axios";
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
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type variant = "signup" | "verify";

const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const signupSchema = z.object({
    name: z.string().min(3).trim(),
    email: z.string().email().trim(),
    password: z
      .string()
      .min(6, "Password must contain at least 6 character(s)")
      .trim(),
  });

  type SignupFormValues = z.infer<typeof signupSchema>;

  const signupForm = useForm<SignupFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(signupSchema),
  });

  const onSignupSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/users/signup", data);
      toast.success(response.data.message);
      router.push("/sign-in");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Signup error:", error.response?.data.error);
        toast.error(error.response?.data.error || "An error occurred");
      } else {
        console.error("An unexpected error occurred:", error);
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-blue-600 rounded-lg p-7 mt-5 max-w-[550px] mx-3 shadow-xl w-full">
      <Form {...signupForm}>
        <form
          onSubmit={signupForm.handleSubmit(onSignupSubmit)}
          className="space-y-5"
        >
          <FormField
            control={signupForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Name</FormLabel>
                <FormControl>
                  <Input
                    disabled={isLoading}
                    placeholder="Enter Your Name"
                    className="bg-custom1 border-[#374151] border-2 text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signupForm.control}
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
            control={signupForm.control}
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
            Sign Up
          </Button>
        </form>
      </Form>
      <div className="mt-4">
        <p className="text-center text-white">
          Already Have An Account?{" "}
          <Link href={"/sign-in"} className="font-medium underline">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;

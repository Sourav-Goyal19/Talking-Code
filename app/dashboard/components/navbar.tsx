"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  Bell,
  Home,
  MessageCircleQuestion,
  Search,
  Settings,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const Navbar = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data } = useSession();

  const navlinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Video", href: "/video", icon: Video },
    { name: "Query", href: "/query", icon: MessageCircleQuestion },
    { name: "Search", href: "/search", icon: Search },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-[#111827] fixed top-6 inset-x-6 px-4 py-4 rounded-lg lg:rounded-full shadow-lg z-50">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="bg-blue-500 rounded-full p-2">
            <Image src="/code.svg" alt="logo" height={25} width={25} />
          </Link>

          <div className="hidden lg:flex items-center gap-4 ml-4">
            {navlinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-full text-gray-300 hover:bg-slate-200 hover:text-black text-sm font-medium transition duration-200",
                  pathname === link.href && "bg-slate-100 text-black"
                )}
              >
                <link.icon size={20} />
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Image
            src="/black-and-white.jpg"
            alt="user"
            height={200}
            width={200}
            className="rounded-full object-cover h-10 w-10"
          />
          <Button className="hidden lg:block bg-blue-500 text-foreground px-12 py-2 rounded-full font-medium text-base hover:bg-blue-600 hover:opacity-80 tracking-wider">
            {data?.user?.name || "Premium Upgrade"}
          </Button>

          <button
            className="lg:hidden bg-gray-700 p-2 rounded-md text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div ref={menuRef} className="lg:hidden flex flex-col gap-4 mt-6">
          {navlinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "block bg-[#34373E] px-4 py-2 rounded-md text-gray-300 hover:bg-slate-200 hover:text-black text-sm font-medium transition",
                pathname === link.href && "bg-slate-100 text-black"
              )}
            >
              <link.icon size={20} className="inline-block mr-2" />
              {link.name}
            </Link>
          ))}
          <Button className="w-full bg-[#B1EE81] py-2 rounded-full font-semibold text-sm hover:bg-[#B1EE81] hover:opacity-80 text-white">
            {data?.user?.name || "Premium Upgrade"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Navbar;

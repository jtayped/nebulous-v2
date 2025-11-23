"use client";

import React from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Cog, Key, LogOut, PcCase, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

const CurrentUser = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={"icon-lg"}
          variant={"secondary"}
          className="size-12 rounded-full"
        >
          <User className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Cog className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {/* Credentials Link */}
              <DropdownMenuItem asChild>
                <Link href="/settings/keys" className="w-full cursor-pointer">
                  <Key className="mr-2 h-4 w-4" />
                  <span>Credentials</span>
                </Link>
              </DropdownMenuItem>

              {/* Nodes Link */}
              <DropdownMenuItem asChild>
                <Link
                  href="/settings/devices"
                  className="w-full cursor-pointer"
                >
                  <PcCase className="mr-2 h-4 w-4" />
                  <span>Devices</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CurrentUser;

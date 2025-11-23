import Header from "@/components/common/header";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import React from "react";

const FunctionalLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = await auth();
  if (!session) return redirect("/api/auth/signin");

  return (
    <div className="grid px-6">
      <Header />
      {children}
      <Toaster />
    </div>
  );
};

export default FunctionalLayout;

import Header from "@/components/common/header";
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
    <div className="grid">
      <Header />
      {children}
    </div>
  );
};

export default FunctionalLayout;

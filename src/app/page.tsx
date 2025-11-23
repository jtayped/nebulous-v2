import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  return (
    <div>
      {session ? (
        <Button asChild>
          <Link href={"/dashboard"}>Dashboard</Link>
        </Button>
      ) : (
        <Button asChild>
          <Link href={"/api/auth/signin"}>Sign in</Link>
        </Button>
      )}
    </div>
  );
}

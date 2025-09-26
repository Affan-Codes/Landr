import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import Navbar from "./_Navbar";

const AppLayout = async ({ children }: { children: ReactNode; }) => {

  const { userId, user } = await getCurrentUser({ allData: true });

  if (userId == null) return redirect("/");
  if (user == null) return redirect("/onboarding");

  return (
    <>
      <Navbar user={ user } />
      { children }
    </>
  );
};

export default AppLayout;

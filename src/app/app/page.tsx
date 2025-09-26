import { Loader2Icon } from "lucide-react";
import { Suspense } from "react";

const AppPage = () => {
  return (
    <Suspense fallback={
      <div className="h-screen-header flex items-center justify-center">
        <Loader2Icon className="size-24 animate-spin" />
      </div>
    }>
      <div className="container">
        <h1 className="text-2xl font-bold">Welcome to the App</h1>
      </div>
    </Suspense>
  );
};

export default AppPage;

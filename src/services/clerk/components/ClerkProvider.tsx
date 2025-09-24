import { ReactNode } from "react";
import { ClerkProvider as OriginalClerkProvider } from '@clerk/nextjs';

const ClerkProvider = ({ children }: { children: ReactNode; }) => {
  return (
    <OriginalClerkProvider>
      { children }
    </OriginalClerkProvider>
  );
};

export default ClerkProvider;

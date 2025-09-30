import { ThemeToggle } from '@/components/ThemeToggle';
import PricingTable from '@/services/clerk/components/PricingTable';
import { SignInButton, UserButton } from '@clerk/nextjs';

const HomePage = () => {
  return (
    <>
      <SignInButton />
      <UserButton />
      <ThemeToggle />
      <PricingTable />
    </>
  );
};

export default HomePage;

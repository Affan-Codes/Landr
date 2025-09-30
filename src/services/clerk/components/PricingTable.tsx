import { PricingTable as ClerkPricingTable } from '@clerk/nextjs';

const PricingTable = () => {
  return <ClerkPricingTable newSubscriptionRedirectUrl='/app' />;
};

export default PricingTable;

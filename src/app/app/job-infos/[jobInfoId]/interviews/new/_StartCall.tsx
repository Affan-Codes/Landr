"use client";

import { JobInfoTable } from '@/drizzle/schema';
import { useVoice } from '@humeai/voice-react';

const StartCall = ({ jobInfo, user, accessToken }: { accessToken: string, jobInfo: Pick<typeof JobInfoTable.$inferSelect, "id" | "title" | "description" | "experienceLevel">, user: { name: string, imageUrl: string; }; }) => {
  const { } = useVoice();

  return (
    <div>

    </div>
  );
};

export default StartCall;

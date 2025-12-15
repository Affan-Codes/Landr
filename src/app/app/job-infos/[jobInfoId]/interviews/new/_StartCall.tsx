"use client";

import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { env } from "@/data/env/client";
import { JobInfoTable } from "@/drizzle/schema";
import {
  createInterview,
  updateInterview,
} from "@/features/interviews/actions";
import { errorToast } from "@/lib/errorToast";
import CondensedMessages from "@/services/hume/components/CondensedMessages";
import { condenseChatMessages } from "@/services/hume/lib/condenseChatMessages";
import { useVoice, VoiceReadyState } from "@humeai/voice-react";
import { Loader2Icon, MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const StartCall = ({
  jobInfo,
  user,
  accessToken,
}: {
  accessToken: string;
  jobInfo: Pick<
    typeof JobInfoTable.$inferSelect,
    "id" | "title" | "description" | "experienceLevel"
  >;
  user: { name: string; imageUrl: string };
}) => {
  const {
    connect,
    readyState,
    chatMetadata,
    callDurationTimestamp,
    disconnect,
  } = useVoice();
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const router = useRouter();

  // Using refs to avoid stale closure issues
  const durationRef = useRef(callDurationTimestamp);
  const interviewIdRef = useRef<string | null>(null);
  const hasUpdatedChatId = useRef(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const readyStateRef = useRef(readyState);
  const disconnectRef = useRef(disconnect);

  durationRef.current = callDurationTimestamp;
  interviewIdRef.current = interviewId;
  readyStateRef.current = readyState;
  disconnectRef.current = disconnect;

  // Sync chat ID with guaranteed state availability
  useEffect(() => {
    const currentInterviewId = interviewIdRef.current;
    const currentChatId = chatMetadata?.chatId;

    // Guard against race condition
    if (!currentInterviewId || !currentChatId || hasUpdatedChatId.current) {
      return;
    }

    // Mark as updated BEFORE async operation
    hasUpdatedChatId.current = true;

    // Use async IIFE to handle promise properly
    (async () => {
      try {
        await updateInterview(currentInterviewId, {
          humeChatId: currentChatId,
        });
      } catch (error) {
        console.error("Failed to update interview with chat ID:", error);
        hasUpdatedChatId.current = false; // Allow retry
        errorToast("Failed to link interview session. Please try again.");
        disconnect(); // Cleanup on failure
      }
    })();
  }, [chatMetadata?.chatId, interviewId]);

  // Sync duration with exponential backoff
  useEffect(() => {
    if (!interviewIdRef.current) return;

    let attemptCount = 0;
    const maxAttempts = 3;

    const updateDuration = async () => {
      if (!durationRef.current || !interviewIdRef.current) return;

      try {
        await updateInterview(interviewIdRef.current, {
          duration: durationRef.current,
        });
        attemptCount = 0; // Reset on success
      } catch (error) {
        attemptCount++;
        console.error(`Duration sync failed (attempt ${attemptCount}):`, error);

        if (attemptCount >= maxAttempts) {
          console.error("Max duration sync attempts reached");
        }
      }
    };

    const intervalId = setInterval(updateDuration, 10000);

    return () => clearInterval(intervalId);
  }, [interviewId]);

  // Handle disconnects with proper cleanup
  useEffect(() => {
    if (readyState !== VoiceReadyState.CLOSED) return;

    const currentInterviewId = interviewIdRef.current;

    // Clear timeout on disconnect
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (!currentInterviewId) {
      router.push(`/app/job-infos/${jobInfo.id}/interviews`);
      return;
    }

    // Final duration sync before navigation
    (async () => {
      try {
        if (durationRef.current) {
          await updateInterview(currentInterviewId, {
            duration: durationRef.current,
          });
        }

        router.refresh();

        router.push(
          `/app/job-infos/${jobInfo.id}/interviews/${currentInterviewId}`
        );
      } catch (error) {
        console.error("Failed final sync:", error);
        
        router.refresh();
        // Navigate anyway to prevent stuck state
        router.push(
          `/app/job-infos/${jobInfo.id}/interviews/${currentInterviewId}`
        );
      }
    })();
  }, [readyState, router, jobInfo.id]);

  // Monitor connection state and clear timeout when connected
  useEffect(() => {
    if (readyState === VoiceReadyState.OPEN && connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
      setIsCreatingInterview(false);
    }
  }, [readyState]);

  // Atomic interview creation with retry logic
  const handleStartInterview = useCallback(async () => {
    if (isCreatingInterview) return;

    setIsCreatingInterview(true);

    try {
      // Create interview record FIRST
      const res = await createInterview({ jobInfoId: jobInfo.id });

      if (res.error) {
        errorToast(res.message);
        setIsCreatingInterview(false);
        return;
      }

      // Wait for state update to complete
      await new Promise<void>((resolve) => {
        setInterviewId(res.id);
        // Use setTimeout to ensure state is flushed
        setTimeout(resolve, 0);
      });

      // Set connection timeout BEFORE calling connect
      connectionTimeoutRef.current = setTimeout(() => {
        console.error("Hume connection timeout after 30 seconds");
        errorToast(
          "Connection timeout. Please check your network and try again."
        );
        setIsCreatingInterview(false);

        // Cleanup: disconnect if still trying
        if (readyStateRef.current === VoiceReadyState.CONNECTING) {
          disconnectRef.current();
        }

        // Navigate back to interviews list
        router.push(`/app/job-infos/${jobInfo.id}/interviews`);
      }, 30000);

      // NOW connect to Hume with guaranteed interviewId
      connect({
        auth: { type: "accessToken", value: accessToken },
        configId: env.NEXT_PUBLIC_HUME_CONFIG_ID,
        sessionSettings: {
          type: "session_settings",
          variables: {
            userName: user.name,
            title: jobInfo.title || "Not Specified",
            description: jobInfo.description,
            experienceLevel: jobInfo.experienceLevel,
          },
        },
      });
    } catch (error) {
      console.error("Interview creation failed:", error);
      errorToast("Failed to start interview. Please try again.");
      setIsCreatingInterview(false);

      // Clear timeout on error
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  }, [isCreatingInterview, jobInfo, user, accessToken, connect, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  if (readyState === VoiceReadyState.IDLE) {
    return (
      <div className="flex justify-center items-center h-screen-header">
        <Button
          size="lg"
          onClick={handleStartInterview}
          disabled={isCreatingInterview}
        >
          <LoadingSwap isLoading={isCreatingInterview}>
            Start Interview
          </LoadingSwap>
        </Button>
      </div>
    );
  }

  if (
    readyState === VoiceReadyState.CONNECTING ||
    readyState === VoiceReadyState.CLOSED
  ) {
    return (
      <div className="h-screen-header flex items-center justify-center">
        <Loader2Icon className="animate-spin size-24" />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-screen-header flex flex-col-reverse">
      <div className="container py-6 flex flex-col items-center justify-end gap-4">
        <Messages user={user} />
        <Controls />
      </div>
    </div>
  );
};

export default StartCall;

function Messages({ user }: { user: { name: string; imageUrl: string } }) {
  const { messages, fft } = useVoice();

  const condensedMessages = condenseChatMessages(messages || []);
  const maxFftValue = fft && fft.length > 0 ? Math.max(...fft) : 0;

  return (
    <CondensedMessages
      messages={condensedMessages}
      user={user}
      maxFft={maxFftValue}
      className="max-w-5xl"
    />
  );
}

function Controls() {
  const { disconnect, isMuted, mute, unmute, micFft, callDurationTimestamp } =
    useVoice();

  return (
    <div className="flex gap-5 rounded border px-5 py-2 w-fit sticky bottom-6 bg-background items-center">
      <Button
        variant="ghost"
        size="icon"
        className="-mx-3"
        onClick={() => (isMuted ? unmute() : mute())}
      >
        {isMuted ? <MicOffIcon className="text-destructive" /> : <MicIcon />}
        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>
      <div className="self-stretch">
        <FftVisualizer fft={micFft} />
      </div>
      <div className="text-sm text-muted-foreground tabular-nums">
        {callDurationTimestamp}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="-mx-3"
        onClick={disconnect}
      >
        <PhoneOffIcon className="text-destructive" />
        <span className="sr-only">End Call</span>
      </Button>
    </div>
  );
}

function FftVisualizer({ fft }: { fft: number[] }) {
  if (!fft || fft.length === 0) return null;

  return (
    <div className="flex gap-1 items-center h-full">
      {fft.map((value, index) => {
        const percent = (value / 4) * 100;
        return (
          <div
            key={index}
            className="min-h-0.5 bg-primary/75 w-0.5 rounded"
            style={{ height: `${percent < 10 ? 0 : percent}%` }}
          ></div>
        );
      })}
    </div>
  );
}

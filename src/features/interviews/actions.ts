"use server";

import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser";
import { cacheTag, revalidatePath } from "next/cache";
import { getJobInfoIdTag } from "../jobInfos/dbCache";
import { db } from "@/drizzle/db";
import { and, eq } from "drizzle-orm";
import { InterviewTable, JobInfoTable } from "@/drizzle/schema";
import { insertInterview, updateInterview as updateInterviewDb } from "./db";
import { getInterviewIdTag } from "./dbCache";
import { canCreateInterview } from "./permissions";
import { PLAN_LIMIT_MESSAGE, RATE_LIMIT_MESSAGE } from "@/lib/errorToast";
import arcjet, { request, tokenBucket } from "@arcjet/next";
import { env } from "@/data/env/server";
import { generateAiInterviewFeedback } from "@/services/ai/interviews";

const aj = arcjet({
  characteristics: ["userId"],
  key: env.ARCJET_KEY,
  rules: [
    tokenBucket({
      capacity: 12,
      refillRate: 4,
      interval: "1d",
      mode: "LIVE",
    }),
  ],
});

export async function createInterview({
  jobInfoId,
}: {
  jobInfoId: string;
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const { userId } = await getCurrentUser();
  if (userId == null) {
    return {
      error: true,
      message: "You don't have permission to do this.",
    };
  }

  // Permission check
  if (!(await canCreateInterview())) {
    return {
      error: true,
      message: PLAN_LIMIT_MESSAGE,
    };
  }

  // Rate Limit
  const decision = await aj.protect(await request(), { userId, requested: 1 });

  if (decision.isDenied()) {
    return {
      error: true,
      message: RATE_LIMIT_MESSAGE,
    };
  }

  // Verify job ownership
  const jobInfo = await getJobInfo(jobInfoId, userId);
  if (jobInfo == null) {
    return {
      error: true,
      message: "You don't have permission to do this.",
    };
  }

  try {
    // Retry logic for database operations
    let retryCount = 0;
    const maxRetries = 3;
    let interview: { id: string; jobInfoId: string } | null = null;

    while (retryCount < maxRetries && !interview) {
      try {
        interview = await insertInterview({
          jobInfoId,
          duration: "00:00:00",
        });
      } catch (error) {
        retryCount++;
        console.error(
          `Interview creation attempt ${retryCount} failed:`,
          error
        );

        if (retryCount >= maxRetries) {
          throw error;
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retryCount - 1))
        );
      }
    }

    if (!interview) {
      throw new Error("Failed to create interview after retries");
    }

    revalidatePath(`/app/job-infos/${jobInfoId}/interviews`);

    return { error: false, id: interview.id };
  } catch (error) {
    console.error("Interview creation failed:", error);
    return {
      error: true,
      message: "Failed to create interview. Please try again.",
    };
  }
}

export async function updateInterview(
  id: string,
  data: {
    humeChatId?: string;
    duration?: string;
  }
) {
  const { userId } = await getCurrentUser();
  if (userId == null) {
    return {
      error: true,
      message: "You don't have permission to do this.",
    };
  }

  try {
    const interview = await getInterview(id, userId);
    if (interview == null) {
      return {
        error: true,
        message: "You don't have permission to do this.",
      };
    }

    // Add retry logic and validation
    if (data.humeChatId) {
      // Ensure we don't overwrite existing chatId
      if (interview.humeChatId && interview.humeChatId !== data.humeChatId) {
        console.warn(`Attempted to overwrite chatId for interview ${id}`);
        return { error: false }; // Silent success, already linked
      }
    }

    let retryCount = 0;
    const maxRetries = 3;
    let success = false;

    while (retryCount < maxRetries && !success) {
      try {
        await updateInterviewDb(id, data);
        success = true;
      } catch (error) {
        retryCount++;
        console.error(`Interview update attempt ${retryCount} failed:`, error);

        if (retryCount >= maxRetries) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retryCount - 1))
        );
      }
    }

    revalidatePath(`/app/job-infos/${interview.jobInfo.id}/interviews`);
    revalidatePath(`/app/job-infos/${interview.jobInfo.id}/interviews/${id}`);

    return { error: false };
  } catch (error) {
    console.error("Interview update failed:", error);
    return {
      error: true,
      message: "Failed to update interview. Please try again.",
    };
  }
}

export async function generateInterviewFeedback(interviewId: string) {
  const { user, userId } = await getCurrentUser({ allData: true });
  if (userId == null || user == null) {
    return {
      error: true,
      message: "You don't have permission to do this",
    };
  }

  try {
    const interview = await getInterview(interviewId, userId);
    if (interview == null) {
      return {
        error: true,
        message: "You don't have permission to do this",
      };
    }

    if (interview.humeChatId == null) {
      return {
        error: true,
        message: "Interview has not been completed yet",
      };
    }

    const feedback = await generateAiInterviewFeedback({
      humeChatId: interview.humeChatId,
      jobInfo: interview.jobInfo,
      userName: user.name,
    });

    if (feedback == null) {
      return {
        error: true,
        message: "Failed to generate feedback",
      };
    }

    await updateInterviewDb(interviewId, { feedback });

    revalidatePath(
      `/app/job-infos/${interview.jobInfo.id}/interviews/${interviewId}`
    );

    return { error: false };
  } catch (error) {
    console.error("Feedback generation failed:", error);
    return {
      error: true,
      message: "Failed to generate feedback. Please try again.",
    };
  }
}

async function getJobInfo(id: string, userId: string) {
  "use cache";
  cacheTag(getJobInfoIdTag(id));

  return db.query.JobInfoTable.findFirst({
    where: and(eq(JobInfoTable.id, id), eq(JobInfoTable.userId, userId)),
  });
}

async function getInterview(id: string, userId: string) {
  "use cache";
  cacheTag(getInterviewIdTag(id));

  const interview = await db.query.InterviewTable.findFirst({
    where: eq(InterviewTable.id, id),
    with: {
      jobInfo: {
        columns: {
          id: true,
          userId: true,
          description: true,
          title: true,
          experienceLevel: true,
        },
      },
    },
  });

  if (interview == null) return null;

  cacheTag(getJobInfoIdTag(interview.jobInfo.id));
  if (interview.jobInfo.userId !== userId) return null;

  return interview;
}

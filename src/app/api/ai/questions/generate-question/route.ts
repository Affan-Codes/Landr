import { db } from "@/drizzle/db";
import {
  JobInfoTable,
  questionDifficulties,
  QuestionTable,
} from "@/drizzle/schema";
import { getJobInfoIdTag } from "@/features/jobInfos/dbCache";
import { canCreateQuestion } from "@/features/questions/permissions";
import { PLAN_LIMIT_MESSAGE } from "@/lib/errorToast";
import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser";
import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { getQuestionJobInfoTag } from "@/features/questions/dbCache";
import { generateAiQuestion } from "@/services/ai/questions";
import { insertQuestion } from "@/features/questions/db";
import { cacheTag } from "next/cache";

const schema = z.object({
  prompt: z.enum(questionDifficulties),
  jobInfoId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return new NextResponse("Error generating your question", { status: 400 });
  }

  const { prompt: difficulty, jobInfoId } = result.data;
  const { userId } = await getCurrentUser();

  if (userId == null) {
    return new NextResponse("You are not logged in", { status: 401 });
  }

  if (!(await canCreateQuestion())) {
    return new NextResponse(PLAN_LIMIT_MESSAGE, { status: 403 });
  }

  const jobInfo = await getJobInfo(jobInfoId, userId);
  if (jobInfo == null) {
    return new NextResponse("You do not have permission to do this", {
      status: 403,
    });
  }

  const previousQuestions = await getQuestions(jobInfoId);

  let questionId: string | null = null;

  const streamResult = generateAiQuestion({
    previousQuestions,
    jobInfo,
    difficulty,
    onFinish: async (question) => {
      const inserted = await insertQuestion({
        text: question,
        jobInfoId,
        difficulty,
      });
      questionId = inserted.id;
    },
  });

  // Transform the stream to append metadata
  const response = streamResult.toUIMessageStreamResponse();

  // Intercept the response to add questionId after streaming completes
  const originalBody = response.body;
  if (!originalBody) return response;

  const transformStream = new TransformStream({
    async flush(controller) {
      // After all chunks are sent, append the questionId as metadata
      if (questionId) {
        const metadataChunk = new TextEncoder().encode(
          `\n\n<!--QUESTION_ID:${questionId}-->`
        );
        controller.enqueue(metadataChunk);
      }
    },
  });

  return new Response(originalBody.pipeThrough(transformStream), {
    headers: response.headers,
  });
}

async function getQuestions(jobInfoId: string) {
  "use cache";
  cacheTag(getQuestionJobInfoTag(jobInfoId));

  return db.query.QuestionTable.findMany({
    where: eq(QuestionTable.jobInfoId, jobInfoId),
    orderBy: asc(QuestionTable.createdAt),
  });
}

async function getJobInfo(id: string, userId: string) {
  "use cache";
  cacheTag(getJobInfoIdTag(id));

  return db.query.JobInfoTable.findFirst({
    where: and(eq(JobInfoTable.id, id), eq(JobInfoTable.userId, userId)),
  });
}

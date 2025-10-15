import { db } from "@/drizzle/db";
import { QuestionTable } from "@/drizzle/schema";
import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobInfoId = searchParams.get("jobInfoId");

  if (!jobInfoId) {
    return new NextResponse("Missing jobInfoId", { status: 400 });
  }

  const { userId } = await getCurrentUser();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const latestQuestion = await db.query.QuestionTable.findFirst({
    where: eq(QuestionTable.jobInfoId, jobInfoId),
    orderBy: desc(QuestionTable.createdAt),
  });

  if (!latestQuestion) {
    return new NextResponse("No question found", { status: 404 });
  }

  return NextResponse.json({ questionId: latestQuestion.id });
}

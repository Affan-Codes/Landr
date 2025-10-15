"use client";

import BackLink from "@/components/BackLink";
import { MarkDownRenderer } from "@/components/MarkDownRenderer";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  JobInfoTable,
  questionDifficulties,
  QuestionDifficulty,
} from "@/drizzle/schema";
import { formatQuestionDifficulty } from "@/features/questions/formatters";
import { useMemo, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { errorToast } from "@/lib/errorToast";
import z from "zod";

type Status = "awaiting-answer" | "awaiting-difficulty" | "init";

const NewQuestionClientPage = ({
  jobInfo,
}: {
  jobInfo: Pick<typeof JobInfoTable.$inferSelect, "id" | "name" | "title">;
}) => {
  const [status, setStatus] = useState<Status>("init");
  const [answer, setAnswer] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);

  const {
    complete: generateQuestion,
    completion: question,
    setCompletion: setQuestion,
    isLoading: isGeneratingQuestion,
  } = useCompletion({
    api: "/api/ai/questions/generate-question",
    onFinish: async (prompt, completion) => {
      // Fetch the questionId after generation completes
      try {
        const response = await fetch(
          `/api/ai/questions/latest?jobInfoId=${jobInfo.id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch question ID");
        }

        const data = await response.json();
        setQuestionId(data.questionId);
        setStatus("awaiting-answer");
      } catch (error) {
        errorToast("Failed to fetch question ID");
        console.error(error);
      }
    },
    onError: (error) => {
      errorToast(error.message);
    },
  });

  const {
    complete: generateFeedback,
    completion: feedback,
    setCompletion: setFeedback,
    isLoading: isGeneratingFeedback,
  } = useCompletion({
    api: "/api/ai/questions/generate-feedback",
    onFinish: () => {
      setStatus("awaiting-difficulty");
    },
    onError: (error) => {
      errorToast(error.message);
    },
  });

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[2000px] mx-auto grow h-screen-header">
      <div className="container flex gap-4 mt-4 items-center justify-between">
        <div className="grow basis-0">
          <BackLink href={`/app/job-infos/${jobInfo.id}`}>
            {jobInfo.name}
          </BackLink>
        </div>

        <Controls
          reset={() => {
            setStatus("init");
            setQuestion("");
            setFeedback("");
            setAnswer(null);
            setQuestionId(null);
          }}
          disableAnswerButton={
            answer == null || answer.trim() === "" || questionId == null
          }
          status={status}
          isLoading={isGeneratingFeedback || isGeneratingQuestion}
          generateFeedback={() => {
            if (answer == null || answer.trim() === "" || questionId == null)
              return;

            generateFeedback(answer?.trim(), { body: { questionId } });
          }}
          generateQuestion={(difficulty) => {
            setQuestion("");
            setFeedback("");
            setAnswer(null);
            generateQuestion(difficulty, { body: { jobInfoId: jobInfo.id } });
          }}
        />

        <div className="grow hidden md:block" />
      </div>

      <QuestionContainer
        question={question}
        feedback={feedback}
        answer={answer}
        status={status}
        setAnswer={setAnswer}
      />
    </div>
  );
};

export default NewQuestionClientPage;

function QuestionContainer({
  question,
  feedback,
  answer,
  status,
  setAnswer,
}: {
  question: string | null;
  feedback: string | null;
  answer: string | null;
  status: Status;
  setAnswer: (value: string) => void;
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="grow border-t">
      <ResizablePanel id="question-and-feedback" defaultSize={50} minSize={5}>
        <ResizablePanelGroup direction="vertical" className="grow">
          <ResizablePanel id="question" defaultSize={25} minSize={5}>
            <ScrollArea className="h-full min-w-48 *:h-full">
              {status === "init" && question == null ? (
                <p className="text-base md:text-lg flex items-center justify-center h-full p-6">
                  Get started by selecting a question difficulty above.
                </p>
              ) : (
                question && (
                  <MarkDownRenderer className="p-6">
                    {question}
                  </MarkDownRenderer>
                )
              )}
            </ScrollArea>
          </ResizablePanel>

          {feedback && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel id="feedback" defaultSize={75} minSize={5}>
                <ScrollArea className="h-full min-w-48 *:h-full">
                  <MarkDownRenderer className="p-6">
                    {feedback}
                  </MarkDownRenderer>
                </ScrollArea>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel id="answer" defaultSize={50} minSize={5}>
        <ScrollArea className="h-full min-w-48 *:h-full ">
          <Textarea
            disabled={status !== "awaiting-answer"}
            onChange={(e) => setAnswer(e.target.value)}
            value={answer ?? ""}
            placeholder="Type your answer here..."
            className="w-full h-full resize-none border-none rounded-none focus-visible:ring focus-visible:ring-inset !text-base p-6"
          />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function Controls({
  status,
  isLoading,
  disableAnswerButton,
  generateQuestion,
  generateFeedback,
  reset,
}: {
  disableAnswerButton: boolean;
  status: Status;
  isLoading: boolean;
  generateQuestion: (difficulty: QuestionDifficulty) => void;
  generateFeedback: () => void;
  reset: () => void;
}) {
  return (
    <div className="flex gap-2">
      {status === "awaiting-answer" ? (
        <>
          <Button
            onClick={reset}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <LoadingSwap isLoading={isLoading}>Skip</LoadingSwap>
          </Button>
          <Button
            onClick={generateFeedback}
            disabled={disableAnswerButton}
            size="sm"
          >
            <LoadingSwap isLoading={isLoading}>Answer</LoadingSwap>
          </Button>
        </>
      ) : (
        questionDifficulties.map((difficulty) => (
          <Button
            key={difficulty}
            size="sm"
            disabled={isLoading}
            onClick={() => generateQuestion(difficulty)}
          >
            <LoadingSwap isLoading={isLoading}>
              {formatQuestionDifficulty(difficulty)}
            </LoadingSwap>
          </Button>
        ))
      )}
    </div>
  );
}

import { env } from "@/data/env/server";
import { ReturnChatEvent } from "hume/api/resources/empathicVoice";
import { HumeClient } from "hume/Client";
import { cacheTag } from "next/cache";

export async function fetchChatMessages(humeChatId: string) {
  "use cache";
  cacheTag(`hume-chat-${humeChatId}`);

  const client = new HumeClient({ apiKey: env.HUME_API_KEY });
  const allChatEvents: ReturnChatEvent[] = [];
  try {
    const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(
      humeChatId,
      { pageNumber: 0, pageSize: 100 }
    );

    for await (const chatEvent of chatEventsIterator) {
      allChatEvents.push(chatEvent);
    }

    return allChatEvents;
  } catch (error) {
    console.error(
      `Failed to fetch Hume messages for chat ${humeChatId}:`,
      error
    );
    throw new Error("Failed to load interview messages. Please try again.");
  }
}

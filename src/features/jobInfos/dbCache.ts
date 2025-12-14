import { getGlobalTag, getUserTag } from "@/lib/dataCache";
import { revalidateTag } from "next/cache";

export function getJobInfoGlobalTag() {
  return getGlobalTag("jobInfos");
}

export function getJobInfoUserTag(userId: string) {
  return getUserTag("jobInfos", userId);
}

export function getJobInfoIdTag(id: string) {
  return getUserTag("jobInfos", id);
}

export function revalidateJobInfoCache({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  revalidateTag(getJobInfoGlobalTag(), "max");
  revalidateTag(getJobInfoUserTag(userId), "max");
  revalidateTag(getJobInfoIdTag(id), "max");
}

"use server";

import { logger } from "@/lib/logger";

export async function reportClientError(info: {
  message: string;
  digest?: string;
  url?: string;
}) {
  logger.error(
    { action: "clientError", digest: info.digest, url: info.url },
    info.message
  );
}

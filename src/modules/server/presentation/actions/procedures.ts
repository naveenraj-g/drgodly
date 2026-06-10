"server-only";

import { createServerActionProcedure } from "zsa";
import { ZSAError } from "zsa";
import { getServerSession } from "@/modules/server/auth/get-session";

export const authenticatedProcedure = createServerActionProcedure().handler(
  async () => {
    const session = await getServerSession();
    if (!session?.user) {
      throw new ZSAError("NOT_AUTHORIZED", "You must be signed in.");
    }
    return { session };
  }
);

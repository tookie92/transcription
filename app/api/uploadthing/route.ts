import { createRouteHandler } from "uploadthing/next";

import { audioUploadRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: audioUploadRouter,
});
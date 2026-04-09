import { genUploader } from "uploadthing/client";

import type { AudioUploadRouter } from "./uploadthing";

export type { AudioUploadRouter };

export const { uploadFiles } = genUploader<AudioUploadRouter>();
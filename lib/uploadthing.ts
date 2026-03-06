import { UTApi } from "uploadthing/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const audioUploadRouter = {
  audioUploader: f({ audio: { maxFileSize: "512GB", maxFileCount: 1 } }).onUploadComplete(
    async ({ file }) => {
      return { url: file.ufsUrl };
    }
  ),
} satisfies FileRouter;

export type AudioUploadRouter = typeof audioUploadRouter;

export const utapi = new UTApi();

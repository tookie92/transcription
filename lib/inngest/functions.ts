import { inngest } from "./client";

const PYANNOTE_API_URL = process.env.PYANNOTE_API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 600000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const runDiarization = inngest.createFunction(
  {
    id: "run-diarization",
    name: "Run Speaker Diarization",
  },
  { event: "transcription/diarize" },
  async ({ event, step }) => {
    const { interviewId, audioUrl, segments, projectId } = event.data;

    if (!PYANNOTE_API_URL) {
      throw new Error("PYANNOTE_API_URL not configured");
    }

    const fullAudioUrl = audioUrl.startsWith("http") 
      ? audioUrl 
      : `${SITE_URL}${audioUrl}`;
    
    const audioResponse = await fetch(fullAudioUrl);
    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });

    const diarizeFormData = new FormData();
    diarizeFormData.append("audio", audioFile);
    diarizeFormData.append(
      "segments",
      JSON.stringify(
        segments.map((s: { start: number; end: number; text: string }) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        }))
      )
    );

    const diarizeResponse = await fetchWithTimeout(
      `${PYANNOTE_API_URL}/diarize`,
      {
        method: "POST",
        body: diarizeFormData,
      },
      600000
    );

    if (!diarizeResponse.ok) {
      const error = await diarizeResponse.text();
      throw new Error(`Diarization failed: ${error}`);
    }

    const diarizeData = await diarizeResponse.json();

    await step.run("update-interview", async () => {
      const response = await fetch(`/api/inngest-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          projectId,
          segments: diarizeData.segments,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update interview with diarization");
      }
    });

    return {
      status: "completed",
      interviewId,
      speakers: diarizeData.speakers,
    };
  }
);

export const functions = [runDiarization];

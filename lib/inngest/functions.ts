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

    console.log("[Inngest] Starting diarization for interview:", interviewId);
    console.log("[Inngest] Number of segments:", segments?.length);
    console.log("[Inngest] Audio URL:", audioUrl);

    if (!PYANNOTE_API_URL) {
      throw new Error("PYANNOTE_API_URL not configured");
    }

    if (!audioUrl) {
      throw new Error("Audio URL is required");
    }

    // Build full audio URL if needed
    const fullAudioUrl = audioUrl.startsWith("http") 
      ? audioUrl 
      : `${SITE_URL}${audioUrl}`;
    
    console.log("[Inngest] Fetching audio from:", fullAudioUrl);

    const audioResponse = await fetch(fullAudioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
    }
    
    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });

    console.log("[Inngest] Audio file prepared, sending to PyAnnote...");

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
      console.error("[Inngest] Diarization failed:", error);
      throw new Error(`Diarization failed: ${error}`);
    }

    const diarizeData = await diarizeResponse.json();
    console.log("[Inngest] Diarization successful, speakers:", diarizeData.speakers);

    await step.run("update-interview", async () => {
      console.log("[Inngest] Updating interview with speaker segments...");
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
      console.log("[Inngest] Interview updated successfully!");
    });

    return {
      status: "completed",
      interviewId,
      speakers: diarizeData.speakers,
    };
  }
);

export const functions = [runDiarization];

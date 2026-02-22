const PYANNOTE_API_URL = process.env.PYANNOTE_API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 300000) {
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

async function checkHealth() {
  if (!PYANNOTE_API_URL) return false;
  try {
    const response = await fetch(`${PYANNOTE_API_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { interviewId, projectId, audioUrl, segments } = await request.json();

    if (!interviewId || !audioUrl || !segments) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Diarization is optional - skip if not configured or service unavailable
    if (!PYANNOTE_API_URL) {
      return Response.json({
        status: "skipped",
        reason: "PYANNOTE_API_URL not configured",
      });
    }

    const isHealthy = await checkHealth();
    if (!isHealthy) {
      return Response.json({
        status: "skipped",
        reason: "Diarization service is sleeping. Visit " + PYANNOTE_API_URL + " to wake it up.",
        code: "SERVICE_ASLEEP"
      });
    }

    const fullAudioUrl = audioUrl.startsWith("http") 
      ? audioUrl 
      : `${SITE_URL}${audioUrl}`;

    const audioResponse = await fetch(fullAudioUrl);
    if (!audioResponse.ok) {
      return Response.json({
        status: "skipped",
        reason: `Failed to fetch audio: ${audioResponse.status}`,
      });
    }

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
      }
    );

    if (!diarizeResponse.ok) {
      return Response.json({
        status: "skipped",
        reason: "Diarization request failed",
      });
    }

    const diarizeData = await diarizeResponse.json();

    const updateResponse = await fetch(`/api/inngest-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interviewId,
        projectId,
        segments: diarizeData.segments,
      }),
    });

    return Response.json({
      status: "completed",
      speakers: diarizeData.speakers,
    });
  } catch (error) {
    // Don't fail the whole transcription if diarization fails
    console.error("Diarization error:", error);
    return Response.json({
      status: "skipped",
      reason: "Diarization error: " + (error instanceof Error ? error.message : "Unknown"),
    });
  }
}

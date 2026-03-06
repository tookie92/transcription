import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

export const http = {
  updateSegmentsWithSpeakers: httpAction(async (ctx, request) => {
    const { interviewId, segments } = await request.json();

    if (!interviewId || !segments) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }

    await ctx.runMutation(api.interviews.updateSegmentsWithSpeakers, {
      interviewId,
      segments,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  }),
};

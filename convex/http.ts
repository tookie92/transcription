import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/updateSegmentsWithSpeakers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
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
});

export default http;

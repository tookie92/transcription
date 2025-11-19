/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as affinityMaps from "../affinityMaps.js";
import type * as analytics from "../analytics.js";
import type * as comments from "../comments.js";
import type * as connections from "../connections.js";
import type * as dotVoting from "../dotVoting.js";
import type * as export_ from "../export.js";
import type * as insights from "../insights.js";
import type * as interviews from "../interviews.js";
import type * as notificationService from "../notificationService.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as projects from "../projects.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  affinityMaps: typeof affinityMaps;
  analytics: typeof analytics;
  comments: typeof comments;
  connections: typeof connections;
  dotVoting: typeof dotVoting;
  export: typeof export_;
  insights: typeof insights;
  interviews: typeof interviews;
  notificationService: typeof notificationService;
  notifications: typeof notifications;
  presence: typeof presence;
  projects: typeof projects;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};

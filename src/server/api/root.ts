import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { catalogRouter } from "./routers/catalog";
import { clusterRouter } from "./routers/cluster";
import { credentialsRouter } from "./routers/credentials";
import { deploymentRouter } from "./routers/deployment";
import { edgeRouter } from "./routers/edge";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  catalog: catalogRouter,
  cluster: clusterRouter,
  credentials: credentialsRouter,
  deployment: deploymentRouter,
  edge: edgeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

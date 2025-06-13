import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // return ctx.db.post.create({
      //   data: {
      //     name: input.name,
      //   },
      // });
      const post = {
        name: "Test Post",
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return post;
    }),

  getLatest: publicProcedure.query(async ({ ctx }) => {
    // const post = await ctx.db.post.findFirst({
    //   orderBy: { createdAt: "desc" },
    // });

    // Mock return data for now
    const post = {
      name: "Test Post",
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return post;
  }),
});

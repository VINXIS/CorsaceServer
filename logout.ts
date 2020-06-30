import Router from "koa-router";

const logoutRouter = new Router();

logoutRouter.get("/", async (ctx) => {
    // @ts-ignore
    if (ctx.isAuthenticated()) {
        // @ts-ignore
        await ctx.logout();
        ctx.redirect("back");
    } else {
        ctx.body = { error: "Unable to logout!" };
        ctx.throw(401);
    }
});


export default logoutRouter;
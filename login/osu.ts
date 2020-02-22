import Router from 'koa-router';
import passport from "koa-passport";

const osuRouter = new Router();

osuRouter.get("/", passport.authenticate("oauth2", { scope: ["identify"] }))
osuRouter.get("/callback", passport.authenticate("oauth2", { scope: ["identify"], failureRedirect: "/" }), async (ctx) => {
    await ctx.redirect('/');
})

export default osuRouter;
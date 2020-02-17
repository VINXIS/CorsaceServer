import Router from 'koa-router';
import passport from "koa-passport";

const discordRouter = new Router();

discordRouter.get("/", passport.authenticate("discord", { scope: ["identify", "guilds.join"]}))
discordRouter.get("/callback", async (ctx) => {
    // @ts-ignore
    return await passport.authenticate("discord", { scope: ["identify", "guilds.join"], failureRedirect: "/" }, (err, user) => {
        if (user) {
            // @ts-ignore
            ctx.login(user);
            ctx.redirect('/');
        } else {
            ctx.status = 400;
            ctx.body = { error: err };
        }
    })(ctx)
})

export default discordRouter;
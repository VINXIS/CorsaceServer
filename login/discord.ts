import Router from "koa-router";
import passport from "koa-passport";
import { isLoggedInOsu } from "../middleware";

const discordRouter = new Router();

discordRouter.get("/", isLoggedInOsu, passport.authenticate("discord", { scope: ["identify", "guilds.join"]}));
discordRouter.get("/callback", async (ctx) => {
    // @ts-ignore
    return await passport.authenticate("discord", { scope: ["identify", "guilds.join"], failureRedirect: "/" }, async (err, user) => {
        if (user) {
            if (ctx.state.user) {
                ctx.state.user.discord = user.discord;
                user = ctx.state.user;
            }
            await user.save();
            // @ts-ignore
            ctx.login(user);
            ctx.redirect("back");
        } else {
            ctx.status = 400;
            ctx.body = { error: err };
        }
    })(ctx);
});

export default discordRouter;
import Router from "koa-router";
import passport from "koa-passport";
import discordClient from "../discord";
import { Config } from "../../config";

const discordRouter = new Router();
const config = new Config();

discordRouter.get("/", passport.authenticate("discord", { scope: ["identify", "guilds.join"]}));
discordRouter.get("/callback", async (ctx) => {
    // @ts-ignore
    return await passport.authenticate("discord", { scope: ["identify", "guilds.join"], failureRedirect: "/" }, async (err, user) => {
        if (user) {
            if (ctx.state.user) {
                ctx.state.user.discord = user.discord;
                user = ctx.state.user;
            } else if (!user.osu)
            {
                ctx.body = { error: "There is no osu! account linked to this discord account! Please register via osu! first." };
                return;
            }

            await user.save();

            // Add user to server if they aren't there yet
            let discordUser = discordClient.getGuild().members.get(user.discord.userID);
            if (!discordUser) {
                discordUser = await discordClient.getGuild().addMember(await discordClient.fetchUser(user.discord.userID), {
                    accessToken: user.discord.accessToken,
                    nick: user.osu.username,
                    roles: [config.discord.roles.corsace.verified],
                });
            } else {
                await discordUser.setNickname(user.osu.username);
            }

            // @ts-ignore
            ctx.login(user);
            ctx.redirect("back");
        } else {
            ctx.status = 400;
            ctx.body = { error: err.message };
        }
    })(ctx);
});

export default discordRouter;
import Router from "koa-router";
import passport from "koa-passport";
import Axios from "axios";
import { MCAEligibility } from "../../CorsaceModels/MCA_AYIM/mcaEligibility";
import { Config } from "../../config";
import { UsernameChange } from "../../CorsaceModels/usernameChange";

const osuRouter = new Router();
const config = new Config();
const mode = [
    "standard",
    "taiko",
    "fruits",
    "mania",
];

osuRouter.get("/", passport.authenticate("oauth2", { scope: ["identify", "public"] }));
osuRouter.get("/callback", async (ctx, next) => {
    // @ts-ignore
    return await passport.authenticate("oauth2", { scope: ["identify", "public"], failureRedirect: "/" }, async (err, user) => {
        if (user) {
            if (ctx.state.user) {
                await ctx.state.user.remove();
                ctx.state.user.ID = user.ID;
                ctx.state.user.osu = user.osu;
                user = ctx.state.user;
            }

            await user.save();
            // @ts-ignore
            ctx.login(user);
            await next();
        } else {
            ctx.status = 400;
            ctx.body = { error: err };
        }
    })(ctx);
}, async (ctx, next) => {
    // Username changes
    const res = await Axios.get("https://osu.ppy.sh/api/v2/me", {
        headers: {
            Authorization: `Bearer ${ctx.state.user.osu.accessToken}`,
        },
    });
    const usernames: string[] = res.data.previous_usernames;
    for (const name of usernames) {
        let nameChange = await UsernameChange.findOne({ name, user: ctx.state.user });
        if (!nameChange) {
            nameChange = new UsernameChange;
            nameChange.name = name;
            nameChange.user = ctx.state.user;
            await nameChange.save();
        }
    }
    await next();
}, async ctx => {
    // MCA data
    const beatmaps = (await Axios.get(`https://osu.ppy.sh/api/get_beatmaps?k=${config.osuV1}&u=${ctx.state.user.osu.userID}`)).data;
    if (beatmaps.length != 0) {
        for (const beatmap of beatmaps) {
            if (!beatmap.version.includes("'") && (beatmap.approved == 2 || beatmap.approved == 1)) {
                const date = new Date(beatmap.approved_date);
                const year = date.getUTCFullYear();
                let eligibility = await MCAEligibility.findOne({ relations: ["user"], where: { year: year, user: { ID: ctx.state.user.ID } }});
                if (!eligibility) {
                    eligibility = new MCAEligibility();
                    eligibility.year = year;
                    eligibility.user = ctx.state.user;
                }
                
                if (!eligibility[mode[beatmap.mode]]) {
                    eligibility[mode[beatmap.mode]] = true;
                    eligibility.storyboard = true;
                    await eligibility.save();
                    const i = ctx.state.user.mcaEligibility.findIndex((e: MCAEligibility) => e.year === year);
                    if (i === -1)
                        ctx.state.user.mcaEligibility.push(eligibility);
                    else
                        ctx.state.user.mcaEligibility[i] = eligibility;
                }
            }
        }
    }
    ctx.redirect("back");
});

export default osuRouter;
import { Strategy as DiscordStrategy } from "passport-discord";
import OAuth2Strategy from "passport-oauth2";
import { User, OAuth } from "../CorsaceModels/user";
import Axios from "axios";
import { Eligibility } from "../CorsaceModels/MCA_AYIM/eligibility";
import { Config } from "../config";


async function discordPassport(accessToken: string, refreshToken: string, profile: DiscordStrategy.Profile, done: OAuth2Strategy.VerifyCallback): Promise<void> {
    try {
        let user = await User.findOne({ 
            discord: {
                userID: profile.id,
            },
        });

        if (!user)
        {
            user = new User;
            user.discord = new OAuth;
            user.discord.dateAdded = new Date;
        }

        user.discord.userID = profile.id
        user.discord.username = profile.username
        user.discord.accessToken = accessToken;
        user.discord.refreshToken = refreshToken;
        user.discord.avatar = profile.avatar;
        user.lastLogin = user.discord.lastVerified = new Date();

        await user.save();
        done(null, user);
    } catch(error) {
        console.log("Error while authenticating user via Discord", error);
        done(error, null);
    }
}

async function osuPassport(accessToken: string, refreshToken: string, profile: any, done: OAuth2Strategy.VerifyCallback): Promise<void> {
    const config = new Config();
    const mode = [
        "standard",
        "taiko",
        "fruits",
        "mania"
    ]
    try {
        const res = await Axios.get("https://osu.ppy.sh/api/v2/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        const userProfile = res.data;
        let user = await User.findOne({ 
            osu: {
                userID: userProfile.id,
            },
        });

        if (!user) {
            user = new User;
            user.osu = new OAuth;
            user.osu.dateAdded = new Date;
        }

        user.osu.userID = userProfile.id;
        user.osu.username = userProfile.username;
        user.osu.avatar = "https://a.ppy.sh/" + userProfile.id;
        user.osu.accessToken = accessToken;
        user.osu.refreshToken = refreshToken;
        user.osu.dateAdded = user.osu.lastVerified = user.lastLogin = user.registered = new Date();
        user.mca = [];

        // MCA data
        const beatmaps = (await Axios.get(`https://osu.ppy.sh/api/get_beatmaps?k=${config.osuV1}&u=${user.osu.userID}`)).data
        if (beatmaps.length != 0) {
            for (const beatmap of beatmaps) {
                if (!beatmap.version.includes("'") && (beatmap.approved == 2 || beatmap.approved == 1)) {
                    const date = new Date(beatmap.approved_date)
                    const year = date.getUTCFullYear();
                    let eligibility = await Eligibility.findOne({ relations: ["user"], where: { year: year, user: { id: user.ID } }});
                    if (!eligibility) {
                        eligibility = new Eligibility();
                        eligibility.year = year
                        eligibility.user = user
                    }
                    
                    if (!eligibility[mode[beatmap.mode]]) {
                        eligibility[mode[beatmap.mode]] = true
                        await eligibility.save()
                        const i = user.mca.findIndex(e => e.year === year)
                        if (i === -1)
                            user.mca.push(eligibility)
                        else
                            user.mca[i] = eligibility
                    }
                }
            }
        }

        await user.save();
        done(null, user);
    } catch (error) {
        done(error, null);
    }
}

export { discordPassport, osuPassport }
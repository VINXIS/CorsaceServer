import { Strategy as DiscordStrategy } from "passport-discord";
import OAuth2Strategy from "passport-oauth2";
import { User, OAuth } from "../CorsaceModels/user";
import Axios from "axios";
import { discordClient } from "./discord";


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
            user.discord.dateAdded = user.registered = new Date;
        }

        user.discord.userID = profile.id;
        user.discord.username = profile.username;
        user.discord.accessToken = accessToken;
        user.discord.refreshToken = refreshToken;
        user.discord.avatar = (await discordClient.users.fetch(profile.id)).displayAvatarURL();
        user.lastLogin = user.discord.lastVerified = new Date;

        done(null, user);
    } catch(error) {
        console.log("Error while authenticating user via Discord", error);
        done(error, undefined);
    }
}

async function osuPassport(accessToken: string, refreshToken: string, profile: any, done: OAuth2Strategy.VerifyCallback): Promise<void> {
    try {
        const res = await Axios.get("https://osu.ppy.sh/api/v2/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const userProfile = res.data;
        let user = await User.findOne({ 
            osu: {
                userID: userProfile.id,
            },
        });

        if (!user) {
            user = new User;
            user.osu = new OAuth;
            user.osu.dateAdded = user.registered = new Date;
        }

        user.osu.userID = userProfile.id;
        user.osu.username = userProfile.username;
        user.osu.avatar = "https://a.ppy.sh/" + userProfile.id;
        user.osu.accessToken = accessToken;
        user.osu.refreshToken = refreshToken;
        user.osu.lastVerified = user.lastLogin = new Date;
        user.mcaEligibility = [];

        done(null, user);
    } catch (error) {
        done(error, undefined);
    }
}

export { discordPassport, osuPassport };
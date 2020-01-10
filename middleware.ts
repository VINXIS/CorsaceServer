import { Config } from "../config";
import { discordGuild } from "./discord"

// General middlewares
const config = new Config();


async function isLoggedIn(ctx, next) {
    if (!ctx.state.user) {
        return ctx.body = { error: "No user found!" }
    }

   return next()
}

async function isStaff(ctx, next) {
    if (!ctx.state.user.discord.accessToken) {
        return ctx.body = { error: "User is not logged in via discord!" }
    }

    const member = await discordGuild.fetchMember(ctx.state.user.discord.userID)
    if (member) {
        const roles = [
            config.discord.roles.corsace.staff,
            config.discord.roles.open.staff,
            config.discord.roles.invitational.staff,
            config.discord.roles.mca.staff,
        ]
        for (let role of roles)
            if (member.roles.has(role))
                next()
    }
    
    return ctx.body = { error: "User is not a staff member!" }
}

function hasRole(section: string, role: string) {
    return async (ctx, next) => {
        if (!ctx.state.user.discord.accessToken)
            return ctx.body = { error: "User is not logged in via discord!" }
        
        const member = await discordGuild.fetchMember(ctx.state.user.discord.userID)
        if (member && (member.roles.has(config.discord.roles[section][role]) || member.roles.has(config.discord.roles.corsace.corsace)))
            return next()
        
        return ctx.body = { error: "User does not have the " + role + " role!" }
    }
}

const isCorsace = hasRole("corsace", "corsace")

export { isLoggedIn, isStaff, isCorsace }
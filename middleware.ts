import { Config } from "../config";
import { discordGuild } from "./discord"

// General middlewares
const config = new Config();


async function isLoggedIn(ctx, next): Promise<void> {
    if (!ctx.state.user) {
        ctx.body = { error: "No user found!" }
        return
    }

   await next()
}

async function isStaff(ctx, next): Promise<void> {
    if (!ctx.state.user.discord.accessToken) {
        ctx.body = { error: "User is not logged in via discord!" }
        return 
    }

    const member = await discordGuild.fetchMember(ctx.state.user.discord.userID)
    if (member) {
        const roles = [
            config.discord.roles.corsace.staff,
            config.discord.roles.open.staff,
            config.discord.roles.invitational.staff,
            config.discord.roles.mca.staff,
        ]
        for (const role of roles)
            if (member.roles.has(role)) {
                await next()
                return
            }
    }
    
    ctx.body = { error: "User is not a staff member!" }
    return 
}

function hasRole(section: string, role: string) {
    return async (ctx, next): Promise<void> => {
        if (!ctx.state.user.discord.accessToken) {
            ctx.body = { error: "User is not logged in via discord!" }
            return
        }
        
        const member = await discordGuild.fetchMember(ctx.state.user.discord.userID)
        if (member && (member.roles.has(config.discord.roles[section][role]) || member.roles.has(config.discord.roles.corsace.corsace))) {
            await next()    
            return
        } 
        
        ctx.body = { error: "User does not have the " + role + " role!" }
        return
    }
}

const isCorsace = hasRole("corsace", "corsace")

export { isLoggedIn, isStaff, isCorsace }
import { Config } from "../config";
import discordClient from "./discord";
import { ParameterizedContext, Next } from "koa";
import Router from "koa-router";

// General middlewares
const config = new Config();

async function isLoggedIn(ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>>, next: Next): Promise<void> {
    if (!ctx.state.user) {
        ctx.body = { error: "No user found!" };
        return;
    }

    await next();
}

async function isLoggedInDiscord(ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>>, next: Next): Promise<void> {
    if (!ctx.state.user?.discord?.accessToken) {
        ctx.body = { error: "User is not logged in via discord!" };
        return; 
    }

    await next();
}

async function isLoggedInOsu(ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>>, next: Next): Promise<void> {
    if (!ctx.state.user?.osu?.accessToken) {
        ctx.body = { error: "User is not logged in via osu!" };
        return; 
    }

    await next();
}

async function isStaff(ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>>, next: Next): Promise<void> {
    const member = await discordClient.getGuild().fetchMember(ctx.state.user.discord.userID);
    if (member) {
        const roles = [
            config.discord.roles.corsace.staff,
            config.discord.roles.open.staff,
            config.discord.roles.invitational.staff,
            config.discord.roles.mca.staff,
        ];
        for (const role of roles)
            if (member.roles.has(role)) {
                await next();
                return;
            }
    }
    
    ctx.body = { error: "User is not a staff member!" };
    return; 
}

function hasRole(section: string, role: string) {
    return async (ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>>, next: Next): Promise<void> => {
        const member = await discordClient.getGuild().fetchMember(ctx.state.user.discord.userID);
        if (member && (member.roles.has(config.discord.roles[section][role]) || member.roles.has(config.discord.roles.corsace.corsace))) {
            await next();    
            return;
        } 
        
        ctx.body = { error: "User does not have the " + role + " role!" };
        return;
    };
}

const isCorsace = hasRole("corsace", "corsace");

export { isLoggedIn, isLoggedInDiscord, isLoggedInOsu, isStaff, isCorsace, hasRole };
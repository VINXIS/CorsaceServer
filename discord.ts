import * as Discord from "discord.js";
import { Config } from "../config";

const config = new Config();

const discordClient = new Discord.Client;

discordClient.login(config.discord.token).then(() => {
    console.log("Logged into discord!");
}).catch(err => {if (err) throw err;});

const discordGuild = (): Discord.Guild => discordClient.guilds.get(config.discord.guild) as Discord.Guild;

export { discordClient, discordGuild };
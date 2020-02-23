import * as Discord from "discord.js";
import { Config } from "../config";

const config = new Config();

const discordClient = new Discord.Client;
let discordGuild: Discord.Guild;

discordClient.login(config.discord.token).then(() => {
    console.log("Logged into discord!");
    discordGuild = discordClient.guilds.get(config.discord.guild) as Discord.Guild;
}).catch(err => {if (err) throw err;});

export { discordClient, discordGuild };
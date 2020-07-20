import * as Discord from "discord.js";
import { Config } from "../config";

const config = new Config();

class CorsaceDiscordClient extends Discord.Client {
    constructor() {
        super();
    }

    public getGuild(): Discord.Guild {
        return this.guilds.get(config.discord.guild) as Discord.Guild;
    }
}

const discordClient = new CorsaceDiscordClient;

discordClient.login(config.discord.token).then(() => {
    console.log("Logged into discord!");
}).catch(err => {if (err) throw err;});

export default discordClient;
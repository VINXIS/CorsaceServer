import { createConnection } from "typeorm";
import { Config } from "../../config";
import axios from "axios";
import { ModeDivisionType, ModeDivision } from "../../CorsaceModels/MCA_AYIM/modeDivision";
import { Beatmapset } from "../../CorsaceModels/beatmapset";
import { Beatmap } from "../../CorsaceModels/beatmap";
import { User, OAuth } from "../../CorsaceModels/user";
import { UsernameChange } from "../../CorsaceModels/usernameChange";
import { MCAEligibility } from "../../CorsaceModels/MCA_AYIM/mcaEligibility";

const config = new Config();
const args = process.argv.slice(2); // Year to get the maps for
const year = parseInt(args[0]);
if (Number.isNaN(year))
{
    console.error("Please provide a valid year!");
    process.exit(1);
}

const genres = [
    "any",
    "unspecified",
    "video game",
    "anime",
    "rock",
    "pop",
    "other",
    "novelty",
    "---",
    "hip hop",
    "electronic",
    "metal",
    "classical",
    "folk",
    "jazz",
];

const langs = [
    "any",
    "unspecified",
    "english",
    "japanese",
    "chinese",
    "instrumental",
    "korean",
    "french",
    "german",
    "swedish",
    "spanish",
    "italian",
    "russian",
    "polish",
    "other",
];

const modeList = [
    "standard",
    "taiko",
    "fruits",
    "mania",
];

function createSet(map: any): Beatmapset {
    
    const dbSet = new Beatmapset;
    dbSet.ID = parseInt(map.beatmapset_id);

    dbSet.approvedDate = new Date(map.approved_date);
    dbSet.submitDate = new Date(map.submit_date);

    dbSet.BPM = parseFloat(map.bpm);

    dbSet.artist = map.artist;
    dbSet.title = map.title;

    dbSet.genre = genres[map.genre_id];
    dbSet.language = langs[map.language_id];

    dbSet.tags = map.tags;

    dbSet.favourites = parseInt(map.favourite_count);

    return dbSet;
}

async function createMap(map: any): Promise<Beatmap> {
    const dbMap = new Beatmap;
    dbMap.ID = parseInt(map.beatmap_id);
    
    // see if mode exists already, if it doesn't then add it
    let mode = await ModeDivision.findOne(parseInt(map.mode)+1);
    if (!mode) {
        mode = new ModeDivision;
        mode.ID = parseInt(map.mode)+1;
        mode.name = ModeDivisionType[mode.ID];
        await mode.save();
    }
    dbMap.mode = mode;

    dbMap.difficulty = map.version;

    dbMap.circleSize = parseFloat(map.diff_size);
    dbMap.approachRate = parseFloat(map.diff_approach);
    dbMap.overallDifficulty = parseFloat(map.diff_overall);
    dbMap.hpDrain = parseFloat(map.diff_drain);

    dbMap.circles = parseInt(map.count_normal);
    dbMap.sliders = parseInt(map.count_slider);
    dbMap.spinners = parseInt(map.count_spinner);

    dbMap.rating = parseFloat(map.rating);
    dbMap.passCount = parseInt(map.passcount);
    dbMap.playCount = parseInt(map.playcount);

    dbMap.hitLength = parseInt(map.hit_length);
    dbMap.totalLength = parseInt(map.total_length);

    dbMap.totalSR = parseFloat(map.difficultyrating);

    if (map.diff_aim)
        dbMap.aimSR = parseFloat(map.diff_aim);
    if (map.diff_speed)
        dbMap.speedSR = parseFloat(map.diff_speed);
    if (map.max_combo)
        dbMap.maxCombo = parseInt(map.max_combo);
    if (map.packs)
        dbMap.packs = map.packs;
    if (map.storyboard == 1)
        dbMap.storyboard = true;
    if (map.video == 1)
        dbMap.video = true;
    
    return dbMap;
}

async function fetchYearMaps(): Promise<void> {
    // Connect
    const start = new Date;
    console.log("Connecting to the DB...");
    try {
        const connection = await createConnection({
            "type": "mariadb",
            "host": "localhost",
            "username": config.database.username,
            "password": config.database.password,
            "database": config.database.name,
            "timezone": "Z",
            "synchronize": true,
            "logging": false,
            "entities": [
                __dirname + "/../../CorsaceModels/**/*{.ts,.js}",
            ],
        });

        console.log("Connected to the " + connection.options.database + " database!");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }

    // In case storyboard mode doesn't exist
    let mode = await ModeDivision.findOne(5);
    if (!mode)
    {
        mode = new ModeDivision;
        mode.ID = 5;
        mode.name = ModeDivisionType[5];
        await mode.save();
    }

    // Start a loop in obtaining the beatmaps
    let date = year + "-01-01";
    let mapNum = 0;
    for (;;) {
        try {
            const maps = (await axios.get("https://osu.ppy.sh/api/get_beatmaps?k=" + config.osuV1 + "&since=" + date)).data;
            for (const map of maps) {
                // Check if this map's date year is the same as the year that was given
                if (new Date(map.approved_date).getFullYear() !== year) {
                    console.log("Final " + year + " map was found.");
                    const finish = new Date;
                    const duration = new Date(finish.valueOf() - start.valueOf());
                    console.log("Operation lasted for " + duration.getUTCHours() + " hours, " + duration.getUTCMinutes() + " minutes, and " + duration.getUTCSeconds() + " seconds.");
                    process.exit(0);
                }
    
                // Check if ranked / approved
                if (map.approved == 1 || map.approved == 2) { 

                    // see if set exists already, if it doesn't then add it
                    let dbSet = await Beatmapset.findOne(map.beatmapset_id);
                    if (!dbSet) {
                        dbSet = createSet(map);
                        await dbSet.save();
                    }

                    // see if beatmap exists, if it doesn't then add it
                    if (!dbSet.beatmaps?.some(b => b.ID === parseInt(map.beatmap_id))) {
                        const dbMap = await createMap(map);
                        dbMap.beatmapset = dbSet;
                        await dbMap.save();
                    }

                    // see if user exists, if they don't then add them
                    let dbUser = await User.findOne({ 
                        osu: {
                            userID: map.creator_id,
                        },
                    }, {
                        relations: ["beatmapsets"],
                    });
                    if (!dbUser) {
                        dbUser = new User;
                        dbUser.osu = new OAuth;
                        dbUser.osu.userID = map.creator_id;
                        dbUser.osu.username = map.creator;
                        dbUser.osu.avatar = "https://a.ppy.sh/" + map.creator_id;
                        dbUser.beatmapsets = [dbSet];
                        await dbUser.save();

                        if (!map.version.includes("'")) {
                            const eligibility = new MCAEligibility();
                            eligibility.year = year;
                            eligibility.user = dbUser;
                            eligibility[modeList[map.mode]] = true;
                            eligibility.storyboard = true;
                            await eligibility.save();
                        }
                    } else {
                        dbUser.beatmapsets.push(dbSet);
                        if (dbUser.osu.username !== map.creator && !dbUser.otherNames.some(v => v.name === map.creator)) { // Check for username change
                            let nameChange = await UsernameChange.findOne({ name: map.creator, user: dbUser });
                            if (nameChange)
                                await nameChange.remove();

                            const oldName = dbUser.osu.username;
                            dbUser.osu.username = map.creator;
                            await dbUser.save();

                            nameChange = new UsernameChange;
                            nameChange.user = dbUser;
                            nameChange.name = oldName;
                            await nameChange.save();
                        } else
                            await dbUser.save();
                        
                        if (!map.version.includes("'")) {
                            let eligibility = await MCAEligibility.findOne({ relations: ["user"], where: { year: year, user: dbUser }});
                            if (!eligibility) {
                                eligibility = new MCAEligibility();
                                eligibility.year = year;
                                eligibility.user = dbUser;
                            }
                            
                            if (!eligibility[modeList[map.mode]]) {
                                eligibility[modeList[map.mode]] = true;
                                eligibility.storyboard = true;
                                await eligibility.save();
                            }
                        }
                    }

                    date = map.approved_date;
                }
                mapNum++;
                console.log("Checked map number " + mapNum);
            }
        } catch (err) {
            console.error(err);
        }
    }
}

fetchYearMaps();
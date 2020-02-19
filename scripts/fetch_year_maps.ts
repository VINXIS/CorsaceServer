import { createConnection } from "typeorm";
import { Config } from "../../config";
import axios from "axios";
import { Beatmap } from "../../CorsaceModels/MCA_AYIM/beatmap"

const config = new Config();
const args = process.argv.slice(2);
const year = parseInt(args[0])
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
    "electronic"
]

const langs = [
    "any",
    "other",
    "english",
    "japanese",
    "chinese",
    "instrumental",
    "korean",
    "french",
    "german",
    "swedish",
    "spanish",
    "italian"
]

function convert(map: any): Beatmap {
    const beatmap = new Beatmap
    
    beatmap.ID = parseInt(map.beatmap_id)
    beatmap.setID = parseInt(map.beatmapset_id)
    
    beatmap.artist = map.artist
    beatmap.title = map.title
    beatmap.difficulty = map.version
    beatmap.creator = map.creator
    beatmap.creatorID = parseInt(map.creator_id)
    beatmap.mode = parseInt(map.mode)

    beatmap.genre = genres[map.genre_id]
    beatmap.language = langs[map.language_id]

    beatmap.BPM = parseFloat(map.bpm)
    beatmap.circleSize = parseFloat(map.diff_size)
    beatmap.approachRate = parseFloat(map.diff_approach)
    beatmap.overallDifficulty = parseFloat(map.diff_overall)
    beatmap.hpDrain = parseFloat(map.diff_drain)

    beatmap.submitDate = new Date(map.submit_date)
    beatmap.approvedDate = new Date(map.approved_date)

    beatmap.circles = parseInt(map.count_normal)
    beatmap.sliders = parseInt(map.count_slider)
    beatmap.spinners = parseInt(map.count_spinner)

    beatmap.favourites = parseInt(map.favourite_count)
    beatmap.rating = parseFloat(map.rating)
    beatmap.passCount = parseInt(map.passcount)
    beatmap.playCount = parseInt(map.playcount)

    beatmap.hitLength = parseInt(map.hit_length)
    beatmap.totalLength = parseInt(map.total_length)

    beatmap.totalSR = parseFloat(map.difficultyrating)

    if (map.diff_aim)
        beatmap.aimSR = parseFloat(map.diff_aim)
    if (map.max_combo)
        beatmap.maxCombo = parseInt(map.max_combo)
    if (map.packs)
        beatmap.packs = map.packs
    if (map.diff_speed)
        beatmap.speedSR = parseFloat(map.diff_speed)
    if (map.storyboard == 1)
        beatmap.storyboard = true
    if (map.video == 1)
        beatmap.video = true

    return beatmap
}

async function run(): Promise<void> {
    createConnection({
        "type": "mariadb",
        "host": "localhost",
        "username": config.database.username,
        "password": config.database.password,
        "database": config.database.name,
        "timezone": "Z",
        "synchronize": true,
        "logging": false,
        "entities": [
            __dirname + "/../../CorsaceModels/**/*{.ts,.js}"
        ],
    }).then((connection) => {
        console.log("Connected to the " + connection.options.database + " database!");
    }).catch(err => console.error(err))
    let date = year + "-01-01"
    let mapNum = 0;
    for (;;) {
        try {
            const maps = (await axios.get("https://osu.ppy.sh/api/get_beatmaps?k=" + config.osuV1 + "&since=" + date)).data
            for (const map of maps) {
                if (new Date(map.approved_date).getFullYear() !== year) {
                    console.log("Final " + year + " map was found.")
                    process.exit(0)
                }
    
                if (map.approved == 1 || map.approved == 2) { 
                    let dbMap = await Beatmap.findOne(map.beatmap_id);
                    if (!dbMap) {
                        dbMap = convert(map);
                        await dbMap.save();
                    }
                    date = map.approved_date
                }
                mapNum++
                console.log("Checked map number " + mapNum)
            }
        } catch (err) {
            console.error(err)
        }
    }
}

run()
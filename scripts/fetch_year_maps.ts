import { createConnection } from "typeorm";
import { Config } from "../../config";
import axios from "axios";
import { Beatmap } from "../../CorsaceModels/MCA_AYIM/beatmap"
import { Mode } from "../../CorsaceModels/MCA_AYIM/mode";

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

async function convert(map: any): Promise<Beatmap> {
    const beatmap = new Beatmap
    beatmap.BPM = map.BPM
    beatmap.ID = map.beatmap_id
    beatmap.approachRate = map.diff_approach
    beatmap.approvedDate = new Date(map.approved_date)
    beatmap.artist = map.artist
    beatmap.artistUnicode = map.artist_unicode
    beatmap.circleSize = map.diff_size
    beatmap.creator = map.creator
    beatmap.creatorID = map.creator_id
    beatmap.difficulty = map.version
    beatmap.favourites = map.favourite_count
    beatmap.genre = genres[map.genre_id]
    beatmap.hitLength = map.hit_length
    beatmap.hpDrain = map.diff_drain
    beatmap.language = langs[map.language_id]
    beatmap.mode = await Mode.findOne(map.mode)
    beatmap.overallDifficulty = map.diff_overall
    beatmap.passCount = map.passcount
    beatmap.playCount = map.playcount
    beatmap.rating = map.rating
    beatmap.setID = map.beatmapset_id
    beatmap.sliders = map.count_slider
    beatmap.source = map.source
    beatmap.spinners = map.count_spinner
    beatmap.submitDate = new Date(map.submit_date)
    beatmap.title = map.title
    beatmap.titleUnicode = map.title_unicode
    beatmap.totalLength = map.total_length
    beatmap.totalSR = map.difficultyrating

    if (map.diff_aim)
        beatmap.aimSR = map.diff_aim
    if (map.max_combo)
        beatmap.maxCombo = map.max_combo
    if (map.packs)
        beatmap.packs = map.packs
    if (map.diff_speed)
        beatmap.speedSR = map.diff_speed
    if (map.storyboard == 1)
        beatmap.storyboard = true
    if (map.video == 1)
        beatmap.video = true

    return beatmap
}

async function run(): Promise<void> {
    try {
        await createConnection({
            "type": "mariadb",
            "host": "localhost",
            "username": config.database.username,
            "password": config.database.password,
            "database": config.database.name,
            "timezone": "Z",
            "synchronize": true,
            "logging": false,
            "entities": [
            "../../CorsaceModels/**/*.ts"
            ],
        })
    } catch (err) {
        console.error(err)
    }
    let date = year + "-01-01"
    for (;;) {
        try {
            const maps = (await axios.get("https://osu.ppy.sh/api/get_beatmaps?k=" + config.osuV1 + "&since=" + date)).data
            for (const map of maps) {
                if (new Date(map.approved_date).getUTCFullYear() !== year)
                    break
    
                if (map.approved == 1 || map.approved == 2) { 
                    let dbMap = await Beatmap.findOne(map.beatmap_id);
                    if (!dbMap) {
                        dbMap = await convert(map);
                        await dbMap.save();
                    }
                    date = map.approved_date
                }
            }
            
            if (new Date(maps[maps.length - 1].approved_date).getUTCFullYear() !== year)
                break
        } catch (err) {
            console.error(err)
        }
    }
}

run()
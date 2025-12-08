import { compileOfficialModels, versionMap } from "./specParser.mjs"
import fse from "fs-extra"
import cp from "child_process"

export async function updateModels(skipClone = false) {
    if (!skipClone)
        await cloneCommunityModels()
    await compileModelData()
}

/**
 * Collects and compiles the model data for each model type
 * requires the community models repo to be cloned in ./models/community-models
 * saves the model json to ./src-web/models/
 */
async function compileModelData() {
    console.log("compiling model data")

    const communityModels = await getCommunityModels("models")
    await save("./dist/community_models.json", communityModels)
    const officialModels = await getOfficialModels("Model")
    await save("./dist/official_models.json", officialModels)

    const uncuratedModels = await getCommunityModels("uncurated_models")
    await save("./dist/uncurated_models.json", uncuratedModels)

    const communityCnets = await getCommunityModels("controlnets")
    await save("./dist/community_controlnets.json", communityCnets)
    const officialCnets = await getOfficialModels("ControlNet")
    await save("./dist/official_controlnets.json", officialCnets)

    const communityLoras = await getCommunityModels("loras")
    await save("./dist/community_loras.json", communityLoras)
    const officialLoras = await getOfficialModels("LoRA")
    await save("./dist/official_loras.json", officialLoras)

    const communityEmbeddings = await getCommunityModels("embeddings")
    await save("./dist/community_embeddings.json", communityEmbeddings)
}

/**
 * This runs the python script in the community-models repo the combines all the model data
 * into a single json file, and returns the output
 *
 * If "official" specified, the official models are fetched from the community repo,
 * parsed from swift and combined with the community models
 *
 * @param {"models" | "uncurated_models" | "controlnets" | "loras" | "embeddings"} type
 * @param {"Model" | "ControlNet" | "LoRA" | undefined} official must match the filename for the official models file
 */
async function compileModelType(type, official) {
    try {
        const models = await getCommunityModels(type)

        if (official) {
            const officialModels = await compileOfficialModels(official)
            models.push(...officialModels)
        }

        models.sort((a, b) => a.name.localeCompare(b.name))

        models.forEach(m => { m.version = versionMap(m.version) })

        await fse.writeJSON(`./dist/${type}.json`, models, { spaces: 2 })
    } catch (e) {
        console.error("couldn't compile", type)
        console.error(e)
    }
}

/** @param {"models" | "uncurated_models" | "controlnets" | "loras" | "embeddings"} type */
async function getCommunityModels(type) {
    try {
        cp.execSync(`python utils/${type}_json.py`, { cwd: "./community-models", stdio: "inherit" })
        const models = await fse.readJSON(`./community-models/${type}.json`)

        models.sort((a, b) => a.name.localeCompare(b.name))
        models.forEach(m => { m.version = versionMap(m.version) })

        return models
    }
    catch (e) {
        console.error(e)
        return []
    }
}

/** @param {"Model" | "ControlNet" | "LoRA"} official must match the filename for the official models file */
async function getOfficialModels(official) {
    try {

        const models = await compileOfficialModels(official)

        models.sort((a, b) => a.name.localeCompare(b.name))
        models.forEach(m => { m.version = versionMap(m.version) })

        return models
    }
    catch (e) {
        console.error(e)
        return []
    }
}

async function save(filename, data) {
    try {
        await fse.writeJSON(filename, data, { spaces: 2 })
    } catch (e) {
        console.error("couldn't save", filename)
        console.error(e)
    }
}

/** clones the community models repo. Sometimes this can be slow. */
async function cloneCommunityModels() {
    console.log("removing old generated files")
    fse.emptyDirSync("./dist")
    console.log("cloning draw things community models")
    cp.execSync("git clone https://github.com/drawthingsai/community-models.git", { stdio: "inherit" })
}

if (import.meta.filename === process.argv[1]) {
    updateModels(false)
        .then(() => process.exit(0))
        .catch(console.error)
}

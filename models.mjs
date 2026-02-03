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
    sortModels(communityModels)
    await save("./dist/community_models.json", communityModels)
    const officialModels = await getOfficialModels("Model")
    sortModels(officialModels)
    await save("./dist/official_models.json", officialModels)

    const uncuratedModels = await getCommunityModels("uncurated_models")
    sortModels(uncuratedModels)
    await save("./dist/uncurated_models.json", uncuratedModels)

    const communityCnets = await getCommunityModels("controlnets")
    sortModels(communityCnets)
    await save("./dist/community_controlnets.json", communityCnets)
    const officialCnets = await getOfficialModels("ControlNet")
    sortModels(officialCnets)
    await save("./dist/official_controlnets.json", officialCnets)

    const communityLoras = await getCommunityModels("loras")
    sortModels(communityLoras)
    await save("./dist/community_loras.json", communityLoras)
    const officialLoras = await getOfficialModels("LoRA")
    sortModels(officialLoras)
    await save("./dist/official_loras.json", officialLoras)

    const communityEmbeddings = await getCommunityModels("embeddings")
    sortModels(communityEmbeddings)
    await save("./dist/community_embeddings.json", communityEmbeddings)

    const combined = {
        lastUpdate: new Date(Date.now()).toISOString(),
        officialModels,
        officialCnets,
        officialLoras,
        communityModels,
        communityCnets,
        communityLoras,
        communityEmbeddings,
        uncuratedModels
    }
    await save("./dist/combined_models.json", combined)

    const versions = new Set()

    for (const [k, group] of Object.entries(combined)) {
        if (!Array.isArray(group)) continue

        group.forEach(m => {
            if (m && typeof m === 'object' && 'version' in m) versions.add(m.version)
        })
    }

    await save("./dist/versions.json", { versions: [...versions].sort() })
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

/**
 * @typedef Model
 * @property {string} name
 * @property {string} file
 * @property {string} version
 */

/**
 * 
 * @param {Model} a 
 * @param {Model} b 
 * @returns {number}
 */
function modelsSort(a, b) {
    const aValue = a.name ?? a.file ?? a.version ?? ""
    const bValue = b.name ?? b.file ?? b.version ?? ""
    return aValue.localeCompare(bValue)
}

/**
 * sorts in place
 * @param {Model[]} models
 */
function sortModels(models) {
    try {
        models.sort(modelsSort)
    }
    catch (e) {
        console.log(e)
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
    fse.emptyDirSync("./community-models")
    console.log("cloning draw things community models")
    cp.execSync("git clone https://github.com/drawthingsai/community-models.git", { stdio: "inherit" })
}

if (import.meta.filename === process.argv[1]) {
    updateModels(false)
        .then(() => process.exit(0))
        .catch(console.error)
}

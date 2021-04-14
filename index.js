"use strict";
//docs for digital-twins-core here: https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/digitaltwins/digital-twins-core
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const identity_1 = require("@azure/identity");
const digital_twins_core_1 = require("@azure/digital-twins-core");
const command_line_args_1 = __importDefault(require("command-line-args"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
//configuration
let defaultConfig = {
    modelsFolder: "./models",
    twinsFolder: "./twins"
};
let args = [
    { name: "digitalTwinsEndpointUrl", alias: "u", required: true },
    { name: "modelsFolder", alias: "m" },
    { name: "twinsFolder", alias: "t" },
];
let config = Object.assign(Object.assign({}, defaultConfig), command_line_args_1.default(args));
if (!config.digitalTwinsEndpointUrl)
    throw new Error("The --digitalTwinsEndpointUrl (-u) argument is required.");
let client;
(async () => {
    client = new digital_twins_core_1.DigitalTwinsClient(config.digitalTwinsEndpointUrl, new identity_1.DefaultAzureCredential());
    // DELETE MODELS
    // purge();
    // VALIDATE MODELS
    // let validator = spawn("./DTDLValidator", ["-d", config.modelsFolder]);
    // validator.stdout.on("data", data => console.log(data.toString()));
    // validator.stderr.on("data", data => console.log(data.toString()));
    // CREATE MODELS
    // createModels();
    // LIST MODELS
    console.log((await listModels()).map(m => m.id));
    // CREATE TWINS
    // createTwins();
    // let twinJson = await readFile("./twins/widget1.json", 'utf-8');
    // client.upsertDigitalTwin("widget1", twinJson);
})();
async function purge() {
    await deleteAllTwins();
    await sleep(10);
    await deleteAllModels();
}
async function deleteAllTwins() {
    let twins = await listTwins();
    let relationships = [];
    twins.forEach(async (t) => {
        //delete all relationships
        relationships = await listRelationships(t["$dtId"]);
        await Promise.all(relationships.map(r => client.deleteRelationship(t["$dtId"], r["$relationshipId"])));
        //wait 10s
        await new Promise(r => setTimeout(r, 10000));
        //delete twin
        await client.deleteDigitalTwin(t["$dtId"]);
    });
}
async function deleteAllModels() {
    let models = await listModels();
    models.forEach(async (m) => await client.deleteModel(m.id));
}
async function sleep(s) {
    return new Promise(r => setTimeout(r, s * 1000));
}
async function createModels() {
    let modelFiles = await promises_1.readdir(config.modelsFolder);
    modelFiles.forEach(async (modelFile) => {
        let model = JSON.parse(await promises_1.readFile(path_1.join(config.modelsFolder, modelFile), 'utf-8'));
        let modelId = model["@id"];
        await client.createModels([model]);
        console.log(`Created ${modelId}`);
    });
}
async function createTwins() {
    let twinFiles = await promises_1.readdir(config.twinsFolder);
    twinFiles.forEach(async (twinFile) => {
        let twinJson = await promises_1.readFile(path_1.join(config.twinsFolder, twinFile), 'utf-8');
        let twinId = JSON.parse(twinJson)["$dtId"];
        await client.upsertDigitalTwin(twinId, twinJson);
        console.log(`Created ${twinId}`);
    });
}
async function listModels() {
    let models = await client.listModels();
    let result = [];
    let i = await models.next();
    while (!i.done) {
        result.push(i.value);
        i = await models.next();
    }
    return result;
}
async function listTwins() {
    let twins = await client.queryTwins("SELECT * FROM digitaltwins");
    let result = [];
    let i = await twins.next();
    while (!i.done) {
        result.push(i.value);
        i = await twins.next();
    }
    return result;
}
async function listRelationships(digitalTwinId) {
    let relationships = await client.listRelationships(digitalTwinId);
    let result = [];
    let i = await relationships.next();
    while (!i.done) {
        result.push(i.value);
        i = await relationships.next();
    }
    return result;
}

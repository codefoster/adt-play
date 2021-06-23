"use strict";
//docs for digital-twins-core here: https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/digitaltwins/digital-twins-core
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
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
    twinsFolder: "./twins",
};
let args = [
    { name: "digitalTwinsEndpointUrl", alias: "u", required: true },
    { name: "modelsFolder", alias: "m" },
    { name: "twinsFolder", alias: "t" },
];
let config = Object.assign(Object.assign({}, defaultConfig), command_line_args_1.default(args));
if (!config.digitalTwinsEndpointUrl) {
    throw new Error("The --digitalTwinsEndpointUrl (-u) argument is required.");
}
let client;
main();
async function main() {
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
    // console.log((await listModels()).map((m) => m.id));
    // CREATE TWINS
    // createTwins();
    // let twinJson = await readFile("./twins/widget1.json", "utf-8");
    // client.upsertDigitalTwin("widget1", twinJson);
    // QUERY TWINS
    console.log((await query("SELECT * FROM digitaltwins")).map(twin => twin["$dtId"]));
}
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
        await Promise.all(relationships.map((r) => client.deleteRelationship(t["$dtId"], r["$relationshipId"])));
        //wait 10s
        await new Promise((r) => setTimeout(r, 10000));
        //delete twin
        await client.deleteDigitalTwin(t["$dtId"]);
    });
}
async function deleteAllModels() {
    let models = await listModels();
    models.forEach(async (m) => await client.deleteModel(m.id));
}
async function sleep(s) {
    return new Promise((r) => setTimeout(r, s * 1000));
}
async function createModels() {
    let modelsFolderItems = await promises_1.readdir(config.modelsFolder, {
        withFileTypes: true,
    });
    modelsFolderItems
        .filter((i) => i.isFile())
        .forEach(async (modelFile) => {
        await promises_1.readFile(path_1.join(config.modelsFolder, modelFile.name), "utf-8");
        let model = JSON.parse(await promises_1.readFile(path_1.join(config.modelsFolder, modelFile.name), "utf-8"));
        let modelId = model["@id"];
        await client.createModels([model]);
        console.log(`Created ${modelId}`);
    });
}
async function createTwins() {
    let twinFiles = await promises_1.readdir(config.twinsFolder);
    twinFiles.forEach(async (twinFile) => {
        let twinJson = await promises_1.readFile(path_1.join(config.twinsFolder, twinFile), "utf-8");
        let twinId = JSON.parse(twinJson)["$dtId"];
        await client.upsertDigitalTwin(twinId, twinJson);
        console.log(`Created ${twinId}`);
    });
}
async function listModels() {
    var e_1, _a;
    let result = [];
    let models = await client.listModels();
    try {
        for (var models_1 = __asyncValues(models), models_1_1; models_1_1 = await models_1.next(), !models_1_1.done;) {
            const model = models_1_1.value;
            result.push(model);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (models_1_1 && !models_1_1.done && (_a = models_1.return)) await _a.call(models_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
}
async function query(query) {
    var e_2, _a;
    let list = [];
    try {
        for (var _b = __asyncValues(client.queryTwins(query)), _c; _c = await _b.next(), !_c.done;) {
            const twin = _c.value;
            list.push(twin);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return list;
    // let twins = await client.queryTwins(query);
    // let i = await twins.next();
    // while (!i.done) {
    //   yield i.value;
    //   i = await twins.next();
    // }
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

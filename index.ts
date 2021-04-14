//docs for digital-twins-core here: https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/digitaltwins/digital-twins-core

import { DefaultAzureCredential } from "@azure/identity";
import { DigitalTwinsClient, DigitalTwinsModelData } from "@azure/digital-twins-core";
import commandLineArgs from "command-line-args";
import { spawn } from "child_process";
import { readFile, readdir } from "fs/promises";
import { join } from "path";

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
let config = {...defaultConfig, ...commandLineArgs(args)};

if(!config.digitalTwinsEndpointUrl) throw new Error("The --digitalTwinsEndpointUrl (-u) argument is required.");


let client: DigitalTwinsClient;

(async () => {
  
  client = new DigitalTwinsClient(
    config.digitalTwinsEndpointUrl,
    new DefaultAzureCredential(),
  );

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
  let relationships:any[] = [];
  twins.forEach(async t => {
    
    //delete all relationships
    relationships = await listRelationships(t["$dtId"]);
    await Promise.all(relationships.map(r => client.deleteRelationship(t["$dtId"], r["$relationshipId"])));
    
    //wait 10s
    await new Promise(r => setTimeout(r, 10000));
    
    //delete twin
    await client.deleteDigitalTwin(t["$dtId"]);
  })

}

async function deleteAllModels() {
    let models = await listModels();
    models.forEach(async m => await client.deleteModel(m.id));
}

async function sleep(s) {
  return new Promise(r => setTimeout(r, s * 1000));
}

async function createModels() {
  let modelFiles = await readdir(config.modelsFolder);
  modelFiles.forEach(async modelFile => {
    let model = JSON.parse(await readFile(join(config.modelsFolder, modelFile), 'utf-8'));
    let modelId = model["@id"];
    await client.createModels([model]);
    console.log(`Created ${modelId}`);
  });
}

async function createTwins() {
  let twinFiles = await readdir(config.twinsFolder);
  twinFiles.forEach(async twinFile => {
    let twinJson = await readFile(join(config.twinsFolder, twinFile), 'utf-8');
    let twinId = JSON.parse(twinJson)["$dtId"];
    await client.upsertDigitalTwin(twinId, twinJson);
    console.log(`Created ${twinId}`);
  });
}

async function listModels(): Promise<DigitalTwinsModelData[]> {
  let models = await client.listModels();
  let result:DigitalTwinsModelData[] = [];
  let i = await models.next();
  while (!i.done) {
    result.push(i.value);
    i = await models.next();
  }
  return result;
}

async function listTwins() {
  let twins = await client.queryTwins("SELECT * FROM digitaltwins");

  let result:any[] = [];
  let i = await twins.next();
  while (!i.done) {
    result.push(i.value);
    i = await twins.next();
  }
  return result;

}

async function listRelationships(digitalTwinId: string) {
  let relationships = await client.listRelationships(digitalTwinId);
  let result:any[] = [];
  let i = await relationships.next();
  while (!i.done) {
    result.push(i.value);
    i = await relationships.next();
  }
  return result;
}

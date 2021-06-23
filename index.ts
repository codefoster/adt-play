//docs for digital-twins-core here: https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/digitaltwins/digital-twins-core

import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import {
  DigitalTwinsClient,
  DigitalTwinsModelData,
  QueryQueryTwinsResponse,
} from "@azure/digital-twins-core";
import commandLineArgs from "command-line-args";
import { spawn } from "child_process";
import { lstat, readdir, readFile } from "fs/promises";
import { join } from "path";

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
let config = { ...defaultConfig, ...commandLineArgs(args) };

if (!config.digitalTwinsEndpointUrl) {
  throw new Error("The --digitalTwinsEndpointUrl (-u) argument is required.");
}

let client: DigitalTwinsClient;

main();

async function main() {
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
  let relationships: any[] = [];
  twins.forEach(async (t) => {
    //delete all relationships
    relationships = await listRelationships(t["$dtId"]);
    await Promise.all(
      relationships.map((r) =>
        client.deleteRelationship(t["$dtId"], r["$relationshipId"])
      ),
    );

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
  let modelsFolderItems = await readdir(config.modelsFolder, {
    withFileTypes: true,
  });

  modelsFolderItems
    .filter((i) => i.isFile())
    .forEach(async (modelFile) => {
      await readFile(join(config.modelsFolder, modelFile.name), "utf-8");
      let model = JSON.parse(
        await readFile(join(config.modelsFolder, modelFile.name), "utf-8"),
      );
      let modelId = model["@id"];
      await client.createModels([model]);
      console.log(`Created ${modelId}`);
    });
}

async function createTwins() {
  let twinFiles = await readdir(config.twinsFolder);
  twinFiles.forEach(async (twinFile) => {
    let twinJson = await readFile(join(config.twinsFolder, twinFile), "utf-8");
    let twinId = JSON.parse(twinJson)["$dtId"];
    await client.upsertDigitalTwin(twinId, twinJson);
    console.log(`Created ${twinId}`);
  });
}

async function listModels(): Promise<DigitalTwinsModelData[]> {
  let result: DigitalTwinsModelData[] = [];

  let models = await client.listModels();

  for await (const model of models) {
    result.push(model);
  }

  return result;
}

async function query(query: string) {
  let list: QueryQueryTwinsResponse[] = [];
  for await (const twin of client.queryTwins(query)) {
    list.push(twin);
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

  let result: any[] = [];
  let i = await twins.next();
  while (!i.done) {
    result.push(i.value);
    i = await twins.next();
  }
  return result;
}

async function listRelationships(digitalTwinId: string) {
  let relationships = await client.listRelationships(digitalTwinId);
  let result: any[] = [];
  let i = await relationships.next();
  while (!i.done) {
    result.push(i.value);
    i = await relationships.next();
  }
  return result;
}

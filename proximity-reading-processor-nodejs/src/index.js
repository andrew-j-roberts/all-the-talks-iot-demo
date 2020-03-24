/**
 * index.js
 * @author Andrew Roberts
 */

// polyfill async
import "core-js/stable";
import "regenerator-runtime";
// load env variables
import dotenv from "dotenv";
let result = dotenv.config();
if (result.error) {
  throw result.error;
}
// app modules
import MqttClient from "./mqtt-client";

async function run() {
  // configure mqtt connection options using env variables
  let mqttClientConfig = {
    hostUrl: process.env.SOLACE_MQTT_HOST_URL,
    username: process.env.SOLACE_USERNAME,
    password: process.env.SOLACE_PASSWORD
  };

  // initialize and connect mqtt client
  let mqttClient;
  try {
    mqttClient = MqttClient(mqttClientConfig);
    await mqttClient.connect();
  } catch (err) {
    console.error(err);
  }

  // state
}

console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+");
run();

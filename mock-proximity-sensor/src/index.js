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
import { MqttClient } from "./mqtt-client";
import * as Events from "./events";

async function run() {
  let randomSensorId = Math.floor(Math.random() * 10000);

  // configure mqtt connection options
  let mqttClientConfig = {
    hostUrl: process.env.SOLACE_MQTT_HOST_URL,
    username: process.env.SOLACE_USERNAME,
    password: process.env.SOLACE_PASSWORD,
    clientId: randomSensorId
  };

  // initialize and connect mqtt client
  let mqttClient;
  try {
    mqttClient = MqttClient(mqttClientConfig);
    await mqttClient.connect();
  } catch (err) {
    console.error(err);
  }

  // start publishing proximity reading events at rate specified in .env
  let publishInterval = setInterval(() => {
    // form proximity reading event
    let randomCmReading = Math.floor(
      Math.random() * process.env.PROXIMITY_SENSOR_MAX_RANGE_CM
    );
    let proximityReadingEvent = Events.ProximityReadingEvent({
      id: `${process.env.SOLACE_USERNAME}-${randomSensorId}`,
      centimeters: randomCmReading,
      inches: randomCmReading * 0.3937
    });
    // publish proximity reading event on topic that includes the sensor id
    mqttClient.send(
      `ProximitySensor/${process.env.SOLACE_USERNAME}-${randomSensorId}/Chart/Data`,
      proximityReadingEvent
    );
  }, Math.floor((process.env.PROXIMITY_SENSOR_RATE_PER_SEC / 1000) * 1000));

  // run until sigint
  console.log("Running until a SIGINT signal is received...");
  process.stdin.resume();
  process.on("SIGINT", function() {
    console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+");
    console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+");
    process.exit();
  });
}

console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+");
console.log("+-+-+-+-+-+-+-+-+-+-+-+-+-+");
console.log("Starting proximity reading processor...");

run();

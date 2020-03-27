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
import * as EventHandlers from "./event-handlers";
import { createProximityReadingProcessor } from "./proximity-reading-processor";

async function run() {
  // configure mqtt connection options
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

  // start state machine
  const proximitySensorReadingProcessor = createProximityReadingProcessor({
    publish: mqttClient.send,
    proximitySensorMaxRangeCm: process.env.PROXIMITY_SENSOR_MAX_RANGE_CM,
    proximitySensorThreshold: process.env.PROXIMITY_SENSOR_THRESHOLD,
    chartTimeIntervalSec: process.env.DASHBOARD_CHART_TIME_INTERVAL_SEC
  });
  proximitySensorReadingProcessor.send("CONNECT");

  // configure event handlers to use state machine's send function as the event callback
  // docs here: https://xstate.js.org/docs/guides/actions.html#send-action
  let proximityReadingEventHandler = EventHandlers.handleProximityReadingEvent(
    proximitySensorReadingProcessor.send
  );

  // add topic subscriptions and corresponding event handlers to mqtt client
  try {
    await mqttClient.addEventHandler(
      `ProximitySensor/+/Reading`,
      event => proximityReadingEventHandler(event),
      0 // qos
    );
  } catch (err) {
    console.error(err);
  }

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

/**
 * mqtt-client.js
 * @author Andrew Roberts
 */

import mqtt from "mqtt";
import produce from "immer";

export function MqttClient({ hostUrl, username, password }) {
  let client = null;

  // connect client to message broker,
  // configure client to dispatch events using the event handlers map,
  // and ensure a connack is received
  async function connect() {
    return new Promise((resolve, reject) => {
      client = mqtt.connect(hostUrl, {
        username: username,
        password: password
      });
      client.on("connect", function onConnAck() {
        console.log("MqttClient connected to broker.");
        resolve(client);
      });
    });
  }

  // publishes message to provided topic and ensures puback is received
  async function send(topic, message, qos = 0) {
    return new Promise((resolve, reject) => {
      // guard: prevent attempting to interact with client that does not exist
      if (!client) {
        reject("Client has not connected yet");
      }

      client.publish(
        topic,
        JSON.stringify(message),
        { qos }, // options
        function onPubAck(err) {
          // guard: err != null indicates client is disconnecting
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  return produce({}, draft => {
    draft.connect = connect;
    draft.send = send;
  });
}

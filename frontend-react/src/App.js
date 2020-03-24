// react libs
import React, { useState, useEffect, useRef } from "react";
import { useImmer } from "use-immer";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
// clients
import { env } from "./clients/clients.config";
import MqttClient from "./clients/MqttClient";
import { fetchConnectedClients } from "./clients/SempClient";
// img
import PngProximitySensor from "../img/proximity-sensor.png";
import SvgSolaceLogoGreen from "../img/SvgSolaceLogoGreen";

function App() {
  /**
   * clients
   */
  const [mqttClient, setMqttClient] = useState(null);

  /**
   * app state
   */
  const [state, updateState] = useImmer({
    currentDevice: null,
    deviceList: [],
    disconnectEventLog: []
  });

  /**
   * page event handlers
   */
  function filterConnectedClients(clientArray) {
    // filter on interested client username
    function checkClientUsername(client) {
      if (client.clientUsername == "solly-mobile") {
        return true;
      }

      if (client.clientUsername == "proximity-sensor") {
        return true;
      }

      if (client.clientUsername == "mgmt-dashboard") {
        return true;
      }
    }

    return clientArray.filter(checkClientUsername);
  }

  function handleDisconnectEvent({ timestamp, clientUsername, clientId }) {
    updateState(draft => {
      draft.disconnectEventLog.unshift({
        timestamp,
        clientUsername,
        clientId
      });
    });
  }

  /**
   * app lifecycle, runs once on mount
   */
  useEffect(() => {
    async function setupApp() {
      /**
       * fetch a snapshot of currently connected clients using SEMP v2 (Solace's management API)
       */
      let clientArray;
      let filteredDevices;
      try {
        let res = await fetchConnectedClients({
          msgVpnName: "solace-battleship-udemy"
        });
        clientArray = res["data"];
        filteredDevices = filterConnectedClients(clientArray);
      } catch (e) {
        clientArray = null;
        filteredDevices = null;
      }

      updateState(draft => {
        draft.deviceList = filteredDevices;
      });

      /**
       * configure and connect the app's MQTT client
       */

      // configure mqtt connection options
      let mqttClientConfig = {
        hostUrl: env.MQTT_HOST_URL,
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD
      };

      // initialize and connect mqtt client
      let mqttClient;
      try {
        mqttClient = MqttClient(mqttClientConfig);
        console.log("=== MqttClient starting... === ");
        await mqttClient.connect();
      } catch (err) {
        console.error(err);
      }
      console.log("=== MqttClient ready to use. === ");

      // add event handler for client disconnect event
      try {
        await mqttClient.addEventHandler(
          // https://docs.solace.com/System-and-Software-Maintenance/Subscribing-to-MBus-Events.htm#subscribing_to_message_bus_events_1651767527_308172
          // SYS/LOG/INFO/CLIENT/<router-name>/<eventName>/<vpnName>/<clientName>
          "$SYS/LOG/INFO/CLIENT/+/CLIENT_CLIENT_DISCONNECT_MQTT/#",
          // define callback that is triggered when messages are received on specified topic
          function parseClientDisconnectSyslog({ topic, message }) {
            let tokenizedEvent = message.toString().split(" ");
            let timestamp = tokenizedEvent[0];
            let clientUsername = tokenizedEvent[11];
            let clientId = tokenizedEvent[8];
            handleDisconnectEvent({ timestamp, clientUsername, clientId });
          },
          1 // qos
        );
      } catch (err) {
        console.error(err);
      }

      setMqttClient(mqttClient);
    }

    setupApp();
  }, []);

  /**
   * poll for currently connected clients using SEMP v2 (Solace's management API)
   */
  useInterval(async () => {
    let res = await fetchConnectedClients({
      msgVpnName: "solace-battleship-udemy"
    });

    let clientArray;
    let filteredDevices;
    if (res) {
      try {
        clientArray = res["data"];
        filteredDevices = filterConnectedClients(clientArray);
      } catch (e) {
        clientArray = null;
        filteredDevices = null;
      }
    }

    updateState(draft => {
      draft.deviceList = filteredDevices;
    });
  }, 5000);

  /**
   * template that rerenders on changes in app state
   */
  return (
    <div className="grid w-screen h-screen grid-cols-10 pb-6">
      <div className="col-span-2">
        <div className="flex flex-col items-center p-4">
          <SvgHoneywellLogo width="100px" />
          <div className="flex justify-center text-2xl">+</div>
          <SvgSolaceLogoGreen width="100px" />
        </div>
        <img src={PngDemoArchitecture} />
      </div>

      <div className="flex flex-col col-span-8 overflow-scroll">
        {state.currentDevice ? (
          // if user selects a device, show the device detail page
          <div className="col-span-8">
            <DeviceDetailPage
              device={state.currentDevice}
              mqttClient={mqttClient}
              updateState={updateState}
            />
          </div>
        ) : (
          // else, render home page
          <React.Fragment>
            <div className="flex items-center h-16 px-4 text-xl border-b-2">
              Management Console
            </div>
            <div className="flex flex-col px-4 overflow-scroll">
              <div className="grid grid-cols-10">
                <div className="flex flex-col col-start-2 col-end-10">
                  <div className="mt-6">
                    <h2 className="text-2xl">Devices</h2>
                    <div className="flex flex-col p-4 mt-2 border rounded-sm">
                      <div className="grid grid-cols-4">
                        <div className="font-bold">Device</div>
                        <div className="font-bold">Client Username</div>
                        <div className="font-bold">Client ID</div>
                        <div className="font-bold">Uptime (HH:MM:SS)</div>
                      </div>
                      <div style={{ height: "300px" }}>
                        <AutoSizer>
                          {({ height, width }) => (
                            <List
                              className="List"
                              height={height}
                              itemCount={state.deviceList.length}
                              itemData={{
                                list: state.deviceList,
                                updateState: updateState
                              }}
                              itemSize={100}
                              width={width}
                            >
                              {DeviceRow}
                            </List>
                          )}
                        </AutoSizer>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-2xl">Client Disconnect Event Log</h2>
                    <div className="w-full p-4 mt-2 border rounded-sm">
                      <div className="grid grid-cols-3 mb-4">
                        <div className="font-bold">Time</div>
                        <div className="font-bold">Client Username</div>
                        <div className="font-bold">Client ID</div>
                      </div>
                      <div style={{ height: "300px" }}>
                        <AutoSizer>
                          {({ height, width }) => (
                            <List
                              className="List"
                              height={height}
                              itemCount={state.disconnectEventLog.length}
                              itemData={state.disconnectEventLog}
                              itemSize={60}
                              width={width}
                            >
                              {EventLogRow}
                            </List>
                          )}
                        </AutoSizer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

/**
 * templates
 */
function DeviceRow({ index, data, style }) {
  // destructure data provided by list
  let { list, updateState } = data;
  // get item using index
  let item = list[index];
  // set device type based on the client username, default to tof-sensor
  let deviceType = item.clientUsername;

  function secondsToHHMMSS(seconds) {
    let measuredTime = new Date(null);
    measuredTime.setSeconds(seconds); // specify value of SECONDS
    return measuredTime.toISOString().substr(11, 8);
  }

  return (
    <div style={style} className="z-10 flex items-center px-2 py-4">
      <button
        className="w-full"
        onClick={() =>
          updateState(draft => {
            draft.currentDevice = { type: deviceType, device: item };
          })
        }
      >
        <div className="grid items-center grid-cols-4">
          <div className="flex">
            <img
              src={
                deviceType === "solly-mobile"
                  ? PngMqttCar
                  : deviceType === "proximity-sensor"
                  ? PngProximitySensor
                  : PngMgmtDashboard
              }
              width={"80px"}
            />
          </div>
          <div className="flex text-xl text-gray-800">
            {item.clientUsername}
          </div>
          <div className="flex text-gray-800 text-md">{item.clientId}</div>
          <div className="flex">{secondsToHHMMSS(item.uptime)}</div>
        </div>
      </button>
    </div>
  );
}

function EventLogRow({ index, data, style }) {
  let item = data[index];
  return (
    <div
      style={style}
      className={`${
        index % 2 ? "bg-gray-200" : "bg-transparent"
      } grid w-full grid-cols-3 px-2 py-4 text-lg text-gray-800`}
    >
      <div className="flex">{item.timestamp}</div>
      <div className="flex">{item.clientUsername}</div>
      <div className="flex">{item.clientId}</div>
    </div>
  );
}

/**
 * helpers
 */
function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default App;

// react libs
import React, { useState, useEffect, useRef } from "react";
import { useImmer } from "use-immer";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
// clients
import { clientConfig } from "./clients/clients.config";
import { MqttClient } from "./clients/mqtt-client";
import { fetchConnectedClients } from "./clients/semp-client";
// pages
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
// img
import PngProximitySensor from "../img/proximity-sensor.png";
import SvgSolaceLogoGreen from "../img/SvgSolaceLogoGreen";
import SvgNodeJs from "../img/SvgNodeJs";

// ProximitySensor/${sensorId}/Chart/Data

function App() {
  /**
   * clients
   */
  const [mqttClient, setMqttClient] = useState(null);

  /**
   * app state
   */
  const [state, updateState] = useImmer({
    selectedDevice: null,
    connectedDeviceList: []
  });

  /**
   * page event handlers
   */
  function filterConnectedClients(clientArray) {
    // filter on interested client username
    function checkClientUsername(client) {
      if (client.clientUsername == "mock-proximity-sensor") {
        return true;
      }

      if (client.clientUsername == "proximity-sensor") {
        return true;
      }
    }

    return clientArray.filter(checkClientUsername);
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
          msgVpnName: clientConfig.SEMP_MESSAGE_VPN
        });
        console.dir(res);
        clientArray = res["data"];
        filteredDevices = filterConnectedClients(clientArray);
      } catch (e) {
        clientArray = null;
        filteredDevices = null;
      }

      updateState(draft => {
        draft.connectedDeviceList = filteredDevices;
      });

      /**
       * configure and connect the app's MQTT client
       */

      // configure mqtt connection options
      let mqttClientConfig = {
        hostUrl: clientConfig.MQTT_HOST_URL,
        username: clientConfig.MQTT_USERNAME,
        password: clientConfig.MQTT_PASSWORD
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

      setMqttClient(mqttClient);
    }

    setupApp();
  }, []);

  /**
   * poll for currently connected clients using SEMP v2 (Solace's management API)
   */
  useInterval(async () => {
    let res = await fetchConnectedClients({
      msgVpnName: clientConfig.SEMP_MESSAGE_VPN
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
      draft.connectedDeviceList = filteredDevices;
    });
  }, 5000);

  /**
   * template that rerenders on changes in app state
   */
  return (
    <div className="grid w-screen h-screen grid-cols-10 pb-6">
      {/* sidebar */}
      <div className="col-span-2">
        <div className="flex flex-col items-center p-4">
          <SvgSolaceLogoGreen width="100px" />
        </div>
      </div>
      {/* content */}
      <div className="flex flex-col col-span-8">
        {state.selectedDevice ? (
          // if user selects a device, show the device detail page
          <div className="col-span-8">
            <DeviceDetailPage
              device={state.selectedDevice}
              mqttClient={mqttClient}
              updateParentState={updateState}
            />
          </div>
        ) : (
          // else, render home page
          <React.Fragment>
            <div className="flex items-center h-16 px-4 text-xl border-b-2">
              🏭 Widget Factory Command Center
            </div>
            <div className="flex flex-col px-4">
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
                              itemCount={state.connectedDeviceList.length}
                              itemData={{
                                list: state.connectedDeviceList,
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
 * component templates
 */
function DeviceRow({ index, data, style }) {
  // destructure data provided by list
  let { list, updateState } = data;
  // get item using index
  let item = list[index];

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
            draft.selectedDevice = item;
          })
        }
      >
        <div className="grid items-center grid-cols-4">
          <div className="flex">
            {item.clientUsername === "proximity-sensor" ? (
              <img src={PngProximitySensor} width="80px" />
            ) : item.clientUsername === "mock-proximity-sensor" ? (
              <SvgNodeJs width="80px" />
            ) : null}
          </div>
          <div className="flex text-xl text-gray-800">
            {item.clientUsername}
          </div>
          <div className="flex text-gray-800 text-md">
            {getMqttId({ clientName: item.clientName })}
          </div>
          <div className="flex">{secondsToHHMMSS(item.uptime)}</div>
        </div>
      </button>
    </div>
  );
}

/**
 * utils
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

function getMqttId({ clientName }) {
  return clientName.split("/")[1];
}

export default App;

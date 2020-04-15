import React, { useEffect } from "react";
import moment from "moment";
import { useImmer } from "use-immer";
import { useTabState, Tab, TabList, TabPanel } from "reakit/Tab";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { MdArrowBack } from "react-icons/md";
import PngProximitySensor from "../../img/proximity-sensor.png";
import SvgNodejs from "../../img/SvgNodeJs";

export function DeviceDetailPage({ device, mqttClient, updateParentState }) {
  if (device.clientUsername == "proximity-sensor") {
    return (
      <ProximitySensorDetailPage
        device={device}
        mqttClient={mqttClient}
        updateParentState={updateParentState}
      />
    );
  }

  if (device.clientUsername == "mock-proximity-sensor") {
    return (
      <ProximitySensorDetailPage
        device={device}
        mqttClient={mqttClient}
        updateParentState={updateParentState}
      />
    );
  }

  return <div>Unknown device — reload app.</div>;
}

/**
 * page templates
 */

function ProximitySensorDetailPage({ device, mqttClient, updateParentState }) {
  /**
   * app state
   */
  const [state, updateState] = useImmer({
    actionLog: [],
    chartData: [],
    isPaused: false,
  });

  const tab = useTabState({ selectedId: "5s" });

  console.log(state.chartData);
  /**
   * app lifecycle, runs once on mount
   */
  useEffect(() => {
    async function setupPage() {
      // add topic subscriptions and event handlers for data required by page
      try {
        await mqttClient.addEventHandler(
          `ProximitySensor/${device.clientUsername}-${getMqttId({
            clientName: device.clientName,
          })}/Chart/Data`,
          // define callback that is triggered when messages are received on specified topic
          function updateChartData({ topic, message }) {
            let payload = JSON.parse(message.toString());
            updateState((draft) => {
              draft.chartData.push(payload);
            });
          },
          1 // qos
        );
      } catch (err) {
        console.error(err);
      }
    }

    setupPage();
  }, []);

  /**
   * page event handlers
   */
  async function sendStartCommand() {
    // send command
    await mqttClient.send(
      `ProximitySensor/${device.clientUsername}-${getMqttId({
        clientName: device.clientName,
      })}/Command/START`,
      {
        timestamp: Date.now(),
        command: "START",
      },
      1 // qos
    );
    // log action
    updateState((draft) => {
      draft.actionLog.unshift({
        timestamp: new Date().toLocaleString(),
        message: `start command issued to proximity sensor ${
          device.clientUsername
        }-${getMqttId({
          clientName: device.clientName,
        })}`,
      });

      draft.isPaused = false;
    });
  }

  async function sendStopCommand() {
    // send command
    await mqttClient.send(
      `ProximitySensor/${device.clientUsername}-${getMqttId({
        clientName: device.clientName,
      })}/Command/STOP`,
      {
        timestamp: Date.now(),
        command: "STOP",
      },
      1 // qos
    );
    // log action
    updateState((draft) => {
      draft.actionLog.unshift({
        timestamp: new Date().toLocaleString(),
        message: `stop command issued to proximity sensor ${
          device.clientUsername
        }-${getMqttId({
          clientName: device.clientName,
        })}`,
      });

      draft.isPaused = true;
    });
  }

  /**
   * template that rerenders on changes in app state
   */
  return (
    <React.Fragment>
      <div className="flex items-center h-16 px-4 text-xl border-b-2">
        <button
          className="mr-4"
          onClick={() =>
            updateParentState((draft) => {
              draft.selectedDevice = null;
            })
          }
        >
          <MdArrowBack size="2rem" />
        </button>
        {device.clientUsername == "mock-proximity-sensor" ? (
          <SvgNodejs height="50px" />
        ) : (
          <img src={PngProximitySensor} height="50px" />
        )}

        <div className="ml-2">
          {device.clientUsername}, <b>id:</b>
          {getMqttId({ clientName: device.clientName })}
        </div>
      </div>
      <div className="grid grid-cols-10 p-6">
        <div className="flex flex-col col-start-1 col-end-7">
          {/* chart */}
          <h2 className="mb-2 text-2xl">Product counts</h2>
          <div className="p-4 border rounded-md shadow-sm">
            <TabList {...tab} aria-label="semp url forms" className="border-b">
              <Tab {...tab} stopId="5s" className="p-2">
                <div className="flex flex-col">
                  <div>5s</div>
                  <div
                    style={{ content: "" }}
                    className={`flex h-1 mt-2 ${
                      tab.currentId === "5s" ? "bg-green-500" : ""
                    }`}
                  />
                </div>
              </Tab>
              <Tab {...tab} stopId="30s" className="p-2">
                <div className="flex flex-col">
                  <div>30s</div>
                  <div
                    style={{ content: "" }}
                    className={`flex h-1 mt-2 ${
                      tab.currentId === "30s" ? "bg-green-500" : ""
                    }`}
                  />
                </div>
              </Tab>
              <Tab {...tab} stopId="1m" className="p-2">
                <div className="flex flex-col">
                  <div>1m</div>
                  <div
                    style={{ content: "" }}
                    className={`flex h-1 mt-2 ${
                      tab.currentId === "1m" ? "bg-green-500" : ""
                    }`}
                  />
                </div>
              </Tab>
              <Tab {...tab} stopId="5m" className="p-2">
                <div className="flex flex-col">
                  <div>5m</div>
                  <div
                    style={{ content: "" }}
                    className={`flex h-1 mt-2 ${
                      tab.currentId === "5m" ? "bg-green-500" : ""
                    }`}
                  />
                </div>
              </Tab>
            </TabList>
            <TabPanel {...tab} stopId="5s" className="mt-2">
              <TimeSeriesChart chartData={state.chartData} />
            </TabPanel>
            <TabPanel {...tab} stopId="30s" className="mt-2">
              <TimeSeriesChart chartData={state.chartData} />
            </TabPanel>
            <TabPanel {...tab} stopId="1m" className="mt-2">
              <TimeSeriesChart chartData={state.chartData} />
            </TabPanel>
            <TabPanel {...tab} stopId="5m" className="mt-2">
              <TimeSeriesChart chartData={state.chartData} />
            </TabPanel>
          </div>

          {/* action log */}
          <div className="flex flex-col mt-4">
            <h2 className="text-2xl">Action log</h2>
            <div className="w-full h-64 p-4 mt-2 border rounded-md shadow-sm">
              <div className="grid grid-cols-4">
                <div className="font-bold">Time</div>
                <div className="col-span-3 font-bold">Action</div>
              </div>
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    className="List"
                    height={height}
                    itemCount={state.actionLog.length}
                    itemData={state.actionLog}
                    itemSize={35}
                    width={width}
                  >
                    {ActionLogRow}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
        </div>
        <div className="flex flex-col col-start-8 col-end-10">
          {/* action bar */}
          <div className="flex flex-col">
            <h2 className="text-2xl">Status</h2>
            <div
              className={`p-4 border rounded-md shadow-sm text-2xl ${
                state.isPaused
                  ? "bg-red-200 text-red-700"
                  : "bg-green-200 text-green-700"
              }`}
            >
              {state.isPaused ? "Stopped" : "Running"}
            </div>
            <h2 className="mt-4 text-2xl">Available actions</h2>
            <div className="flex items-center justify-center p-4 mt-2 border rounded-md shadow-sm">
              <button
                class="w-32 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                onClick={() => sendStartCommand()}
              >
                Start
              </button>
              <button
                class="w-32 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => sendStopCommand()}
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/**
 * component templates
 */

function TimeSeriesChart({ chartData }) {
  return (
    <ResponsiveContainer width="95%" height={300}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          domain={["auto", "auto"]}
          name="Time"
          tickFormatter={(unixTime) => moment(unixTime).format("HH:mm:ss")}
          type="number"
          label={{
            value: "timestamp",
            angle: 0,
            position: "insideBottomRight",
            offset: -5,
          }}
        />
        <YAxis
          dataKey="objectDetectedCount"
          name="product count"
          label={{
            value: "product count",
            angle: -90,
            position: "insideLeft",
            textAnchor: "middle",
          }}
        />
        <Tooltip />
        <Legend />
        <Scatter
          data={chartData}
          name="product count"
          line={{ stroke: "#0000ff" }}
          lineType="joint"
          fill="#0000ff"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function ActionLogRow({ index, data, style }) {
  let item = data[index];
  return (
    <div
      className={`grid grid-cols-4 items-center ${
        index % 2 ? "bg-gray-200" : "bg-transparent"
      } `}
      style={style}
    >
      <div>{item.timestamp}</div>
      <div className="col-span-3">{item.message}</div>
    </div>
  );
}

/**
 * utils
 */
function getMqttId({ clientName }) {
  return clientName.split("/")[1];
}

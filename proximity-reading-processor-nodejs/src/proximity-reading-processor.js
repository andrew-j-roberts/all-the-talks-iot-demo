/**
 * proximity-reading-processor.js
 * @author Andrew Roberts
 */

import { Machine, assign } from "xstate";
import * as Events from "./events";

export function createProximityReadingProcessor({ publish }) {
  /**
   * guards
   */

  function objectDetected(context, event) {
    let distanceThreshold =
      process.env.PROXIMITY_SENSOR_MAX_RANGE_CM -
      process.env.PROXIMITY_SENSOR_THRESHOLD;

    // object detected
    if (context.centimeters < distanceThreshold) {
      return true;
    }

    // no object detected
    return false;
  }

  function objectCleared(context, event) {
    let distanceThreshold =
      process.env.PROXIMITY_SENSOR_MAX_RANGE_CM -
      process.env.PROXIMITY_SENSOR_THRESHOLD;

    // no object detected
    if (context.centimeters > distanceThreshold) {
      return true;
    }

    // object detected
    return false;
  }

  /**
   * actions
   */

  const incrementObjectDetectedCount = assign({
    objectDetectedCount: (context, event) => context.objectDetectedCount + 1
  });

  const resetObjectDetectedCount = assign({
    objectDetectedCount: 0
  });

  function publishChartDatum(objectDetectedCount) {
    let chartDatumEvent = Events.ChartDatumEvent(
      objectDetectedCount,
      Date.now()
    );
    publish(chartDatumEvent);
  }

  /**
   * state machine
   */

  const proximityReadingProcessorMachine = Machine(
    {
      id: "proximityReadingProcessorMachine",
      initial: "idle",
      context: {
        objectDetectedCount: 0
      },
      states: {
        idle: {
          on: {
            CONNECT: "listening"
          }
        },
        listening: {
          initial: "baseline",
          states: {
            baseline: {
              on: {
                PROXIMITY_READING_RECEIVED: {
                  cond: "objectDetected",
                  target: "triggered"
                }
              }
            },
            triggered: {
              entry: "incrementObjectDetectedCount",
              on: {
                PROXIMITY_READING_RECEIVED: {
                  cond: "objectCleared",
                  target: "baseline"
                }
              }
            }
          },
          on: {
            DISCONNECT: {
              actions: "resetObjectDetectedCount",
              target: "idle"
            },
            CHART_DATUM_SENT: {
              actions: "resetObjectDetectedCount"
            }
          }
        }
      }
    },
    {
      guards: {
        objectDetected,
        objectCleared
      },
      actions: {
        incrementObjectDetectedCount,
        resetObjectDetectedCount,
        publishChartDatum
      },
      activities: {
        createProcessingActivity
      }
    }
  );

  /**
   * start service
   */

  const service = interpret(proximityReadingProcessorMachine).onTransition(
    state => {
      console.log(state.value);
    }
  );
  service.start();

  /**
   * activities
   */

  function createProcessingActivity(context, activity) {
    let interval = setInterval(() => {
      publishChartDatum(context.objectDetectedCount);
      service.send("CHART_DATUM_SENT");
    }, process.env.DASHBOARD_CHART_TIME_INTERVAL_SEC);

    return () => clearInterval(interval);
  }

  /**
   * this factory function returns the service
   */
  return service;
}

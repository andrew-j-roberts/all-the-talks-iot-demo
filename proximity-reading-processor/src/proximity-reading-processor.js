/**
 * proximity-reading-processor.js
 * @author Andrew Roberts
 */

import produce from "immer";
import { Machine, assign, interpret } from "xstate";
import * as Events from "./events";

export function createProximityReadingProcessor({
  publish,
  proximitySensorMaxRangeCm,
  proximitySensorThreshold,
  chartTimeIntervalSec,
}) {
  /**
   * guards
   */

  function objectDetected(context, event) {
    let distanceThreshold =
      proximitySensorMaxRangeCm - proximitySensorThreshold;
    // object detected
    if (event.centimeters < distanceThreshold) {
      return true;
    }
    // no object detected
    return false;
  }

  function objectCleared(context, event) {
    let distanceThreshold =
      proximitySensorMaxRangeCm - proximitySensorThreshold;
    // no object detected
    if (event.centimeters > distanceThreshold) {
      return true;
    }
    // object detected
    return false;
  }

  /**
   * actions
   */

  const incrementObjectDetectedCount = assign((context, event) => {
    // if the sensor has an active count, increment
    if (context.objectDetectedCount[event.id]) {
      return {
        objectDetectedCount: {
          ...produce(context.objectDetectedCount, (draft) => {
            draft[event.id] = draft[event.id] + 1;
          }),
        },
      };
    }
    // else initialize the sensor's count to 1
    return {
      objectDetectedCount: {
        ...produce(context.objectDetectedCount, (draft) => {
          draft[event.id] = 1;
        }),
      },
    };
  });

  const resetObjectDetectedCount = assign((context, event) => {
    return {
      objectDetectedCount: {
        ...produce(context.objectDetectedCount, (draft) => {
          for (let key of Object.keys(draft)) {
            draft[key] = 0;
          }
        }),
      },
    };
  });

  function publishChartDatum({ objectDetectedCount, id }) {
    let chartDatumEvent = Events.ChartDatumEvent({
      id,
      objectDetectedCount,
      time: Date.now(),
    });
    publish(`ProximitySensor/${id}/Chart/Data`, chartDatumEvent);
  }

  /**
   * state machine
   * https://xstate.js.org/viz/?gist=d2b2941cfee3c6fa25f04187310ebc85
   */

  const proximityReadingProcessorMachine = Machine(
    {
      id: "proximityReadingProcessorMachine",
      initial: "idle",
      context: {
        objectDetectedCount: {},
      },
      states: {
        idle: {
          on: {
            CONNECT: "listening",
          },
        },
        listening: {
          initial: "baseline",
          activities: ["createProcessingActivity"],
          states: {
            baseline: {
              on: {
                PROXIMITY_READING_RECEIVED: {
                  cond: "objectDetected",
                  target: "triggered",
                },
              },
            },
            triggered: {
              entry: "incrementObjectDetectedCount",
              on: {
                PROXIMITY_READING_RECEIVED: {
                  cond: "objectCleared",
                  target: "baseline",
                },
              },
            },
          },
          on: {
            DISCONNECT: {
              actions: "resetObjectDetectedCount",
              target: "idle",
            },
            CHART_DATUM_SENT: {
              actions: "resetObjectDetectedCount",
            },
          },
        },
      },
    },
    {
      guards: {
        objectDetected,
        objectCleared,
      },
      actions: {
        incrementObjectDetectedCount,
        resetObjectDetectedCount,
        publishChartDatum,
      },
      activities: {
        createProcessingActivity,
      },
    }
  );

  /**
   * start service
   */

  const service = interpret(proximityReadingProcessorMachine).onTransition(
    (state) => {
      console.log(
        "Service: { state: ",
        state.value,
        ", context: ",
        state.context,
        "}"
      );
    }
  );
  service.start();

  /**
   * activities
   */

  function createProcessingActivity(context, activity) {
    let interval = setInterval(() => {
      let currentContext = service.state.context;
      for (let key of Object.keys(currentContext.objectDetectedCount)) {
        publishChartDatum({
          id: key,
          objectDetectedCount: currentContext.objectDetectedCount[key],
        });
      }
      service.send("CHART_DATUM_SENT");
    }, chartTimeIntervalSec * 500);

    return () => clearInterval(interval);
  }

  /**
   * this factory function returns the service
   */
  return service;
}

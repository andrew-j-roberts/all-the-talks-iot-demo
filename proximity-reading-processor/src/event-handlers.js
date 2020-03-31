/**
 * event-handlers.js
 * @author Andrew Roberts
 */

import * as Events from "./events";

export const handleProximityReadingEvent = updateStateMachine => async event => {
  // guard: attempt to parse event, fail if event is malformed
  let proximityReadingEvent;
  try {
    let eventObj = JSON.parse(event.message);
    proximityReadingEvent = Events.ProximityReadingEvent({
      id: eventObj.id,
      centimeters: eventObj.centimeters,
      inches: eventObj.inches
    });
  } catch (e) {
    console.error(e);
    return false;
  }

  // send event and context to state machine
  updateStateMachine("PROXIMITY_READING_RECEIVED", proximityReadingEvent);

  return true;
};

// Notes:
// 1. This syntax uses partial application to fix the "send" argument
// 2. This syntax is generic! It can be used with MQTT or another messaging client — just provide it a "send" function

// Learn more:
// https://www.merixstudio.com/blog/functional-programming-javascript-currying-partial-application/

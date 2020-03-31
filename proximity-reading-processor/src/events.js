/**
 * events.js
 * @author Andrew Roberts
 */
import produce from "immer";

export function ProximityReadingEvent({ id, centimeters, inches }) {
  return produce({}, draft => {
    draft.id = id;
    draft.centimeters = centimeters;
    draft.inches = inches;
  });
}

export function ChartDatumEvent({ id, objectDetectedCount, timestamp }) {
  return produce({}, draft => {
    draft.id = id;
    draft.objectDetectedCount = objectDetectedCount;
    draft.timestamp = timestamp;
  });
}

// Notes:
// 1. This syntax uses destructuring to declaratively specify the structure of the object it expects.
// 2. This function is a "factory function"
// 3. I'm using immer to return an immutable object, so trying to do something like `helloWorldEvent.text = "foo"` would throw an error

// Usage:
// let helloWorldEvent = HelloWorldEvent(eventPayload);

// Learn more:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
// https://medium.com/javascript-scene/javascript-factory-functions-with-es6-4d224591a8b1

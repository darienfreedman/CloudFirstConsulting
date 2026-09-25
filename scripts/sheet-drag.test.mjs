import test from "node:test";
import assert from "node:assert/strict";
import { attachSheetDrag } from "../src/site/assets/sheet-drag.js";

function fixture(height = 500) {
  const listeners = new Map();
  const capture = new Set();
  const classes = new Set();
  const handle = {
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: type => listeners.delete(type),
    setPointerCapture: id => capture.add(id),
    hasPointerCapture: id => capture.has(id),
    releasePointerCapture: id => capture.delete(id)
  };
  const sheet = {
    getBoundingClientRect: () => ({ height }),
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    style: { removeProperty(name) { delete this[name]; } }
  };
  let dismissed = 0;
  const detach = attachSheetDrag(handle, sheet, () => dismissed++);
  return {
    sheet, capture, listeners, classes, detach,
    dismissed: () => dismissed,
    emit(type, { interactive = false, ...values } = {}) {
      listeners.get(type)?.({ isPrimary: true, button: 0, pointerId: 1, clientY: 100,
        target: { closest: () => interactive ? {} : null }, ...values });
    }
  };
}

test("a downward header drag tracks the finger and dismisses on release", () => {
  const f = fixture();
  f.emit("pointerdown");
  f.emit("pointermove", { clientY: 230 });
  assert.equal(f.sheet.style.transform, "translateY(130px)");
  assert(f.classes.has("is-dragging"));
  f.emit("pointerup", { clientY: 230 });
  assert.equal(f.dismissed(), 1);
  assert.equal(f.capture.size, 0);
  assert.equal(f.sheet.style.transform, undefined);
  f.detach();
});

test("short, upward and cancelled drags return without closing", () => {
  for (const [y, finish] of [[130, "pointerup"], [60, "pointerup"], [300, "pointercancel"], [300, "lostpointercapture"]]) {
    const f = fixture();
    f.emit("pointerdown");
    f.emit("pointermove", { clientY: y });
    if (y < 100) assert.equal(f.sheet.style.transform, "translateY(0px)");
    f.emit(finish, { clientY: y });
    assert.equal(f.dismissed(), 0);
    assert.equal(f.capture.size, 0);
    assert.equal(f.sheet.style.transform, undefined);
    f.detach();
  }
});

test("interactive header controls and secondary pointers never start a drag", () => {
  for (const props of [{ interactive: true }, { isPrimary: false }, { button: 2 }]) {
    const f = fixture();
    f.emit("pointerdown", props);
    f.emit("pointermove", { clientY: 300 });
    f.emit("pointerup", { clientY: 300 });
    assert.equal(f.dismissed(), 0);
    assert.equal(f.sheet.style.transform, undefined);
    f.detach();
  }
});

test("cleanup releases a captured pointer and removes all gesture listeners", () => {
  const f = fixture();
  f.emit("pointerdown");
  f.emit("pointermove", { clientY: 150 });
  f.emit("pointerup", { pointerId: 2, clientY: 350 });
  assert.equal(f.dismissed(), 0);
  assert(f.capture.has(1));
  f.detach();
  assert.equal(f.listeners.size, 0);
  assert.equal(f.capture.size, 0);
  assert.equal(f.sheet.style.transform, undefined);
});

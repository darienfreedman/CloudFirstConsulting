import test from "node:test";
import assert from "node:assert/strict";
import { createCarouselController } from "../src/site/assets/carousel.js";

function fixture({ reduced = false, originalHeight = "" } = {}) {
  const listeners = new Map();
  const slides = Array.from({ length: 3 }, (_, index) => ({
    offsetLeft: 20 + index * 316,
    contains: target => target?.parent === index,
    hidden: false,
    height: [420, 280, 580][index],
    getBoundingClientRect() { return { height: this.hidden ? 0 : this.height }; }
  }));
  const changes = [];
  let resize;
  let disconnected = false;
  const previousWindow = globalThis.window;
  const previousObserver = globalThis.ResizeObserver;
  const previousStyle = globalThis.getComputedStyle;
  const previousFrame = globalThis.requestAnimationFrame;
  const previousCancelFrame = globalThis.cancelAnimationFrame;
  const frames = new Map();
  let frameId = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.getComputedStyle = () => ({ boxSizing: "border-box", paddingTop: "0px", paddingBottom: "8px", borderTopWidth: "0px", borderBottomWidth: "0px" });
  globalThis.window = { matchMedia: () => ({ matches: reduced }) };
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    unobserve() {}
    disconnect() { disconnected = true; }
  };
  const properties = new Map(originalHeight ? [["height", originalHeight]] : []);
  const track = {
    children: slides, scrollLeft: 0, clientWidth: 300, scrollCalls: 0,
    style: {
      getPropertyValue: key => properties.get(key) || "",
      getPropertyPriority: () => "",
      setProperty: (key, value) => properties.set(key, value),
      removeProperty: key => properties.delete(key)
    },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    scrollTo(options) { this.lastScroll = options; this.scrollLeft = options.left; this.scrollCalls++; }
  };
  const controller = createCarouselController(track, {
    items: () => slides.filter(slide => !slide.hidden),
    onChange: (index, items) => changes.push({ index, count: items.length })
  });
  return {
    track, slides, controller, changes,
    resize() {
      resize();
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback());
    },
    emit: (name, event) => listeners.get(name)?.(event),
    destroy() {
      controller.destroy();
      assert.equal(listeners.size, 0);
      assert(disconnected);
      globalThis.window = previousWindow;
      globalThis.ResizeObserver = previousObserver;
      globalThis.getComputedStyle = previousStyle;
      globalThis.requestAnimationFrame = previousFrame;
      globalThis.cancelAnimationFrame = previousCancelFrame;
    }
  };
}

test("carousel navigation clamps boundaries and uses offsets relative to the first slide", () => {
  const f = fixture();
  try {
    f.controller.moveTo(10);
    assert.equal(f.track.lastScroll.left, 632);
    assert.equal(f.track.lastScroll.behavior, "smooth");
    f.controller.moveTo(-1);
    assert.equal(f.track.lastScroll.left, 0);
    assert.deepEqual(f.changes.at(-1), { index: 0, count: 3 });
  } finally { f.destroy(); }
});

test("touch scrolling selects the nearest slide and resizing retains it", () => {
  const f = fixture();
  try {
    f.track.scrollLeft = 300;
    f.emit("scroll");
    assert.equal(f.changes.at(-1).index, 1);
    f.slides.forEach((slide, index) => { slide.offsetLeft = 20 + index * 400; });
    f.track.clientWidth = 384;
    f.resize();
    assert.equal(f.track.scrollLeft, 400);
    assert.equal(f.track.lastScroll.behavior, "instant");
  } finally { f.destroy(); }
});

test("card selection and content changes do not write a changing viewport height", () => {
  const f = fixture();
  try {
    assert.equal(f.track.style.getPropertyValue("height"), "");
    f.controller.moveTo(1);
    assert.equal(f.track.style.getPropertyValue("height"), "");
    const scrollCalls = f.track.scrollCalls;
    f.slides[1].height = 730;
    f.resize();
    assert.equal(f.track.style.getPropertyValue("height"), "");
    assert.equal(f.track.scrollCalls, scrollCalls, "Content resizing must not interrupt horizontal scrolling");
    f.slides[1].height = 280;
    f.resize();
    assert.equal(f.track.style.getPropertyValue("height"), "");
  } finally { f.destroy(); }
  assert.equal(f.track.style.getPropertyValue("height"), "");
});

test("refresh, empty filters and cleanup preserve existing height styles", () => {
  const f = fixture({ originalHeight: "auto" });
  try {
    f.controller.refresh();
    assert.equal(f.track.style.getPropertyValue("height"), "auto");
    f.controller.refresh();
    assert.equal(f.track.style.getPropertyValue("height"), "auto");
    f.slides.forEach(slide => { slide.hidden = true; });
    f.controller.refresh();
    assert.equal(f.track.style.getPropertyValue("height"), "auto");
  } finally { f.destroy(); }
  assert.equal(f.track.style.getPropertyValue("height"), "auto");
});

test("filter changes retain a visible selection or recover to the first result", () => {
  const f = fixture();
  try {
    f.controller.moveTo(2);
    f.slides[1].hidden = true;
    f.controller.refresh();
    assert.deepEqual(f.changes.at(-1), { index: 1, count: 2 });
    f.slides[2].hidden = true;
    f.controller.refresh();
    assert.deepEqual(f.changes.at(-1), { index: 0, count: 1 });
    f.slides[0].hidden = true;
    f.controller.refresh();
    assert.deepEqual(f.changes.at(-1), { index: 0, count: 0 });
    f.slides.forEach(slide => { slide.hidden = false; });
    f.controller.refresh();
    assert.deepEqual(f.changes.at(-1), { index: 0, count: 3 });
  } finally { f.destroy(); }
});

test("fragment targets reveal their slide without animation", () => {
  const f = fixture();
  try {
    f.controller.reveal({ parent: 2 });
    assert.equal(f.track.scrollLeft, 632);
    assert.equal(f.track.lastScroll.behavior, "instant");
    f.controller.reveal({});
    assert.equal(f.track.scrollLeft, 632);
  } finally { f.destroy(); }
});

test("keyboard navigation respects nested controls and reduced motion", () => {
  const f = fixture({ reduced: true });
  try {
    let prevented = 0;
    const key = (value, target = f.track) => f.emit("keydown", { key: value, target, preventDefault: () => prevented++ });
    key("End");
    assert.equal(f.track.scrollLeft, 632);
    assert.equal(f.track.lastScroll.behavior, "instant");
    key("Home", {});
    assert.equal(f.track.scrollLeft, 632);
    key("Home");
    key("ArrowRight");
    key("ArrowLeft");
    assert.equal(f.track.scrollLeft, 0);
    assert.equal(prevented, 4);
  } finally { f.destroy(); }
});

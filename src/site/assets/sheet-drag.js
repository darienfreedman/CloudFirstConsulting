export function attachSheetDrag(handle, sheet, dismiss) {
  let drag;

  function reset() {
    const pointerId = drag?.pointerId;
    drag = undefined;
    if (pointerId !== undefined && handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    sheet.classList.remove("is-dragging");
    sheet.style.removeProperty("transform");
  }

  function start(event) {
    if (drag || !event.isPrimary || event.button !== 0 || event.target.closest("button,a,input,select,textarea")) return;
    drag = { pointerId: event.pointerId, startY: event.clientY, distance: 0, height: sheet.getBoundingClientRect().height };
    handle.setPointerCapture(event.pointerId);
    sheet.classList.add("is-dragging");
  }

  function move(event) {
    if (event.pointerId !== drag?.pointerId) return;
    drag.distance = Math.max(0, event.clientY - drag.startY);
    sheet.style.transform = `translateY(${drag.distance}px)`;
  }

  function end(event) {
    if (event.pointerId !== drag?.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    const threshold = Math.min(140, Math.max(72, drag.height * 0.2));
    reset();
    if (distance >= threshold) dismiss();
  }

  function cancel(event) {
    if (event.pointerId === drag?.pointerId) reset();
  }

  const events = { pointerdown: start, pointermove: move, pointerup: end, pointercancel: cancel, lostpointercapture: cancel };
  Object.entries(events).forEach(([name, listener]) => handle.addEventListener(name, listener));
  return () => {
    Object.entries(events).forEach(([name, listener]) => handle.removeEventListener(name, listener));
    reset();
  };
}

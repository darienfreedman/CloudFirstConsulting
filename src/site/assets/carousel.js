export function createCarouselController(track, { items = () => [...track.children], onChange }) {
  let active;
  let slides = [];
  let width = track.clientWidth;
  let resizeFrame;
  const offset = slide => slide.offsetLeft - slides[0].offsetLeft;

  function select(index) {
    active = slides[index];
    onChange(index, slides);
  }

  function moveTo(index, behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth") {
    if (!slides.length) return;
    const next = Math.max(0, Math.min(slides.length - 1, index));
    select(next);
    track.scrollTo({ left: offset(active), behavior });
  }

  function refresh() {
    slides = items();
    if (!slides.length) { active = undefined; onChange(0, slides); return; }
    moveTo(Math.max(0, slides.indexOf(active)), "instant");
  }

  function onScroll() {
    if (!slides.length) return;
    const nearest = slides.reduce((best, slide, index) =>
      Math.abs(offset(slide) - track.scrollLeft) < Math.abs(offset(slides[best]) - track.scrollLeft) ? index : best, 0);
    if (slides[nearest] !== active) select(nearest);
  }

  function onKeyDown(event) {
    if (event.target !== track || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = slides.indexOf(active);
    moveTo(event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 : index + (event.key === "ArrowRight" ? 1 : -1));
  }

  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("keydown", onKeyDown);
  const observer = new ResizeObserver(() => {
    if (resizeFrame !== undefined) return;
    // Only width changes need realignment; card selection must never resize the page.
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = undefined;
      if (track.clientWidth !== width) {
        width = track.clientWidth;
        refresh();
      }
    });
  });
  observer.observe(track);
  refresh();
  return {
    moveTo, refresh,
    reveal(element) {
      const index = slides.findIndex(slide => slide === element || slide.contains(element));
      if (index >= 0) moveTo(index, "instant");
    },
    destroy() {
      observer.disconnect();
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("keydown", onKeyDown);
    }
  };
}

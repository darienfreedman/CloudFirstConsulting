import React from "react";

export function CarouselPagination({ labels, selected, onSelect, trackId, label }) {
  return <div className="carousel-pagination" hidden={labels.length < 2}>
    <div className="carousel-dots" role="group" aria-label={label}>
      {labels.map((title, index) => <button key={title} className="carousel-dot" type="button"
        aria-label={`Go to card ${index + 1} of ${labels.length}: ${title}`}
        aria-controls={trackId} aria-current={selected === index ? "true" : undefined}
        onClick={() => onSelect(index)}><span aria-hidden="true" /></button>)}
    </div>
    <span className="carousel-status" role="status" aria-live="polite" aria-atomic="true">
      Card {selected + 1} of {labels.length}: {labels[selected]}
    </span>
  </div>;
}

import React, { useEffect, useRef, useState } from "react";
import { createCarouselController } from "../src/site/assets/carousel.js";
import { CarouselPagination } from "./carousel-pagination.jsx";
import { showMobileDetails } from "../src/site/assets/mobile-sheet.js";

function ServiceGraphic({ area }) {
  return <div className={`service-graphic service-graphic-${area}`} aria-hidden="true">
    <svg viewBox="0 0 320 100" fill="none" focusable="false">
      <path className="graphic-grid" d="M0 25h320M0 75h320M40 0v100M100 0v100M220 0v100M280 0v100" />
      {area === "security" ? <>
        <circle cx="160" cy="50" r="45" className="graphic-orbit" />
        <path d="M160 14l28 11v21c0 20-14 33-28 41-14-8-28-21-28-41V25z" className="graphic-main" />
        <path d="m147 48 9 9 18-20M85 50h30m90 0h30" className="graphic-line" />
        <circle cx="77" cy="50" r="8" className="graphic-node" /><circle cx="243" cy="50" r="8" className="graphic-node" />
      </> : area === "business" ? <>
        <path d="M97 50h34m58 0h34" className="graphic-line" />
        <rect x="39" y="26" width="58" height="48" rx="12" className="graphic-main" />
        <rect x="223" y="26" width="58" height="48" rx="12" className="graphic-main" />
        <circle cx="160" cy="50" r="29" className="graphic-main" />
        <path d="m160 31 5 14 14 5-14 5-5 14-5-14-14-5 14-5zM53 42h29M53 53h19m164-3 9 9 17-18" className="graphic-line" />
      </> : <>
        <path d="M112 62h92a16 16 0 0 0 0-32h-4a30 30 0 0 0-57-8 21 21 0 0 0-31 40Z" className="graphic-main" />
        <path d="M160 63v20M86 49H59v34m175-34h27v34M59 83h202" className="graphic-line" />
        <circle cx="59" cy="83" r="6" className="graphic-node" /><circle cx="160" cy="83" r="6" className="graphic-node" /><circle cx="261" cy="83" r="6" className="graphic-node" />
      </>}
    </svg>
  </div>;
}

export function MobileServiceExplorer({ areas }) {
  const [selected, setSelected] = useState(0);
  const track = useRef(null);
  const controller = useRef(null);
  const sheet = useRef(null);

  function moveTo(index) {
    controller.current.moveTo(index);
  }

  useEffect(() => {
    controller.current = createCarouselController(track.current, { onChange: setSelected });
    return () => {
      sheet.current?.close();
      controller.current.destroy();
    };
  }, []);

  function openDetails(area, trigger) {
    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", `${area.label} service details`);
    for (const link of area.links) {
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.textContent = link.label;
      nav.append(anchor);
    }
    sheet.current = showMobileDetails({ title: area.label, nodes: [nav], trigger });
  }

  return <section className="mobile-service-explorer" aria-label="Explore our services" aria-roledescription="carousel">
    <div className="service-area-choices" role="group" aria-label="Choose a service area">
      {areas.map((area, index) => <button key={area.key} type="button" aria-pressed={selected === index} aria-controls="mobile-service-track" onClick={() => moveTo(index)}>{area.shortLabel}</button>)}
    </div>
    <div id="mobile-service-track" className="service-carousel-track" ref={track} tabIndex={0} aria-label="Service cards. Swipe or choose a pagination dot.">
      {areas.map((area, index) => <article key={area.key} className="service-slide" aria-roledescription="slide"
        aria-label={`${index + 1} of ${areas.length}: ${area.label}`} {...(selected !== index ? { inert: "" } : {})}>
        <ServiceGraphic area={area.key} />
        <div className="service-slide-copy">
          <p className="service-slide-label">{area.label}</p>
          <h2>{area.headline}</h2>
          <p className="service-slide-description">{area.description}</p>
          <a className="button" href={area.href}>{area.cta} <span aria-hidden="true">&#8594;</span></a>
          <button className="mobile-details-trigger" type="button" aria-haspopup="dialog"
            aria-label={`View ${area.links.length} services in ${area.label}`}
            onClick={event => openDetails(area, event.currentTarget)}>What's included</button>
        </div>
      </article>)}
    </div>
    <CarouselPagination labels={areas.map(area => area.label)} selected={selected} onSelect={moveTo}
      trackId="mobile-service-track" label="Choose a service card" />
  </section>;
}

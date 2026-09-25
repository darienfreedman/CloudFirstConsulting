// Licensed photography and video used by the visual refresh. Keep IMAGE_CREDITS.md in sync.
const unsplash = "https://unsplash.com/license";
const pexels = "https://www.pexels.com/license/";

export const siteVideo = {
  file: "home-hero.mp4",
  source: "https://www.pexels.com/video/women-talking-while-looking-at-the-laptop-8631874/",
  creator: "Kampus Production",
  license: pexels,
  description: "Three colleagues reviewing work together at their desks",
  maxBytes: 2_000_000
};

export const sitePhotos = [
  { files: ["home-hero-poster-640.webp", "home-hero-poster-1280.webp"], source: siteVideo.source, license: pexels, description: "First frame of the homepage video, used as its poster" },
  { files: ["home-card-security-800.webp"], source: "https://unsplash.com/photos/a-person-holding-a-phone-Uw_8vSroCSc", license: unsplash, description: "A person confirming a sign-in with a fingerprint on a phone" },
  { files: ["home-card-business-800.webp"], source: "https://unsplash.com/photos/two-woman-sitting-near-table-using-samsung-laptop-tLG2hcpITZE", license: unsplash, description: "Two colleagues working through a task on a laptop" },
  { files: ["home-card-cloud-800.webp"], source: "https://unsplash.com/photos/a-rack-of-electronic-equipment-in-a-dark-room-OnI_TNcIv9U", license: unsplash, description: "Network equipment lit green in a dark server room" },
  { files: ["home-step-assess-640.webp", "home-step-assess-1200.webp"], source: "https://unsplash.com/photos/two-women-standing-in-front-of-a-white-board-cD6KxGylYo4", license: unsplash, description: "Two people mapping priorities on a whiteboard" },
  { files: ["home-step-build-640.webp", "home-step-build-1200.webp"], source: "https://unsplash.com/photos/two-smiling-men-looking-at-macbook-iQ15DTx-63k", license: unsplash, description: "Two colleagues building and testing on a laptop" },
  { files: ["home-step-improve-640.webp", "home-step-improve-1200.webp"], source: "https://unsplash.com/photos/a-group-of-people-sitting-around-a-table-talking-CjP2TAGUlGY", license: unsplash, description: "Three people reviewing results around a table" },
  { files: ["home-closing-800.webp", "home-closing-1600.webp"], source: "https://unsplash.com/photos/people-working-late-in-a-dimly-lit-office-BC_lzmF2R94", license: unsplash, description: "People working late in a dimly lit office" },
  { files: ["service-security-800.webp", "service-security-1600.webp"], source: "https://unsplash.com/photos/person-looking-at-phone-in-front-of-multiple-computer-monitors-VhhlVXFaJXs", license: unsplash, description: "A person checking a phone in front of several monitors" },
  { files: ["service-business-800.webp", "service-business-1600.webp"], source: "https://unsplash.com/photos/women-looking-at-laptop-in-cafe-HaTIYO87qWQ", license: unsplash, description: "Two women looking at a laptop together" },
  { files: ["service-cloud-800.webp", "service-cloud-1600.webp"], source: "https://unsplash.com/photos/a-group-of-people-sitting-at-computers-0gMgu4nI63k", license: unsplash, description: "A team working together at computers" },
  { files: ["logo-mark-160.webp", "share-card.jpg"], source: "Cloud First Consulting logo and homepage video frame", license: "Owned brand asset", description: "Optimized logo mark and link preview image" }
];

export const sitePhotoFiles = sitePhotos.flatMap(photo => photo.files);

import "./style.css";

// O Ares Studio utiliza sua experiência completa de movimento
// independentemente da preferência de movimento do sistema.
document.documentElement.dataset.motion = "force";

const prefersReducedMotion = false;
const toggle = document.querySelector(".mobile-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const header = document.querySelector(".site-header");

const businessHours = {
  sunday: [],
  monday: [
    { start: "08:00", end: "12:00" },
    { start: "16:00", end: "20:00" },
  ],
  tuesday: [
    { start: "08:00", end: "12:00" },
    { start: "16:00", end: "20:00" },
  ],
  wednesday: [
    { start: "08:00", end: "12:00" },
    { start: "16:00", end: "20:00" },
  ],
  thursday: [
    { start: "08:00", end: "12:00" },
    { start: "16:00", end: "20:00" },
  ],
  friday: [
    { start: "08:00", end: "12:00" },
    { start: "16:00", end: "20:00" },
  ],
  saturday: [{ start: "08:00", end: "12:00" }],
};

const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isBusinessOpen = (date = new Date()) => {
  const day = weekDays[date.getDay()];
  const intervals = businessHours[day] || [];
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return intervals.some(({ start, end }) => currentMinutes >= toMinutes(start) && currentMinutes < toMinutes(end));
};

const initBusinessStatus = () => {
  const statusElements = Array.from(document.querySelectorAll("[data-business-status]"));
  if (!statusElements.length) return;

  const updateStatus = () => {
    const isOpen = isBusinessOpen();
    statusElements.forEach((status) => {
      const label = status.querySelector("[data-business-status-label]");
      status.classList.toggle("is-open", isOpen);
      status.classList.toggle("is-closed", !isOpen);
      if (label) label.textContent = isOpen ? "Aberto" : "Fechado";
      status.setAttribute("aria-label", `Status de funcionamento: ${isOpen ? "Aberto" : "Fechado"}`);
    });
  };

  updateStatus();
  window.setInterval(updateStatus, 60 * 1000);
};

const initNavigation = () => {
  toggle?.addEventListener("click", () => {
    const isOpen = mobileMenu?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      const target = targetId ? document.querySelector(targetId) : null;

      if (!target) return;
      event.preventDefault();
      mobileMenu?.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });
};

const initReveal = () => {
  const isCompletelyOutside = (entry) => {
    const rect = entry.boundingClientRect;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom < 0 || rect.top > vh;
  };

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        // ensure armed state exists
        if (!el.dataset.replayArmed) el.dataset.replayArmed = "true";

        if (entry.isIntersecting && el.dataset.replayArmed === "true") {
          el.classList.add("is-visible");
          el.dataset.replayArmed = "false";
        }

        // when fully out of viewport -> reset so it can play again next enter
        if (!entry.isIntersecting && isCompletelyOutside(entry)) {
          el.classList.remove("is-visible");
          el.dataset.replayArmed = "true";
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -40px" },
  );

  document.querySelectorAll(".reveal").forEach((element) => {
    // skip reveals that are controlled by the hero replay system
    if (element.closest('.hero-section') || element.dataset.heroControlled === 'true') return;
    revealObserver.observe(element);
  });
};

const initHeroReplay = () => {
  const hero = document.querySelector('.hero-section');
  const title = document.querySelector('.hero-title');
  const heroMedia = document.querySelector('.hero-media');
  if (!hero || !title) return;

  // ensure hero-managed reveals are not handled by generic reveal observer
  // mark hero children to be skipped by initReveal
  hero.querySelectorAll('.reveal').forEach(el => el.dataset.heroControlled = 'true');

  const isCompletelyOutside = (entry) => {
    const rect = entry.boundingClientRect;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom < 0 || rect.top > vh;
  };

  // ensure play/reset helpers exist
  if (typeof title.playLetterDrop !== 'function' || typeof title.resetLetterDrop !== 'function') {
    // if not initialized yet, try to initialize hero letter drop
    try { initHeroTitleLetterDrop(); } catch (e) { /* ignore */ }
  }

  // arm by default
  if (!hero.dataset.replayArmed) hero.dataset.replayArmed = 'true';

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && hero.dataset.replayArmed === 'true') {
        hero.dataset.replayArmed = 'false';
        // play letter drop and hero media reveal
        try { title.playLetterDrop?.(); } catch (e) {}
        try { if (heroMedia) { /* start hero media reveal if exists */
            // reuse existing function startHeroMediaReveal by toggling dataset and letting initHeroTitleLetterDrop handle it
            heroMedia.dataset.heroMediaRevealStarted = undefined;
            // ensure clipPath set to initial state before play
            heroMedia.classList.remove('is-hero-media-revealed','is-hero-media-revealing');
            title.playLetterDrop?.();
          }} catch (e) {}
      }

      if (!entry.isIntersecting && isCompletelyOutside(entry)) {
        // reset hero when completely out
        hero.dataset.replayArmed = 'true';
        try { title.resetLetterDrop?.(); } catch (e) {}
        try {
          if (heroMedia) {
            heroMedia.getAnimations?.().forEach(a => a.cancel());
            heroMedia.classList.remove('is-hero-media-revealed','is-hero-media-revealing');
            heroMedia.style.clipPath = '';
            delete heroMedia.dataset.heroMediaRevealStarted;
          }
        } catch (e) {}
      }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -0% 0px' });

  observer.observe(hero);
};

const initHeroTitleLetterDrop = () => {
  const title = document.querySelector(".hero-title");
  const heroMedia = document.querySelector(".hero-media");
  if (!title) {
    document.documentElement.classList.remove("hero-media-preparing");
    return;
  }
  if (title.dataset.letterDropInitialized === "true") {
    document.documentElement.classList.remove("hero-media-preparing");
    return;
  }

  const startY = window.innerWidth < 768 ? -86 : -115;
  const duration = prefersReducedMotion ? 640 : 1100;
  const stagger = prefersReducedMotion ? 48 : 100;
  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  const mediaRevealDuration = window.innerWidth < 768 ? 1400 : 1800;
  const mediaRevealDelay = 220;
  const mediaRevealEasing = "cubic-bezier(0.22, 1, 0.36, 1)";

  const rawLines = [""];
  title.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
      rawLines.push("");
      return;
    }

    rawLines[rawLines.length - 1] += node.textContent || "";
  });

  const lines = rawLines
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    document.documentElement.classList.remove("hero-title-preparing");
    document.documentElement.classList.remove("hero-media-preparing");
    return;
  }

  title.dataset.letterDropInitialized = "true";
  title.setAttribute("aria-label", lines.join(" "));
  title.textContent = "";

  let charIndex = 0;
  const chars = [];

  lines.forEach((line) => {
    const lineElement = document.createElement("span");
    lineElement.className = "hero-title-line";
    lineElement.setAttribute("aria-hidden", "true");

    [...line].forEach((char) => {
      if (char === " ") {
        lineElement.appendChild(document.createTextNode(" "));
        charIndex += 1;
        return;
      }

      const span = document.createElement("span");
      span.className = "hero-title-char";
      span.setAttribute("aria-hidden", "true");
      span.style.setProperty("--char-index", charIndex);
      span.style.opacity = "0";
      span.style.transform = `translate3d(0, ${startY}px, 0)`;
      span.textContent = char;
      lineElement.appendChild(span);
      chars.push(span);
      charIndex += 1;
    });

    title.appendChild(lineElement);
  });

  title.classList.add("is-letter-drop-ready");

  const completeLetterDrop = () => {
    chars.forEach((char) => {
      char.style.opacity = "1";
      char.style.transform = "none";
      char.getAnimations?.().forEach((animation) => animation.cancel());
    });
    title.classList.remove("is-letter-drop-ready");
    title.classList.remove("is-letter-drop-css-active");
    title.classList.add("is-letter-drop-complete");
  };

  title.getBoundingClientRect();

  const afterWindowLoad = () =>
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));

  const afterFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const afterDelay = (delay) => new Promise((resolve) => window.setTimeout(resolve, delay));

  const completeHeroMediaReveal = () => {
    if (!heroMedia) return;

    heroMedia.style.clipPath = "";
    heroMedia.classList.remove("is-hero-media-revealing");
    heroMedia.classList.add("is-hero-media-revealed");
    heroMedia.getAnimations?.().forEach((animation) => animation.cancel());
  };

  const startHeroMediaReveal = () => {
    if (!heroMedia || heroMedia.dataset.heroMediaRevealStarted === "true") {
      document.documentElement.classList.remove("hero-media-preparing");
      return;
    }

    heroMedia.dataset.heroMediaRevealStarted = "true";
    heroMedia.style.clipPath = "inset(0 100% 0 0)";
    heroMedia.getBoundingClientRect();
    document.documentElement.classList.remove("hero-media-preparing");

    if (!Element.prototype.animate) {
      heroMedia.classList.add("is-hero-media-revealing");
      window.setTimeout(completeHeroMediaReveal, mediaRevealDuration + 80);
      return;
    }

    const animation = heroMedia.animate(
      [
        { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0 0 0)" },
      ],
      {
        duration: mediaRevealDuration,
        easing: mediaRevealEasing,
        fill: "both",
      },
    );

    animation.finished.then(completeHeroMediaReveal).catch(completeHeroMediaReveal);
  };

  const startAnimation = () => {
    document.documentElement.classList.remove("hero-title-preparing");
    window.setTimeout(startHeroMediaReveal, mediaRevealDelay);

    if (!Element.prototype.animate) {
      title.classList.add("is-letter-drop-css-active");
      window.setTimeout(() => {
        completeLetterDrop();
      }, duration + (chars.length - 1) * stagger + 80);
      return;
    }

    const animations = chars.map((char, index) =>
      char.animate(
        [
          { opacity: 0, transform: `translate3d(0, ${startY}px, 0)` },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          delay: index * stagger,
          duration,
          easing,
          fill: "both",
        },
      ),
    );

    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      completeLetterDrop();
    });
  };
  // expose play / reset helpers to allow replay when element leaves viewport
  title._heroChars = chars;
  title.playLetterDrop = () => {
    if (title.dataset.playing === "true") return;
    title.dataset.playing = "true";
    // ensure media reveal runs as part of the sequence
    startAnimation();
    // clear playing flag after generous timeout (animation + stagger)
    const est = duration + (chars.length - 1) * stagger + 200;
    window.setTimeout(() => (title.dataset.playing = "false"), est);
  };

  title.resetLetterDrop = () => {
    // cancel any running animations and reset visual state
    chars.forEach((char) => {
      char.getAnimations?.().forEach((a) => a.cancel());
      char.style.opacity = "0";
      char.style.transform = `translate3d(0, ${startY}px, 0)`;
    });
    title.classList.remove("is-letter-drop-css-active", "is-letter-drop-complete");
    title.classList.add("is-letter-drop-ready");
    title.dataset.playing = "false";
    if (heroMedia) {
      heroMedia.getAnimations?.().forEach((a) => a.cancel());
      heroMedia.classList.remove("is-hero-media-revealed", "is-hero-media-revealing");
      heroMedia.style.clipPath = "";
      delete heroMedia.dataset.heroMediaRevealStarted;
    }
  };

  // run initial play once (as page loaded)
  afterFrame()
    .then(afterFrame)
    .then(afterWindowLoad)
    .then(() => afterDelay(200))
    .then(() => title.playLetterDrop());
};

const initScrollEffects = () => {
  let ticking = false;

  const updateScrollEffects = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 12);

    if (!prefersReducedMotion && window.innerWidth >= 768) {
      document.querySelectorAll("[data-parallax]").forEach((element) => {
        const speed = Number(element.dataset.parallax || 0.04);
        const rect = element.getBoundingClientRect();
        const offset = (window.innerHeight / 2 - rect.top) * speed;
        element.style.setProperty("--parallax-y", `${Math.max(-24, Math.min(24, offset))}px`);
      });
    }

    ticking = false;
  };

  const requestScrollEffects = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollEffects);
      ticking = true;
    }
  };

  window.addEventListener("scroll", requestScrollEffects, { passive: true });
  window.addEventListener("resize", requestScrollEffects);
  updateScrollEffects();
};

const afterPreparedPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

const initAboutImageFold = () => {
  const foldBlocks = document.querySelectorAll("[data-about-fold]");
  if (!foldBlocks.length) return;

  const supportsAnimations = Boolean(Element.prototype.animate);
  const supports3d =
    typeof CSS === "undefined" || !CSS.supports || CSS.supports("transform-style", "preserve-3d");

  foldBlocks.forEach((block) => {
    const image = block.querySelector(".about-photo");
    const revealLayer = block.querySelector(".about-media-reveal") || block;
    if (!image) return;
    const imageReady =
      image.complete || !image.decode ? Promise.resolve() : image.decode().catch(() => null);

    const useFallback = () => {
      block.classList.remove("is-fold-prepared", "is-fold-active");
      block.classList.add("is-fold-fallback");
      block.querySelector(".about-fold-slices")?.remove();
      delete block.dataset.foldPrepared;
      delete block.dataset.foldStarted;
    };

    if (!supportsAnimations || !supports3d || prefersReducedMotion) {
      useFallback();
      return;
    }

    const prepareFold = () => {
      if (block.dataset.foldPrepared === "true") return true;
      const rect = block.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        useFallback();
        return false;
      }

      const sliceCount = 9;
      const width = rect.width;
      const height = rect.height;
      const imageStyle = getComputedStyle(image);
      const layer = document.createElement("div");
      const center = (sliceCount - 1) / 2;
      const sliceWidth = width / sliceCount;
      const duration = window.innerWidth < 768 ? 1150 : 1350;
      const stagger = 70;

      layer.className = "about-fold-slices";
      block.style.setProperty("--fold-slices", sliceCount);
      block.style.setProperty("--fold-width", width);
      block.style.setProperty("--fold-height", height);
      block.style.setProperty("--fold-slice-width", `${sliceWidth}px`);

      const slices = Array.from({ length: sliceCount }, (_, index) => {
        const slice = document.createElement("span");
        const positionX = index * sliceWidth;
        const direction = index % 2 === 0 ? -1 : 1;
        const angle = (26 + Math.abs(index - center) * 3) * direction;
        const sliceImage = image.cloneNode();

        slice.className = "about-fold-slice";
        slice.setAttribute("aria-hidden", "true");
        slice.style.setProperty("--slice-offset", positionX);
        slice.style.setProperty("--fold-angle", `${angle}deg`);
        slice.style.setProperty("--fold-y", `${index % 2 === 0 ? 12 : -8}px`);
        slice.style.setProperty("--fold-delay", `${index * stagger}ms`);
        slice.style.setProperty("--fold-duration", `${duration}ms`);
        sliceImage.alt = "";
        sliceImage.removeAttribute("class");
        sliceImage.removeAttribute("loading");
        sliceImage.removeAttribute("decoding");
        sliceImage.setAttribute("aria-hidden", "true");
        sliceImage.style.objectFit = imageStyle.objectFit;
        sliceImage.style.objectPosition = imageStyle.objectPosition;
        sliceImage.style.left = `-${positionX}px`;
        sliceImage.style.width = `${width}px`;
        sliceImage.style.height = `${height}px`;
        slice.appendChild(sliceImage);
        layer.appendChild(slice);
      });

      block.querySelector(".about-fold-slices")?.remove();
      revealLayer.appendChild(layer);
      block.classList.remove("is-fold-complete", "is-fold-fallback");
      block.classList.add("is-fold-prepared");
      block.dataset.foldPrepared = "true";
      block.dataset.foldDuration = String(duration);
      block.dataset.foldStagger = String(stagger);
      block.getBoundingClientRect();
      return true;
    };

    const startFold = async () => {
      if (block.dataset.foldStarted === "true") return;
      if (block.dataset.foldPrepared !== "true" && !prepareFold()) return;
      block.dataset.foldStarted = "true";

      try {
        await imageReady;
      } catch {
        useFallback();
        return;
      }

      block.getBoundingClientRect();
      block.classList.add("is-fold-active");

      const duration = Number(block.dataset.foldDuration || 1350);
      const stagger = Number(block.dataset.foldStagger || 70);
      const sliceCount = Number(block.style.getPropertyValue("--fold-slices") || 9);
      window.setTimeout(() => {
        block.classList.add("is-fold-complete");
        block.classList.remove("is-fold-prepared", "is-fold-active");
        window.setTimeout(() => block.querySelector(".about-fold-slices")?.remove(), 180);
      }, duration + (sliceCount - 1) * stagger + 140);
    };

    // allow clean reset from outside (called when section fully leaves viewport)
    block.resetAboutFold = () => {
      block.classList.remove("is-fold-active", "is-fold-prepared", "is-fold-complete", "is-fold-fallback");
      block.querySelector(".about-fold-slices")?.remove();
      delete block.dataset.foldPrepared;
      delete block.dataset.foldStarted;
      // ensure base photo is visible again
      const photo = block.querySelector('.about-photo');
      if (photo) photo.style.opacity = '';
    };

    block.prepareAboutFold = prepareFold;
    block.startAboutFold = startFold;
    prepareFold();
  });
};

const initAboutSectionIntro = () => {
  const section = document.querySelector("[data-about-intro]");
  if (!section) return;

  const title = section.querySelector("[data-about-animate='title']");
  if (title && title.dataset.aboutTitlePrepared !== "true") {
    const titleText = title.textContent.trim();
    title.dataset.aboutTitlePrepared = "true";
    title.setAttribute("aria-label", titleText);
    title.textContent = "";

    [...titleText].forEach((char, index) => {
      if (char === " ") {
        title.appendChild(document.createTextNode(" "));
        return;
      }

      const mask = document.createElement("span");
      const letter = document.createElement("span");
      mask.className = "about-title-char-mask";
      mask.setAttribute("aria-hidden", "true");
      letter.className = "about-title-char";
      letter.style.setProperty("--about-char-delay", `${index * 35}ms`);
      letter.textContent = char;
      mask.appendChild(letter);
      title.appendChild(mask);
    });
  }

  const animatedItems = Array.from(section.querySelectorAll("[data-about-animate='item']"));
  animatedItems.forEach((item, index) => {
    item.style.setProperty("--about-delay", `${720 + index * 110}ms`);
  });

  section.classList.remove("is-about-ready", "is-about-visible");

  if (prefersReducedMotion) {
    section.classList.add("is-about-active");
    return;
  }

  section.classList.add("is-about-prepared");
  section.querySelectorAll("[data-about-fold]").forEach((block) => {
    block.prepareAboutFold?.();
  });
  section.getBoundingClientRect();

  const trigger = section.querySelector("[data-about-fold]") || section;
  afterPreparedPaint().then(() => {
    const isCompletelyOutside = (entry) => {
      const rect = entry.boundingClientRect;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.bottom < 0 || rect.top > vh;
    };

    const aboutObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!trigger.dataset.replayArmed) trigger.dataset.replayArmed = "true";

          if (entry.isIntersecting && trigger.dataset.replayArmed === "true") {
            trigger.dataset.replayArmed = "false";
            section.classList.add("is-about-active");
            section.querySelectorAll("[data-about-fold]").forEach((block) => {
              block.startAboutFold?.();
            });
          }

          if (!entry.isIntersecting && isCompletelyOutside(entry)) {
            // reset state so the about can animate again on next enter
            trigger.dataset.replayArmed = "true";
            section.classList.remove("is-about-active");
            section.classList.add("is-about-prepared");
            section.querySelectorAll("[data-about-fold]").forEach((block) => {
              block.resetAboutFold?.();
              // re-prepare to ensure slices are rebuilt on next enter
              block.prepareAboutFold?.();
            });
          }
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px -25% 0px" },
    );

    aboutObserver.observe(trigger);
  });
};

const initInstructorIntro = () => {
  const blocks = document.querySelectorAll("[data-instructor-intro]");
  if (!blocks.length) return;

  blocks.forEach((block) => {
    block.classList.remove("is-instructor-ready", "is-instructor-visible");

    if (prefersReducedMotion) {
      block.classList.add("is-instructor-active");
      return;
    }

    block.querySelectorAll("[data-instructor-animate='name-line']").forEach((line, index) => {
      line.style.setProperty("--instructor-name-delay", `${190 + index * 110}ms`);
    });
    block.querySelectorAll("[data-instructor-animate='body']").forEach((item, index) => {
      item.style.setProperty("--instructor-body-delay", `${560 + index * 120}ms`);
    });
    block.classList.add("is-instructor-prepared");
    block.getBoundingClientRect();
    const trigger = block.querySelector(".instructor-media-frame") || block;

    afterPreparedPaint().then(() => {
      const isCompletelyOutside = (entry) => {
        const rect = entry.boundingClientRect;
        const vh = window.innerHeight || document.documentElement.clientHeight;
        return rect.bottom < 0 || rect.top > vh;
      };

      const instructorObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!trigger.dataset.replayArmed) trigger.dataset.replayArmed = "true";

            if (entry.isIntersecting && trigger.dataset.replayArmed === "true") {
              trigger.dataset.replayArmed = "false";
              block.classList.add("is-instructor-active");
            }

            if (!entry.isIntersecting && isCompletelyOutside(entry)) {
              trigger.dataset.replayArmed = "true";
              block.classList.remove("is-instructor-active");
            }
          });
        },
        { threshold: 0.04, rootMargin: "0px 0px -25% 0px" },
      );

      instructorObserver.observe(trigger);
    });
  });
};

const initViewportVideos = () => {
  const videos = Array.from(document.querySelectorAll("[data-viewport-video]"));
  if (!videos.length || !("IntersectionObserver" in window)) return;

  const playVideo = (video) => {
    if (video.dataset.videoState === "playing" || video.dataset.videoState === "pending") return;

    video.dataset.videoState = "pending";
    const playPromise = video.play();

    if (playPromise) {
      playPromise
        .then(() => {
          video.dataset.videoState = "playing";
        })
        .catch(() => {
          video.dataset.videoState = "paused";
        });
      return;
    }

    video.dataset.videoState = "playing";
  };

  const pauseVideo = (video) => {
    if (video.dataset.videoState === "paused") return;

    video.pause();
    video.dataset.videoState = "paused";
  };

  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          playVideo(video);
          return;
        }

        pauseVideo(video);
      });
    },
    { threshold: 0.35 },
  );

  videos.forEach((video) => {
    video.dataset.videoState = "paused";
    videoObserver.observe(video);
  });
};

const initHeroCarousel = () => {
  const carousel = document.querySelector("[data-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-carousel-track]");
  const viewport = carousel.querySelector(".carousel-viewport");
  const slides = Array.from(carousel.querySelectorAll("[data-slide]:not([data-clone])"));
  const depthSlides = Array.from(carousel.querySelectorAll("[data-depth-slide]"));
  const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
  const previous = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  const AUTOPLAY_INTERVAL = 5000;
  let index = 0;
  let position = 1;
  let timer = null;
  let isAnimating = false;
  let isPaused = false;
  let drag = null;

  const wrap = (value) => (value + slides.length) % slides.length;

  const render = () => {
    slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === index));
    depthSlides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-prev", slideIndex === wrap(index - 1));
      slide.classList.toggle("is-next", slideIndex === wrap(index + 1));
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
      dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
    });
  };

  const moveTrack = () => {
    track.style.transform = `translate3d(-${position * 100}%, 0, 0)`;
  };

  const moveTrackBy = (deltaX) => {
    track.style.transform = `translate3d(calc(-${position * 100}% + ${deltaX}px), 0, 0)`;
  };

  const resetTrackPosition = (nextPosition) => {
    track.classList.add("is-resetting");
    position = nextPosition;
    moveTrack();
    track.offsetHeight;
    track.classList.remove("is-resetting");
  };

  const stop = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  const start = () => {
    stop();
    if (document.hidden || isPaused) return;
    timer = window.setTimeout(() => {
      goTo(index + 1);
    }, AUTOPLAY_INTERVAL);
  };

  const goTo = (nextIndex) => {
    if (isAnimating) return;
    stop();
    track.classList.remove("is-dragging");
    viewport?.classList.remove("is-dragging");
    isAnimating = true;
    index = wrap(nextIndex);
    position = nextIndex < 0 ? 0 : nextIndex >= slides.length ? slides.length + 1 : index + 1;
    render();
    moveTrack();
  };

  previous?.addEventListener("click", () => goTo(index - 1));
  next?.addEventListener("click", () => goTo(index + 1));

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", () => goTo(dotIndex));
  });

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") return;
    if (position === 0) resetTrackPosition(slides.length);
    if (position === slides.length + 1) resetTrackPosition(1);
    isAnimating = false;
    start();
  });

  carousel.addEventListener("mouseenter", () => {
    isPaused = true;
    stop();
  });
  carousel.addEventListener("mouseleave", () => {
    isPaused = false;
    start();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      return;
    }
    start();
  });

  const clearDrag = () => {
    track.classList.remove("is-dragging");
    viewport?.classList.remove("is-dragging");
    drag = null;
  };

  const snapBack = () => {
    if (!drag?.isHorizontal) {
      clearDrag();
      start();
      return;
    }

    clearDrag();
    isAnimating = true;
    moveTrack();
  };

  const beginDrag = (event) => {
    if (isAnimating || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      isHorizontal: false,
    };
    stop();
    viewport?.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    drag.currentX = event.clientX;

    if (!drag.isHorizontal) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX < 8 && absY < 8) return;
      if (absY > absX) {
        viewport?.releasePointerCapture?.(event.pointerId);
        clearDrag();
        start();
        return;
      }

      drag.isHorizontal = true;
      track.classList.add("is-dragging");
      viewport?.classList.add("is-dragging");
    }

    event.preventDefault();
    moveTrackBy(deltaX);
  };

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const distance = drag.currentX - drag.startX;
    const threshold = Math.min(Math.max((viewport?.clientWidth || 360) * 0.16, 50), 80);
    viewport?.releasePointerCapture?.(event.pointerId);

    if (!drag.isHorizontal) {
      clearDrag();
      start();
      return;
    }

    clearDrag();
    if (Math.abs(distance) >= threshold) {
      goTo(index + (distance < 0 ? 1 : -1));
      return;
    }

    isAnimating = true;
    moveTrack();
  };

  viewport?.addEventListener("pointerdown", beginDrag);
  viewport?.addEventListener("pointermove", moveDrag);
  viewport?.addEventListener("pointerup", endDrag);
  viewport?.addEventListener("pointercancel", snapBack);

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") goTo(index - 1);
    if (event.key === "ArrowRight") goTo(index + 1);
  });

  render();
  resetTrackPosition(1);
  window.requestAnimationFrame(() => carousel.classList.add("is-ready"));
  start();
};

initNavigation();
initBusinessStatus();
initHeroTitleLetterDrop();
initReveal();
initHeroReplay();
initScrollEffects();
initAboutImageFold();
initAboutSectionIntro();
initInstructorIntro();
initViewportVideos();
document.documentElement.classList.remove("about-animations-preparing");
initHeroCarousel();

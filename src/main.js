import "./style.css";

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = motionQuery.matches;
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
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -40px" },
  );

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
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
initReveal();
initScrollEffects();
initHeroCarousel();

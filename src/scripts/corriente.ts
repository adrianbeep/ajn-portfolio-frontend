/**
 * Campo de corrientes — el fondo del hero.
 *
 * Es un port del prototipo verificado en
 * `corriente-prototype/index.html` (fuera del repo). Las constantes numéricas
 * de acá son MEDIDAS, no_estimadas: cambiarlas rompe el efecto, y cada una
 * explica por qué en el comentario que la acompaña.
 *
 * El módulo exporta una sola cosa, `mountCorriente`, y no deja nada global
 * salvo el handle de teardown: Astro puede volver a ejecutarlo en una
 * navegación client-side y el efecto tiene que quedar UNO solo.
 */

/* --------------------------------------------------------------------------
 * Constantes medidas. No "tidyar" estos números.
 * ------------------------------------------------------------------------ */

/**
 * La deriva horizontal del campo.
 *
 * No es un valor arbitrario: con 0.0075 el curl de las octavas le gana a la
 * deriva y se forman celdas de recirculación cerradas. Las líneas que entran
 * ahí dan vueltas eternamente, agotan el presupuesto de pasos y se cortan
 * en seco DENTRO del frame (medido: 14 de 42 líneas cortadas). Con 0.013 no
 * se forman celdas: medido, 0 cortes en un ciclo completo de 45s del campo.
 */
const DRIFT = 0.013;

/** Radio de la lente del mouse, en px. */
const LENS_RADIUS = 140;

/** Cuánto empuja la lente al flujo hacia afuera (0..1). */
const LENS_PULL = 0.5;

/**
 * Radio del tinte de acento, en px. Tiene que ser MUCHO más chico que el
 * radio de la lente: si no, el vermellón deja de ser un destello y pasa a
 * ser un manchón.
 */
const ACCENT_RADIUS = 78;

/** Distancia entre pasos de la integración, en px. */
const STEP = 7;

/** Cuántas líneas se siembran en desktop. */
const LINE_COUNT = 42;

/** Throttling: 33ms con el mouse activo, 50ms en idle. */
const INTERVAL_ACTIVE = 33;
const INTERVAL_IDLE = 50;

/** Tope del device pixel ratio: más DPR no aporta nada visible y cuesta fill rate. */
const DPR_CAP = 1.5;

/** En cuántos tramos se divide la cola que se desvanece. */
const FADE_CHUNKS = 8;

/* --------------------------------------------------------------------------
 * Tipos
 * ------------------------------------------------------------------------ */

/** Por qué terminó una línea: se le acabaron los pasos, o se fue del frame. */
type LineTerm = "budget" | "bounds";

interface Vec2 {
  x: number;
  y: number;
}

interface Line {
  /** Puntos (x, y) intercalados de la polilínea. */
  points: Float32Array;
  /** Cuántos puntos tiene la polilínea. */
  count: number;
  /** Tramo a teñir de acento: -1 si no hay. */
  nearStart: number;
  nearEnd: number;
  /** Altura de siembra de la línea (fuera de pantalla, arriba). */
  seedY: number;
  /** Desvío horizontal de siembra. */
  jitter: number;
  /** Alfa por línea: da profundidad y evita el look de trama uniforme. */
  alpha: number;
  /** Motivo de terminación: define si la cola se desvanece. */
  term: LineTerm;
}

interface Colors {
  line: string;
  accent: string;
  alpha: number;
  accentAlpha: number;
}

interface Pointer {
  /** Posición suavizada (la que usa el campo). */
  x: number;
  y: number;
  /** Posición cruda del puntero (la que se persigue). */
  tx: number;
  ty: number;
  inside: boolean;
  /** 0 = sin influencia del mouse, 1 = influencia total. */
  influence: number;
}

/** Scope global para el handle de teardown (evita `declare global`). */
type CorrienteScope = typeof globalThis & {
  __corrienteTeardown__?: () => void;
};

/** Dirección del campo: se reusa como scratch para no alocar en cada paso. */
const dir: Vec2 = { x: 1, y: 0 };

/**
 * Lee un token del design system desde el tema activo.
 *
 * Los tokens de efecto apuntan a otros tokens (`--effect-accent:
 * var(--color-accent)`), así que si el navegador no resuelve la sustitución
 * hay que bajar un nivel a mano.
 */
function readToken(styles: CSSStyleDeclaration, name: string): string {
  const raw = styles.getPropertyValue(name).trim();
  const nested = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(raw);
  return nested ? styles.getPropertyValue(nested[1]).trim() : raw;
}

/**
 * Monta el campo de corrientes sobre el canvas `[data-corriente]`.
 *
 * Es idempotente: si ya hay una instancia viva (una navegación client-side
 * de Astro puede volver a correr este módulo), se desmonta antes de montar
 * la nueva.
 */
export function mountCorriente(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-corriente]");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scope = globalThis as CorrienteScope;
  scope.__corrienteTeardown__?.();

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(any-hover: hover) and (any-pointer: fine)");

  const state = {
    w: 1,
    h: 1,
    dpr: 1,
    time: 0,
    frame: 0,
    last: 0,
    visible: !document.hidden,
    lines: [] as Line[],
    colors: { line: "", accent: "", alpha: 1, accentAlpha: 0.62 } as Colors,
    pointer: { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false, influence: 0 } as Pointer,
  };

  /* ==================================================================
     CAMPO VECTORIAL
     Se construye a partir de un potencial escalar ψ y se toma la
     perpendicular de su gradiente. Eso da un campo SIN divergencia:
     las líneas no se abren ni se cierran entre sí, se enrollan. Ese
     enrollamiento es lo que separa "corriente de agua" de "trama de
     rayas". Se le suma una deriva a la derecha para que el conjunto
     tenga dirección de flujo y no sea un laberinto.
     ================================================================== */
  const field = (x: number, y: number, t: number, out: Vec2): void => {
    // --- octava 1: el rollo grande ---
    const p1 = x * 0.0045 + t * 0.16;
    const q1 = y * 0.0068 - t * 0.13;
    const s1 = Math.sin(p1);
    const c1 = Math.cos(p1);
    const s2 = Math.sin(q1);
    const c2 = Math.cos(q1);

    // --- octava 2: el detalle ---
    const p2 = x * 0.0125 - t * 0.19;
    const q2 = y * 0.0142 + t * 0.11;
    const s3 = Math.sin(p2);
    const c3 = Math.cos(p2);
    const s4 = Math.sin(q2);
    const c4 = Math.cos(q2);

    // --- octava 3: una diagonal, para romper la simetría ---
    const p3 = (x * 0.85 + y * 0.5) * 0.0072 + t * 0.09;
    const c5 = Math.cos(p3);

    // ∂ψ/∂y  y  ∂ψ/∂x
    const dPsiDy = 0.0068 * s1 * c2 + 0.0078 * s3 * c4 + 0.0029 * c5;
    const dPsiDx = 0.0045 * c1 * s2 + 0.0069 * c3 * s4 + 0.0049 * c5;

    const dx = dPsiDy + DRIFT;
    const dy = -dPsiDx;
    const len = Math.hypot(dx, dy) || 1;
    out.x = dx / len;
    out.y = dy / len;
  };

  /* ==================================================================
     LÍNEAS
     Se siembran sobre una vertical fuera de pantalla y se integra hacia
     adelante. Cada línea guarda sus puntos y el tramo que está cerca
     del mouse (para teñirlo de acento).
     ================================================================== */
  const buildLines = (): void => {
    const { w, h } = state;
    const count = LINE_COUNT;
    /* El presupuesto de pasos tiene que alcanzar para cruzar el frame con
       margen; si se agota antes, la línea se corta a la vista (de ahí el
       desvanecido de la cola). */
    const maxSteps = Math.ceil((w + 240) / STEP) + 30;
    const span = h + 140;

    state.lines = Array.from({ length: count }, (_, i) => {
      const seed = i * 2654435761;
      return {
        points: new Float32Array(maxSteps * 2),
        count: 0,
        nearStart: -1,
        nearEnd: -1,
        seedY: -70 + ((i + 0.5) / count) * span,
        jitter: (((seed >>> 8) % 1000) / 1000 - 0.5) * 9,
        /* Alfa por línea: da profundidad y evita el look de trama
           uniforme, sin romper el determinismo. */
        alpha: 0.72 + (((seed >>> 3) % 100) / 100) * 0.28,
        term: "budget" as LineTerm,
      };
    });
  };

  const integrate = (): void => {
    const { w, h, time } = state;
    const pointer = state.pointer;
    const lensSq = LENS_RADIUS * LENS_RADIUS;
    const accentSq = ACCENT_RADIUS * ACCENT_RADIUS;

    for (const line of state.lines) {
      let x = -70 + line.jitter * 0.4;
      let y = line.seedY;
      let nearStart = -1;
      let nearEnd = -1;
      let n = 0;
      const pts = line.points;

      while (n * 2 + 1 < pts.length && x < w + 70 && y > -90 && y < h + 90) {
        field(x, y, time, dir);
        let dx = dir.x;
        let dy = dir.y;

        /* La lente: cerca del mouse el flujo se orienta hacia afuera,
           así la corriente se abre y deja pasar el cursor. */
        if (pointer.influence > 0.001) {
          const mx = x - pointer.x;
          const my = y - pointer.y;
          const d2 = mx * mx + my * my;
          if (d2 < lensSq) {
            const d = Math.sqrt(d2) || 0.0001;
            const falloff =
              (1 - d / LENS_RADIUS) * (1 - d / LENS_RADIUS) * pointer.influence * LENS_PULL;
            dx = dx * (1 - falloff) + (mx / d) * falloff;
            dy = dy * (1 - falloff) + (my / d) * falloff;
            const len = Math.hypot(dx, dy) || 1;
            dx /= len;
            dy /= len;
          }
        }

        pts[n * 2] = x;
        pts[n * 2 + 1] = y;
        n += 1;

        /* Tramo a accentuar: corto, para que el vermellón sea un
           destello y no un manchón. */
        if (pointer.influence > 0.001) {
          const mx = x - pointer.x;
          const my = y - pointer.y;
          if (mx * mx + my * my < accentSq) {
            if (nearStart < 0) nearStart = n - 1;
            nearEnd = n - 1;
          }
        }

        x += dx * STEP;
        y += dy * STEP;
      }

      /* ¿Por qué terminó? Si agotó el presupuesto de pasos y el
         último punto quedó DENTRO del frame, la línea se corta a la
         vista. Eso es el bug. */
      const lastX = n > 0 ? pts[(n - 1) * 2] : x;
      const lastY = n > 0 ? pts[(n - 1) * 2 + 1] : y;
      const insideFrame = lastX > 0 && lastX < w && lastY > 0 && lastY < h;
      line.term = n * 2 + 1 >= pts.length && insideFrame ? "budget" : "bounds";

      line.count = n;
      line.nearStart = nearStart;
      line.nearEnd = nearEnd;
    }
  };

  /* ==================================================================
     DIBUJO
     ================================================================== */
  const draw = (): void => {
    const { w, h, lines, colors } = state;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = colors.line;
    for (const line of lines) {
      const n = line.count;
      if (n < 2) continue;
      const pts = line.points;
      const base = colors.alpha * line.alpha;

      /* Red de seguridad: si la línea agotó el presupuesto de pasos y
         quedó dentro del frame, el final se desvanece en vez de cortar
         en seco. Con la deriva actual no debería pasar, pero depende
         del aspect ratio del viewport y no quiero que un cambio de
         tamaño rompa el efecto. */
      const fadeFrom = line.term === "budget" ? Math.floor(n * 0.8) : n;

      ctx.globalAlpha = base;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i < fadeFrom; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      ctx.stroke();

      if (fadeFrom < n) {
        const tail = n - fadeFrom;
        for (let c = 0; c < FADE_CHUNKS; c++) {
          const a = fadeFrom + Math.floor((tail * c) / FADE_CHUNKS);
          const b = fadeFrom + Math.floor((tail * (c + 1)) / FADE_CHUNKS);
          if (b <= a) continue;
          ctx.globalAlpha = base * (1 - (c + 0.5) / FADE_CHUNKS);
          ctx.beginPath();
          ctx.moveTo(pts[a * 2], pts[a * 2 + 1]);
          for (let i = a + 1; i <= b; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
          ctx.stroke();
        }
      }
    }

    ctx.strokeStyle = colors.accent;
    for (const line of lines) {
      if (line.nearStart < 0 || line.nearEnd <= line.nearStart) continue;
      const pts = line.points;
      ctx.globalAlpha = colors.accentAlpha * line.alpha;
      ctx.beginPath();
      ctx.moveTo(pts[line.nearStart * 2], pts[line.nearStart * 2 + 1]);
      for (let i = line.nearStart + 1; i <= line.nearEnd; i++)
        ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  };

  /* ==================================================================
     BUCLE
     ================================================================== */
  const step = (): void => {
    const pointer = state.pointer;
    const now = performance.now();

    /* Throttling por presupuesto de tiempo: el rAF corre siempre, pero
       sólo se dibuja cada 33ms con el mouse activo y 50ms en idle. */
    const interval = pointer.inside ? INTERVAL_ACTIVE : INTERVAL_IDLE;
    if (now - state.last < interval) {
      state.frame = requestAnimationFrame(step);
      return;
    }

    const dt = state.last ? Math.min((now - state.last) / 1000, 0.12) : 0;
    state.last = now;

    const target = pointer.inside ? 1 : 0;
    const influenceEase = 1 - Math.pow(0.9, (dt || 0.016) * 60);
    pointer.influence += (target - pointer.influence) * influenceEase;
    const ease = 1 - Math.pow(0.82, (dt || 0.016) * 60);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;

    state.time += dt;
    integrate();
    draw();

    state.frame = requestAnimationFrame(step);
  };

  const start = (): void => {
    if (!state.frame && state.visible && !reducedMotion.matches) {
      state.last = 0;
      state.frame = requestAnimationFrame(step);
    }
  };

  const stop = (): void => {
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
  };

  /* ==================================================================
     COLORES
     El tema es un atributo data-theme en <html> y no hay evento de
     cambio, así que hay que observar el atributo.
     ================================================================== */
  const cacheColors = (): void => {
    const styles = getComputedStyle(document.documentElement);
    state.colors.line = readToken(styles, "--effect-line") || readToken(styles, "--color-border");
    state.colors.accent = readToken(styles, "--effect-accent") || readToken(styles, "--color-accent");
    const alpha = Number.parseFloat(styles.getPropertyValue("--effect-alpha"));
    const accentAlpha = Number.parseFloat(styles.getPropertyValue("--effect-accent-alpha"));
    state.colors.alpha = Number.isNaN(alpha) ? 1 : alpha;
    state.colors.accentAlpha = Number.isNaN(accentAlpha) ? 0.62 : accentAlpha;
  };

  /* ==================================================================
     EVENTOS
     ================================================================== */
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === "touch" || !finePointer.matches || reducedMotion.matches) return;
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (x < 0 || y < 0 || x > box.width || y > box.height) {
      state.pointer.inside = false;
      return;
    }
    state.pointer.tx = x;
    state.pointer.ty = y;
    state.pointer.inside = true;
    start();
  };

  const onPointerLeave = (): void => {
    state.pointer.inside = false;
  };

  const onResize = (): void => {
    const box = canvas.getBoundingClientRect();
    state.w = Math.max(1, box.width);
    state.h = Math.max(1, box.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    buildLines();
    cacheColors();
    integrate();
    draw();
  };

  const onVisibilityChange = (): void => {
    state.visible = !document.hidden;
    if (state.visible) start();
    else stop();
  };

  const onMotionPreferenceChange = (): void => {
    if (reducedMotion.matches) {
      stop();
      integrate();
      draw();
    } else {
      start();
    }
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas);

  const themeObserver = new MutationObserver(() => {
    cacheColors();
    draw();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerout", onPointerLeave, { passive: true });
  window.addEventListener("blur", onPointerLeave);
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener("change", onMotionPreferenceChange);

  /* ==================================================================
     MONTAJE Y DESMONTAJE
     ================================================================== */
  const teardown = (): void => {
    stop();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerout", onPointerLeave);
    window.removeEventListener("blur", onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener("change", onMotionPreferenceChange);
    ctx.clearRect(0, 0, state.w, state.h);
    if (scope.__corrienteTeardown__ === teardown) delete scope.__corrienteTeardown__;
  };
  scope.__corrienteTeardown__ = teardown;

  onResize();
  // Con movimiento reducido se dibuja un único cuadro estático: el efecto
  // existe, pero no se mueve.
  if (!reducedMotion.matches) start();
}

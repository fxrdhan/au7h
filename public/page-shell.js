(function () {
  const shellContent = document.getElementById("page-shell-content")
  const motionApi = window.Motion

  if (!shellContent || !motionApi || typeof motionApi.animate !== "function" || typeof motionApi.spring !== "function") {
    return
  }

  let navigationToken = 0

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  function getAuthMode(urlLike) {
    const url = new URL(urlLike, window.location.href)
    if (url.pathname !== "/") {
      return null
    }

    const mode = url.searchParams.get("mode") ?? "register"
    return mode === "register" || mode === "login" ? mode : null
  }

  function isInternalUrl(url) {
    return url.origin === window.location.origin
  }

  function shouldHandleLink(anchor, event) {
    if (!anchor || event.defaultPrevented) {
      return false
    }

    if (anchor.target || anchor.hasAttribute("download") || anchor.dataset.noShell !== undefined) {
      return false
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return false
    }

    const url = new URL(anchor.href, window.location.href)
    if (!isInternalUrl(url)) {
      return false
    }

    if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) {
      return false
    }

    return true
  }

  function getAuthPanel(root) {
    if (!root || typeof root.querySelector !== "function") {
      return null
    }

    const panel = root.querySelector("[data-auth-panel]")
    return panel instanceof HTMLElement ? panel : null
  }

  function getSharedSpringTransition() {
    return {
      type: "spring",
      stiffness: 220,
      damping: 30,
      mass: 1,
    }
  }

  function getPageSurface(root) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return null
    }

    const surfaces = root.querySelectorAll("[data-page-surface]")
    for (const surface of surfaces) {
      if (!(surface instanceof HTMLElement)) {
        continue
      }

      const styles = window.getComputedStyle(surface)
      const rect = surface.getBoundingClientRect()
      if (styles.display === "none" || styles.visibility === "hidden" || rect.width < 1 || rect.height < 1) {
        continue
      }

      return surface
    }

    return null
  }

  function getSurfaceStyles(surface) {
    const styles = window.getComputedStyle(surface)

    return {
      backgroundColor: styles.backgroundColor,
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow,
    }
  }

  function sanitizeSurfaceClone(clone) {
    clone.removeAttribute("id")
    clone.setAttribute("aria-hidden", "true")
    // Morph the container silhouette only so old text doesn't ghost while scaling.
    clone.replaceChildren()

    for (const element of clone.querySelectorAll("[id]")) {
      element.removeAttribute("id")
    }
  }

  function createMorphSnapshot(root) {
    if (prefersReducedMotion()) {
      return null
    }

    const surface = getPageSurface(root)
    if (!surface) {
      return null
    }

    const rect = surface.getBoundingClientRect()

    return {
      clone: surface.cloneNode(true),
      kind: surface.dataset.pageSurface ?? "",
      rect: {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      },
      styles: getSurfaceStyles(surface),
    }
  }

  function shouldAnimateMorph(previousSnapshot, incomingSurface) {
    if (!previousSnapshot || !incomingSurface) {
      return false
    }

    const nextKind = incomingSurface.dataset.pageSurface ?? ""

    return (
      (previousSnapshot.kind === "auth-panel" && nextKind === "result-card") ||
      (previousSnapshot.kind === "result-card" && nextKind === "auth-panel")
    )
  }

  function applyCloneLayout(clone, rect, styles) {
    clone.style.position = "fixed"
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.margin = "0"
    clone.style.maxWidth = "none"
    clone.style.pointerEvents = "none"
    clone.style.transformOrigin = "top left"
    clone.style.overflow = "hidden"
    clone.style.zIndex = "30"
    clone.style.backgroundColor = styles.backgroundColor
    clone.style.borderRadius = styles.borderRadius
    clone.style.boxShadow = styles.boxShadow
  }

  async function animateSurfaceMorph(previousSnapshot) {
    const incomingSurface = getPageSurface(shellContent)
    if (!shouldAnimateMorph(previousSnapshot, incomingSurface)) {
      return false
    }

    const targetRect = incomingSurface.getBoundingClientRect()
    if (targetRect.width < 1 || targetRect.height < 1) {
      return false
    }

    const targetStyles = getSurfaceStyles(incomingSurface)
    const outgoingClone = previousSnapshot.clone
    sanitizeSurfaceClone(outgoingClone)
    applyCloneLayout(outgoingClone, previousSnapshot.rect, previousSnapshot.styles)

    const translateX = targetRect.left - previousSnapshot.rect.left
    const translateY = targetRect.top - previousSnapshot.rect.top
    const outgoingScaleX = targetRect.width / previousSnapshot.rect.width
    const outgoingScaleY = targetRect.height / previousSnapshot.rect.height
    const incomingScaleX = previousSnapshot.rect.width / targetRect.width
    const incomingScaleY = previousSnapshot.rect.height / targetRect.height
    const incomingOffsetX = previousSnapshot.rect.left - targetRect.left
    const incomingOffsetY = previousSnapshot.rect.top - targetRect.top
    const transition = getSharedSpringTransition()

    document.body.appendChild(outgoingClone)

    incomingSurface.style.transformOrigin = "top left"
    incomingSurface.style.willChange = "transform, opacity, border-radius"
    incomingSurface.style.pointerEvents = "none"
    incomingSurface.style.opacity = "0"
    incomingSurface.style.borderRadius = previousSnapshot.styles.borderRadius

    // Force layout so Motion starts from the collapsed surface we are morphing from.
    incomingSurface.getBoundingClientRect()

    const outgoingAnimation = motionApi.animate(
      outgoingClone,
      {
        borderRadius: [previousSnapshot.styles.borderRadius, targetStyles.borderRadius],
        opacity: [1, 0],
        transform: [
          "translate3d(0px, 0px, 0) scale(1, 1)",
          `translate3d(${translateX}px, ${translateY}px, 0) scale(${outgoingScaleX}, ${outgoingScaleY})`,
        ],
      },
      transition
    )

    const incomingAnimation = motionApi.animate(
      incomingSurface,
      {
        borderRadius: [previousSnapshot.styles.borderRadius, targetStyles.borderRadius],
        opacity: [0, 1],
        transform: [
          `translate3d(${incomingOffsetX}px, ${incomingOffsetY}px, 0) scale(${incomingScaleX}, ${incomingScaleY})`,
          "translate3d(0px, 0px, 0) scale(1, 1)",
        ],
      },
      transition
    )

    try {
      await Promise.allSettled([outgoingAnimation.finished, incomingAnimation.finished])
    } finally {
      outgoingClone.remove()
      incomingSurface.style.transformOrigin = ""
      incomingSurface.style.willChange = ""
      incomingSurface.style.pointerEvents = ""
      incomingSurface.style.opacity = ""
      incomingSurface.style.borderRadius = ""
    }

    return true
  }

  async function animateAuthSwitch(previousPanelRect) {
    const incomingPanel = getAuthPanel(shellContent)
    if (!incomingPanel || !previousPanelRect || prefersReducedMotion()) {
      return
    }

    const incomingRect = incomingPanel.getBoundingClientRect()
    const deltaX = previousPanelRect.left - incomingRect.left
    const deltaY = previousPanelRect.top - incomingRect.top

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return
    }

    const transition = getSharedSpringTransition()

    incomingPanel.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
    incomingPanel.style.willChange = "transform"

    // Force layout so Motion starts from the offset state we just applied.
    incomingPanel.getBoundingClientRect()

    const incoming = motionApi.animate(
      incomingPanel,
      {
        transform: [`translate3d(${deltaX}px, ${deltaY}px, 0)`, "translate3d(0, 0, 0)"],
      },
      transition
    )

    try {
      await incoming.finished
    } finally {
      incomingPanel.style.transform = ""
      incomingPanel.style.willChange = ""
    }
  }

  async function swapPage(targetUrl, options = {}) {
    const token = ++navigationToken
    const currentAuthMode = getAuthMode(window.location.href)
    const previousAuthPanel = currentAuthMode ? getAuthPanel(shellContent) : null
    const previousPanelRect = previousAuthPanel?.getBoundingClientRect() ?? null
    const previousMorphSnapshot = createMorphSnapshot(shellContent)

    const requestInit = {
      credentials: "same-origin",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "X-Requested-With": "page-shell",
      },
      method: options.method ?? "GET",
      redirect: "follow",
    }

    if (options.body) {
      requestInit.body = options.body
    }

    try {
      const response = await fetch(targetUrl, requestInit)
      const html = await response.text()

      if (token !== navigationToken) {
        return
      }

      const nextDocument = new DOMParser().parseFromString(html, "text/html")
      const nextContent = nextDocument.getElementById("page-shell-content")

      if (!nextContent) {
        window.location.assign(response.url || targetUrl)
        return
      }

      const finalUrl = response.url || String(targetUrl)
      const nextAuthMode = getAuthMode(finalUrl)
      const authDirection =
        currentAuthMode && nextAuthMode && currentAuthMode !== nextAuthMode
          ? nextAuthMode === "login"
            ? "right"
            : "left"
          : null

      shellContent.className = nextContent.className
      shellContent.innerHTML = nextContent.innerHTML
      document.title = nextDocument.title || document.title
      document.dispatchEvent(new CustomEvent("au7h:contentupdated"))

      if (options.historyMode === "replace") {
        window.history.replaceState({}, "", finalUrl)
      } else if (window.location.href !== finalUrl) {
        window.history.pushState({}, "", finalUrl)
      }

      if (options.scroll !== false) {
        window.scrollTo(0, 0)
      }

      if (authDirection) {
        shellContent.style.pointerEvents = "none"
        try {
          await animateAuthSwitch(previousPanelRect)
        } finally {
          shellContent.style.pointerEvents = ""
        }
      } else if (previousMorphSnapshot) {
        shellContent.style.pointerEvents = "none"
        try {
          await animateSurfaceMorph(previousMorphSnapshot)
        } finally {
          shellContent.style.pointerEvents = ""
        }
      }
    } catch (error) {
      window.location.assign(String(targetUrl))
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const anchor = event.target.closest("a[href]")

    if (!shouldHandleLink(anchor, event)) {
      return
    }

    event.preventDefault()
    swapPage(anchor.href)
  })

  document.addEventListener("submit", (event) => {
    const form = event.target

    if (!(form instanceof HTMLFormElement) || form.dataset.noShell !== undefined) {
      return
    }

    const action = new URL(form.action || window.location.href, window.location.href)
    if (!isInternalUrl(action)) {
      return
    }

    const method = (form.method || "GET").toUpperCase()
    event.preventDefault()

    if (method === "GET") {
      const params = new URLSearchParams(new FormData(form))
      action.search = params.toString()
      swapPage(action.toString())
      return
    }

    swapPage(action.toString(), {
      body: new FormData(form),
      method,
    })
  })

  window.addEventListener("popstate", () => {
    swapPage(window.location.href, {
      historyMode: "replace",
      scroll: false,
    })
  })
})()

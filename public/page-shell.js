(function () {
  const shellContent = document.getElementById("page-shell-content")
  const motionApi = window.Motion

  if (!shellContent || !motionApi || typeof motionApi.animate !== "function" || typeof motionApi.spring !== "function") {
    return
  }

  let navigationToken = 0
  const sharedSurfaceEasing = "cubic-bezier(0.22, 1, 0.36, 1)"
  const sharedSurfaceDuration = 420

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

  function getSharedSurface(root) {
    if (!root || typeof root.querySelector !== "function") {
      return null
    }

    const surface = root.querySelector("[data-shell-surface]")
    return surface instanceof HTMLElement ? surface : null
  }

  function captureSurfaceSnapshot(surface) {
    if (!(surface instanceof HTMLElement)) {
      return null
    }

    const rect = surface.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) {
      return null
    }

    const computed = window.getComputedStyle(surface)
    const backgroundColor =
      computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? computed.backgroundColor
        : "rgb(255, 255, 255)"

    return {
      backgroundColor,
      backdropFilter: computed.backdropFilter,
      borderRadius: computed.borderRadius,
      boxShadow: computed.boxShadow === "none" ? "0 0 0 rgba(0, 0, 0, 0)" : computed.boxShadow,
      rect,
      webkitBackdropFilter: computed.webkitBackdropFilter,
    }
  }

  function createSurfaceGhost(snapshot) {
    const ghost = document.createElement("div")
    ghost.setAttribute("aria-hidden", "true")
    ghost.style.position = "fixed"
    ghost.style.left = `${snapshot.rect.left}px`
    ghost.style.top = `${snapshot.rect.top}px`
    ghost.style.width = `${snapshot.rect.width}px`
    ghost.style.height = `${snapshot.rect.height}px`
    ghost.style.borderRadius = snapshot.borderRadius
    ghost.style.backgroundColor = snapshot.backgroundColor
    ghost.style.boxShadow = snapshot.boxShadow
    ghost.style.backdropFilter = snapshot.backdropFilter
    ghost.style.webkitBackdropFilter = snapshot.webkitBackdropFilter
    ghost.style.pointerEvents = "none"
    ghost.style.margin = "0"
    ghost.style.zIndex = "40"
    return ghost
  }

  async function animateSharedSurface(previousSurfaceSnapshot) {
    const incomingSurface = getSharedSurface(shellContent)
    if (!previousSurfaceSnapshot || !incomingSurface || prefersReducedMotion()) {
      return
    }

    const incomingSnapshot = captureSurfaceSnapshot(incomingSurface)
    if (!incomingSnapshot) {
      return
    }

    const deltaX = Math.abs(previousSurfaceSnapshot.rect.left - incomingSnapshot.rect.left)
    const deltaY = Math.abs(previousSurfaceSnapshot.rect.top - incomingSnapshot.rect.top)
    const deltaWidth = Math.abs(previousSurfaceSnapshot.rect.width - incomingSnapshot.rect.width)
    const deltaHeight = Math.abs(previousSurfaceSnapshot.rect.height - incomingSnapshot.rect.height)

    if (deltaX < 1 && deltaY < 1 && deltaWidth < 1 && deltaHeight < 1) {
      return
    }

    const ghost = createSurfaceGhost(previousSurfaceSnapshot)
    document.body.appendChild(ghost)

    incomingSurface.style.opacity = "0.28"
    incomingSurface.style.willChange = "opacity"

    const ghostAnimation = ghost.animate(
      [
        {
          backgroundColor: previousSurfaceSnapshot.backgroundColor,
          borderRadius: previousSurfaceSnapshot.borderRadius,
          boxShadow: previousSurfaceSnapshot.boxShadow,
          height: `${previousSurfaceSnapshot.rect.height}px`,
          left: `${previousSurfaceSnapshot.rect.left}px`,
          top: `${previousSurfaceSnapshot.rect.top}px`,
          width: `${previousSurfaceSnapshot.rect.width}px`,
        },
        {
          backgroundColor: incomingSnapshot.backgroundColor,
          borderRadius: incomingSnapshot.borderRadius,
          boxShadow: incomingSnapshot.boxShadow,
          height: `${incomingSnapshot.rect.height}px`,
          left: `${incomingSnapshot.rect.left}px`,
          top: `${incomingSnapshot.rect.top}px`,
          width: `${incomingSnapshot.rect.width}px`,
        },
      ],
      {
        duration: sharedSurfaceDuration,
        easing: sharedSurfaceEasing,
        fill: "forwards",
      }
    )

    const revealAnimation = motionApi.animate(
      incomingSurface,
      {
        opacity: [0, 1],
      },
      {
        delay: 0.04,
        duration: 0.18,
        easing: "ease-out",
      }
    )

    try {
      await Promise.allSettled([ghostAnimation.finished, revealAnimation.finished])
    } finally {
      ghost.remove()
      incomingSurface.style.opacity = ""
      incomingSurface.style.willChange = ""
    }
  }

  async function animateAuthSwitch(previousPanelRect) {
    const incomingPanel = getAuthPanel(shellContent)
    if (!incomingPanel || !previousPanelRect) {
      return
    }

    const incomingRect = incomingPanel.getBoundingClientRect()
    const deltaX = previousPanelRect.left - incomingRect.left
    const deltaY = previousPanelRect.top - incomingRect.top

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return
    }

    const transition = {
      easing: motionApi.spring({
        bounce: 0.18,
        visualDuration: 0.5,
      }),
    }

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
    const previousSurfaceSnapshot = captureSurfaceSnapshot(getSharedSurface(shellContent))

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
      } else if (previousSurfaceSnapshot) {
        shellContent.style.pointerEvents = "none"
        try {
          await animateSharedSurface(previousSurfaceSnapshot)
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

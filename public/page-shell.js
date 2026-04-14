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

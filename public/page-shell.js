(function () {
  const shellContent = document.getElementById("page-shell-content")

  if (!shellContent) {
    return
  }

  let navigationToken = 0

  function getAuthMode(urlLike) {
    const url = new URL(urlLike, window.location.href)
    if (url.pathname !== "/") {
      return null
    }

    const mode = url.searchParams.get("mode") ?? "register"
    return mode === "register" || mode === "login" ? mode : null
  }

  function animateShellTransition(direction, phase) {
    const outgoingOffset = direction === "right" ? "100%" : "-100%"
    const incomingOffset = direction === "right" ? "-100%" : "100%"

    if (phase === "out") {
      return shellContent.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: `translate3d(${outgoingOffset}, 0, 0)` },
        ],
        {
          duration: 260,
          easing: "cubic-bezier(0.32, 0, 0.16, 1)",
          fill: "forwards",
        }
      ).finished
    }

    return shellContent.animate(
      [
        { transform: `translate3d(${incomingOffset}, 0, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    ).finished
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

  async function swapPage(targetUrl, options = {}) {
    const token = ++navigationToken
    const currentAuthMode = getAuthMode(window.location.href)
    const nextAuthMode = getAuthMode(targetUrl)
    const authDirection =
      currentAuthMode && nextAuthMode && currentAuthMode !== nextAuthMode
        ? nextAuthMode === "login"
          ? "right"
          : "left"
        : null
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

      if (authDirection) {
        shellContent.style.pointerEvents = "none"
        await animateShellTransition(authDirection, "out")
      }

      shellContent.className = nextContent.className
      shellContent.innerHTML = nextContent.innerHTML
      document.title = nextDocument.title || document.title

      const finalUrl = response.url || String(targetUrl)
      if (options.historyMode === "replace") {
        window.history.replaceState({}, "", finalUrl)
      } else if (window.location.href !== finalUrl) {
        window.history.pushState({}, "", finalUrl)
      }

      if (options.scroll !== false) {
        window.scrollTo(0, 0)
      }

      if (authDirection) {
        await animateShellTransition(authDirection, "in")
        shellContent.style.pointerEvents = ""
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

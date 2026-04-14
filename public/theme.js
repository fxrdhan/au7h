(function () {
  const storageKey = "au7h-theme"
  const root = document.documentElement
  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)")
  let transitionBlockStyle = null

  function isTheme(value) {
    return value === "light" || value === "dark"
  }

  function readStoredTheme() {
    try {
      const value = window.localStorage.getItem(storageKey)
      return isTheme(value) ? value : null
    } catch (error) {
      return null
    }
  }

  function getSystemTheme() {
    return systemThemeQuery.matches ? "dark" : "light"
  }

  function getResolvedTheme() {
    return readStoredTheme() ?? getSystemTheme()
  }

  function disableTransitionsTemporarily() {
    if (transitionBlockStyle) {
      transitionBlockStyle.remove()
    }

    transitionBlockStyle = document.createElement("style")
    transitionBlockStyle.setAttribute("data-theme-transition-block", "")
    transitionBlockStyle.textContent = `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    `

    document.head.appendChild(transitionBlockStyle)
    // Force the browser to apply the transition block before we flip the theme.
    void document.documentElement.offsetHeight
  }

  function restoreTransitionsAfterPaint() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        transitionBlockStyle?.remove()
        transitionBlockStyle = null
      })
    })
  }

  function syncToggleButtons(theme) {
    const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode"

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return
      }

      button.setAttribute("aria-label", nextLabel)
      button.setAttribute("aria-pressed", String(theme === "dark"))
      button.title = nextLabel
    })
  }

  function applyTheme(theme, options = {}) {
    const { persist = false } = options

    if (!isTheme(theme)) {
      return
    }

    if (persist) {
      try {
        window.localStorage.setItem(storageKey, theme)
      } catch (error) {
        // Ignore storage failures and still apply the theme.
      }
    }

    disableTransitionsTemporarily()

    root.classList.toggle("dark", theme === "dark")
    root.dataset.theme = theme
    root.style.colorScheme = theme
    syncToggleButtons(theme)
    window.dispatchEvent(new CustomEvent("au7h:themechange", { detail: { theme } }))
    restoreTransitionsAfterPaint()
  }

  applyTheme(getResolvedTheme())

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const button = event.target.closest("[data-theme-toggle]")
    if (!(button instanceof HTMLButtonElement)) {
      return
    }

    event.preventDefault()
    applyTheme(root.classList.contains("dark") ? "light" : "dark", {
      persist: true,
    })
  })

  document.addEventListener("DOMContentLoaded", () => {
    syncToggleButtons(root.classList.contains("dark") ? "dark" : "light")
  })

  document.addEventListener("au7h:contentupdated", () => {
    syncToggleButtons(root.classList.contains("dark") ? "dark" : "light")
  })

  const handleSystemThemeChange = () => {
    if (readStoredTheme() !== null) {
      return
    }

    applyTheme(getSystemTheme())
  }

  if (typeof systemThemeQuery.addEventListener === "function") {
    systemThemeQuery.addEventListener("change", handleSystemThemeChange)
  } else if (typeof systemThemeQuery.addListener === "function") {
    systemThemeQuery.addListener(handleSystemThemeChange)
  }
})()

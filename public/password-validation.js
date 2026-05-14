(function () {
  function getRuleState(password) {
    return {
      case: /[a-z]/.test(password) && /[A-Z]/.test(password),
      length: password.length >= 10,
      number: /[0-9]/.test(password),
    }
  }

  function getPasswordValidationMessage(password) {
    if (password.length === 0) {
      return ""
    }

    const ruleState = getRuleState(password)
    if (!ruleState.length) {
      return "Password must be at least 10 characters."
    }

    if (!ruleState.case) {
      return "Password must include lowercase and uppercase letters."
    }

    if (!ruleState.number) {
      return "Password must include a number."
    }

    return ""
  }

  function getUsernameValidationMessage(username) {
    const trimmed = username.trim()
    if (trimmed.length === 0) {
      return ""
    }

    if (trimmed.length < 3 || trimmed.length > 32) {
      return "Username must be 3-32 characters."
    }

    if (!/^[A-Za-z0-9_. -]+$/.test(trimmed)) {
      return "Username may only contain letters, numbers, spaces, dots, hyphens, or underscores."
    }

    return ""
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  function shakeInput(input) {
    if (prefersReducedMotion()) {
      return
    }

    if (typeof input.animate !== "function") {
      return
    }

    for (const animation of input.getAnimations()) {
      animation.cancel()
    }

    input.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: "translate3d(-12px, 0, 0)" },
        { transform: "translate3d(10px, 0, 0)" },
        { transform: "translate3d(-8px, 0, 0)" },
        { transform: "translate3d(5px, 0, 0)" },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(.36,.07,.19,.97)",
      }
    )
  }

  function pulseMissingRule(item) {
    if (prefersReducedMotion()) {
      return
    }

    const checkbox = item.querySelector("[data-password-check]")
    const roseText = document.documentElement.classList.contains("dark")
      ? "var(--color-rose-300)"
      : "var(--color-rose-700)"

    if (typeof item.animate === "function") {
      const currentColor = getComputedStyle(item).color
      item.animate(
        [
          { color: currentColor },
          { color: roseText, offset: 0.25 },
          { color: roseText, offset: 0.72 },
          { color: currentColor },
        ],
        {
          duration: 1050,
          easing: "ease-out",
        }
      )
    }

    if (checkbox instanceof HTMLElement && typeof checkbox.animate === "function") {
      const currentBorder = getComputedStyle(checkbox).borderColor
      checkbox.animate(
        [
          {
            borderColor: currentBorder,
            boxShadow: "0 0 0 0 rgb(253 164 175 / 0)",
            transform: "scale(1)",
          },
          {
            borderColor: "var(--color-rose-500)",
            boxShadow: "0 0 0 3px rgb(253 164 175 / 0.55)",
            transform: "scale(1.06)",
            offset: 0.25,
          },
          {
            borderColor: "var(--color-rose-500)",
            boxShadow: "0 0 0 3px rgb(253 164 175 / 0.55)",
            transform: "scale(1.06)",
            offset: 0.72,
          },
          {
            borderColor: currentBorder,
            boxShadow: "0 0 0 0 rgb(253 164 175 / 0)",
            transform: "scale(1)",
          },
        ],
        {
          duration: 1050,
          easing: "ease-out",
        }
      )
    }
  }

  function pulseMissingRequirements(input) {
    if (getPasswordValidationMessage(input.value) === "") {
      return
    }

    const form = input.closest("form")
    const requirements = form?.querySelector("[data-password-requirements]")
    if (!(requirements instanceof HTMLElement)) {
      return
    }

    const ruleState = getRuleState(input.value)
    for (const item of requirements.querySelectorAll("[data-password-rule]")) {
      if (!(item instanceof HTMLElement)) {
        continue
      }

      const rule = item.dataset.passwordRule
      if (!rule || ruleState[rule]) {
        continue
      }

      pulseMissingRule(item)
    }
  }

  function setInputErrorState(input, isInvalid) {
    input.setAttribute("aria-invalid", isInvalid ? "true" : "false")
    input.style.borderColor = isInvalid ? "var(--color-rose-500)" : ""
    input.style.boxShadow = isInvalid
      ? "0 0 0 2px rgb(253 164 175 / 0.55), 0 1px 2px rgba(0,0,0,0.02)"
      : ""
  }

  function setUsernameStatus(status, isVisible, message) {
    status.classList.toggle("max-h-8", isVisible)
    status.classList.toggle("max-h-0", !isVisible)
    status.classList.toggle("translate-y-0", isVisible)
    status.classList.toggle("-translate-y-1", !isVisible)
    status.classList.toggle("opacity-100", isVisible)
    status.classList.toggle("opacity-0", !isVisible)

    const messageTarget = status.querySelector("[data-username-message]")
    if (messageTarget instanceof HTMLElement) {
      messageTarget.textContent = message
    }
  }

  function updateUsernamePolicyState(input, status, options = {}) {
    const message = getUsernameValidationMessage(input.value)
    const isValid = message === ""
    const allowVisualError = options.showError !== false
    const showError =
      allowVisualError &&
      !isValid &&
      (options.forceError === true ||
        (input.dataset.usernameTouched === "true" && input.value.trim().length > 0))

    input.setCustomValidity(message)
    setInputErrorState(input, showError)

    if (status instanceof HTMLElement) {
      setUsernameStatus(status, showError, message)
    }

    if (showError && options.shake === true) {
      shakeInput(input)
    }

    return isValid
  }

  function updatePasswordPolicyState(input, options = {}) {
    const message = getPasswordValidationMessage(input.value)
    const isValid = message === ""
    const allowVisualError = options.showError !== false
    const showError =
      allowVisualError &&
      !isValid &&
      (options.forceError === true ||
        (input.dataset.passwordTouched === "true" && input.value.length > 0))

    input.setCustomValidity(message)
    setInputErrorState(input, showError)

    if (showError && options.shake === true) {
      shakeInput(input)
    }

    return isValid
  }

  function setRuleState(item, isValid) {
    const checkbox = item.querySelector("[data-password-check]")
    const checkPath = item.querySelector("[data-password-check-path]")
    const label = item.querySelector("[data-password-label]")
    const strike = item.querySelector("[data-password-strike]")

    if (checkbox instanceof HTMLElement) {
      checkbox.classList.toggle("border-emerald-700", isValid)
      checkbox.classList.toggle("bg-emerald-700", isValid)
      checkbox.classList.toggle("text-white", isValid)
      checkbox.classList.toggle("scale-105", isValid)
      checkbox.classList.toggle("dark:border-emerald-200", isValid)
      checkbox.classList.toggle("dark:bg-emerald-200", isValid)
      checkbox.classList.toggle("dark:text-zinc-950", isValid)
      checkbox.classList.toggle("border-zinc-400", !isValid)
      checkbox.classList.toggle("bg-white", !isValid)
      checkbox.classList.toggle("text-transparent", !isValid)
      checkbox.classList.toggle("scale-100", !isValid)
      checkbox.classList.toggle("dark:border-zinc-500", !isValid)
      checkbox.classList.toggle("dark:bg-zinc-900", !isValid)
      checkbox.style.borderColor = ""
      checkbox.style.boxShadow = ""
    }

    if (checkPath instanceof SVGPathElement) {
      checkPath.classList.toggle("[stroke-dashoffset:0]", isValid)
      checkPath.classList.toggle("[stroke-dashoffset:18]", !isValid)
    }

    item.classList.toggle("text-emerald-700", isValid)
    item.classList.toggle("dark:text-emerald-200", isValid)
    item.classList.remove("text-rose-700", "dark:text-rose-300")
    item.classList.toggle("text-muted-foreground", !isValid)
    item.classList.toggle("dark:text-zinc-300", !isValid)

    if (label instanceof HTMLElement) {
      label.classList.toggle("opacity-80", isValid)
      label.classList.toggle("opacity-100", !isValid)
    }

    if (strike instanceof HTMLElement) {
      strike.classList.toggle("scale-x-100", isValid)
      strike.classList.toggle("scale-x-0", !isValid)
    }
  }

  function updatePasswordRequirements(input) {
    const form = input.closest("form")
    const requirements = form?.querySelector("[data-password-requirements]")
    const hint = form?.querySelector("[data-password-requirements-hint]")
    if (!(requirements instanceof HTMLElement)) {
      return
    }

    const hasPassword = input.value.length > 0
    requirements.style.overflow = hasPassword ? "visible" : "hidden"
    requirements.style.marginTop = hasPassword ? "0.5rem" : ""
    requirements.classList.toggle("mt-0", !hasPassword)
    requirements.classList.toggle("max-h-32", hasPassword)
    requirements.classList.toggle("max-h-0", !hasPassword)
    requirements.classList.toggle("translate-y-0", hasPassword)
    requirements.classList.toggle("translate-y-1", !hasPassword)
    requirements.classList.toggle("opacity-100", hasPassword)
    requirements.classList.toggle("opacity-0", !hasPassword)

    if (hint instanceof HTMLElement) {
      hint.classList.toggle("max-h-0", hasPassword)
      hint.classList.toggle("max-h-8", !hasPassword)
      hint.classList.toggle("-translate-y-1", hasPassword)
      hint.classList.toggle("translate-y-0", !hasPassword)
      hint.classList.toggle("opacity-0", hasPassword)
      hint.classList.toggle("opacity-100", !hasPassword)
    }

    const ruleState = getRuleState(input.value)

    for (const item of requirements.querySelectorAll("[data-password-rule]")) {
      if (!(item instanceof HTMLElement)) {
        continue
      }

      const rule = item.dataset.passwordRule
      setRuleState(item, Boolean(rule && ruleState[rule]))
    }
  }

  function setConfirmPasswordStatus(status, isVisible, isMatch) {
    const matchIcon = status.querySelector('[data-confirm-password-icon="match"]')
    const mismatchIcon = status.querySelector('[data-confirm-password-icon="mismatch"]')
    const message = status.querySelector("[data-confirm-password-message]")

    status.classList.toggle("max-h-8", isVisible)
    status.classList.toggle("max-h-0", !isVisible)
    status.classList.toggle("translate-y-0", isVisible)
    status.classList.toggle("-translate-y-1", !isVisible)
    status.classList.toggle("opacity-100", isVisible)
    status.classList.toggle("opacity-0", !isVisible)
    status.classList.toggle("text-emerald-700", isVisible && isMatch)
    status.classList.toggle("dark:text-emerald-200", isVisible && isMatch)
    status.classList.toggle("text-rose-700", isVisible && !isMatch)
    status.classList.toggle("dark:text-rose-300", isVisible && !isMatch)

    if (matchIcon instanceof SVGElement) {
      matchIcon.classList.toggle("hidden", !isMatch)
    }

    if (mismatchIcon instanceof SVGElement) {
      mismatchIcon.classList.toggle("hidden", isMatch)
    }

    if (message instanceof HTMLElement) {
      message.textContent = isMatch ? "matches password" : "does not match password"
    }
  }

  function updateConfirmPasswordStatus(form) {
    const password = form.querySelector("[data-password-input]")
    const confirmPassword = form.querySelector("[data-confirm-password-input]")
    const status = form.querySelector("[data-confirm-password-status]")

    if (
      !(password instanceof HTMLInputElement) ||
      !(confirmPassword instanceof HTMLInputElement) ||
      !(status instanceof HTMLElement)
    ) {
      return true
    }

    const isVisible = confirmPassword.value.length > 0
    const isMatch = password.value === confirmPassword.value
    setConfirmPasswordStatus(status, isVisible, isMatch)
    confirmPassword.setCustomValidity(isVisible && !isMatch ? "Password confirmation does not match." : "")

    return !isVisible || isMatch
  }

  function bindPasswordValidation(root = document) {
    const forms = root.querySelectorAll("form")

    for (const form of forms) {
      if (!(form instanceof HTMLFormElement) || form.dataset.passwordValidationBound === "true") {
        continue
      }

      const password = form.querySelector("[data-password-input]")
      const confirmPassword = form.querySelector("[data-confirm-password-input]")
      const username = form.querySelector("[data-username-input]")
      const usernameStatus = form.querySelector("[data-username-status]")

      if (!(password instanceof HTMLInputElement)) {
        continue
      }

      form.dataset.passwordValidationBound = "true"

      if (username instanceof HTMLInputElement) {
        username.addEventListener("input", () => {
          updateUsernamePolicyState(username, usernameStatus, { showError: false })
        })

        username.addEventListener("blur", () => {
          username.dataset.usernameTouched = "true"
          updateUsernamePolicyState(username, usernameStatus, { shake: true })
        })

        username.addEventListener("invalid", () => {
          username.dataset.usernameTouched = "true"
          updateUsernamePolicyState(username, usernameStatus, {
            forceError: true,
            shake: true,
          })
        })

        updateUsernamePolicyState(username, usernameStatus)
      }

      password.addEventListener("input", () => {
        updatePasswordRequirements(password)
        updatePasswordPolicyState(password, { showError: false })
        updateConfirmPasswordStatus(form)
      })

      password.addEventListener("blur", () => {
        password.dataset.passwordTouched = "true"
        updatePasswordRequirements(password)
        updatePasswordPolicyState(password, { shake: true })
        pulseMissingRequirements(password)
      })

      password.addEventListener("invalid", () => {
        password.dataset.passwordTouched = "true"
        updatePasswordRequirements(password)
        setInputErrorState(password, true)
        shakeInput(password)
        pulseMissingRequirements(password)
      })

      if (confirmPassword instanceof HTMLInputElement) {
        confirmPassword.addEventListener("input", () => updateConfirmPasswordStatus(form))
      }

      form.addEventListener(
        "submit",
        (event) => {
          if (
            username instanceof HTMLInputElement &&
            !updateUsernamePolicyState(username, usernameStatus, {
              forceError: true,
              shake: true,
            })
          ) {
            event.preventDefault()
            event.stopImmediatePropagation()
            username.dataset.usernameTouched = "true"
            username.focus()
            return
          }

          password.dataset.passwordTouched = "true"
          updatePasswordRequirements(password)
          if (!updatePasswordPolicyState(password, { forceError: true, shake: true })) {
            event.preventDefault()
            event.stopImmediatePropagation()
            password.focus()
            pulseMissingRequirements(password)
            return
          }

          if (updateConfirmPasswordStatus(form)) {
            return
          }

          event.preventDefault()
          event.stopImmediatePropagation()
          confirmPassword?.focus()
        },
        true
      )

      updatePasswordRequirements(password)
      updatePasswordPolicyState(password)
      updateConfirmPasswordStatus(form)
    }
  }

  document.addEventListener("DOMContentLoaded", () => bindPasswordValidation())
  document.addEventListener("au7h:contentupdated", () => bindPasswordValidation())
})()

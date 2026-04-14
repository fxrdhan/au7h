(function () {
  const MatrixAnimationCtor = window.MatrixAnimation?.MatrixAnimation

  if (!MatrixAnimationCtor) {
    return
  }

  const originalPlay = MatrixAnimationCtor.prototype.play
  if (!MatrixAnimationCtor.prototype.__au7hFadePatched) {
    MatrixAnimationCtor.prototype.play = function playWithCustomFade() {
      if (this.fadeInterval) clearInterval(this.fadeInterval)
      if (this.frameId) cancelAnimationFrame(this.frameId)

      this.stopAnimation = false
      this.fadeInterval = setInterval(() => {
        this.ctx.fillStyle = this.options.fadeColor ?? `rgba(0,0,0,${this.options.fadeStrength ?? 0.05})`
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      }, 20)

      this.render()
    }

    MatrixAnimationCtor.prototype.__au7hFadePatched = true
    MatrixAnimationCtor.prototype.__au7hOriginalPlay = originalPlay
  }

  function refineTrailRenderer(instance) {
    const sampleDrop = instance.raindrops?.[0]
    if (!sampleDrop) {
      return
    }

    const rainDropProto = Object.getPrototypeOf(sampleDrop)
    if (!rainDropProto || rainDropProto.__au7hTrailRefined) {
      return
    }

    // Repaint a short gradient tail while locally washing the previous glyph cells.
    rainDropProto.clear = function clearRefinedTrail(ctx) {
      if (!Array.isArray(this.trailChars) || this.trailChars.length === 0) {
        return
      }

      const fontSize = Number(this.config.fontSize ?? 14)
      const cellWidth = Math.max(fontSize * 2.2, 26)
      const cellHeight = Math.max(fontSize * 1.9, 26)
      const trailColors = Array.isArray(this.config.trailColors) ? this.config.trailColors : null
      const backgroundColor = this.matrixAnimation.options.backgroundColor ?? "#ffffff"
      const eraseColor = this.matrixAnimation.options.eraseColor ?? backgroundColor

      ctx.save()
      ctx.font = this.font
      ctx.shadowColor = "rgba(0,0,0,0)"
      ctx.shadowBlur = 0

      for (let index = this.trailChars.length - 1; index >= 0; index -= 1) {
        const trailChar = this.trailChars[index]
        if (!trailChar) {
          continue
        }

        ctx.fillStyle = eraseColor
        ctx.fillRect(
          trailChar.x - cellWidth / 2,
          trailChar.y - cellHeight * 0.94,
          cellWidth,
          cellHeight
        )

        ctx.fillStyle = trailColors?.[index] ?? this.config.trailColor ?? "rgba(24,24,27,0.4)"
        ctx.fillText(trailChar.char, trailChar.x, trailChar.y)
      }

      ctx.restore()
    }

    rainDropProto.__au7hTrailRefined = true
  }

  const matrixPreset = {
    rainWidth: 100,
    rainHeight: 18,
    minFrameTime: 48,
    syncFrame: false,
    trailColorLogic: "sequential",
    backgroundColor: "#ffffff",
    eraseColor: "#ffffff",
    rainDrop: {
      direction: "TD",
      charArrays: [
        "⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿⡀⡁⡂⡃⡄⡅⡆⡇⡈⡉⡊⡋⡌⡍⡎⡏⡐⡑⡒⡓⡔⡕⡖⡗⡘⡙⡚⡛⡜⡝⡞⡟⡠⡡⡢⡣⡤⡥⡦⡧⡨⡩⡪⡫⡬⡭⡮⡯⡰⡱⡲⡳⡴⡵⡶⡷⡸⡹⡺⡻⡼⡽⡾⡿⢀⢁⢂⢃⢄⢅⢆⢇⢈⢉⢊⢋⢌⢍⢎⢏⢐⢑⢒⢓⢔⢕⢖⢗⢘⢙⢚⢛⢜⢝⢞⢟⢠⢡⢢⢣⢤⢥⢦⢧⢨⢩⢪⢫⢬⢭⢮⢯⢰⢱⢲⢳⢴⢵⢶⢷⢸⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣈⣉⣊⣋⣌⣍⣎⣏⣐⣑⣒⣓⣔⣕⣖⣗⣘⣙⣚⣛⣜⣝⣞⣟⣠⣡⣢⣣⣤⣥⣦⣧⣨⣩⣪⣫⣬⣭⣮⣯⣰⣱⣲⣳⣴⣵⣶⣷⣸⣹⣺⣻⣼⣽⣾⣿",
      ],
      headColor: "rgba(9,9,11,0.88)",
      trailColor: "rgba(24,24,27,0.56)",
      trailColors: [
        "rgba(24,24,27,0.62)",
        "rgba(24,24,27,0.44)",
        "rgba(24,24,27,0.28)",
        "rgba(24,24,27,0.16)",
        "rgba(24,24,27,0.08)",
      ],
      fontSize: 14,
      fontFamily: "Backwards",
      randomizePosition: true,
      frameDelay: 50,
      minFrameDelay: 50,
      maxFrameDelay: 130,
      randomizeFrameDelay: true,
      jitterLeftStrength: 0.75,
      jitterRightStrength: 0.75,
      jitterUpStrength: 0,
      jitterDownStrength: 10,
    },
    trailBloomSize: 0,
    trailBloomColor: "rgba(24,24,27,0)",
    headBloomSize: 0,
    headBloomColor: "rgba(9,9,11,0)",
    warmupIterations: 50,
    fadeStrength: 0.03,
    fadeColor: "rgba(255,255,255,0.03)",
  }

  function readThemeValue(name, fallback) {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  function getMatrixThemeConfig() {
    return {
      backgroundColor: readThemeValue("--rain-background", matrixPreset.backgroundColor),
      eraseColor: readThemeValue("--rain-erase-color", matrixPreset.eraseColor),
      fadeColor: readThemeValue("--rain-fade-color", matrixPreset.fadeColor),
      headColor: readThemeValue("--rain-head-color", matrixPreset.rainDrop.headColor),
      trailColor: readThemeValue("--rain-color", matrixPreset.rainDrop.trailColor),
      trailColors: [
        readThemeValue("--rain-trail-1", matrixPreset.rainDrop.trailColors[0]),
        readThemeValue("--rain-trail-2", matrixPreset.rainDrop.trailColors[1]),
        readThemeValue("--rain-trail-3", matrixPreset.rainDrop.trailColors[2]),
        readThemeValue("--rain-trail-4", matrixPreset.rainDrop.trailColors[3]),
        readThemeValue("--rain-trail-5", matrixPreset.rainDrop.trailColors[4]),
      ],
    }
  }

  function applyThemeToInstance(container, instance) {
    const themeConfig = getMatrixThemeConfig()

    container.style.backgroundColor = themeConfig.backgroundColor

    instance.options.backgroundColor = themeConfig.backgroundColor
    instance.options.fadeColor = themeConfig.fadeColor
    instance.options.eraseColor = themeConfig.eraseColor
    instance.options.rainDrop.headColor = themeConfig.headColor
    instance.options.rainDrop.trailColor = themeConfig.trailColor
    instance.options.rainDrop.trailColors = themeConfig.trailColors

    instance.raindrops.forEach((raindrop) => {
      raindrop.config.headColor = themeConfig.headColor
      raindrop.config.trailColor = themeConfig.trailColor
      raindrop.config.trailColors = themeConfig.trailColors
      raindrop.trailChars = []
    })
    instance.ctx.fillStyle = themeConfig.backgroundColor
    instance.ctx.fillRect(0, 0, instance.canvasWidth, instance.canvasHeight)
  }

  function initializeMatrixRain(container) {
    if (container.__matrixRainInstance) {
      return
    }

    const config = structuredClone(matrixPreset)
    const themeConfig = getMatrixThemeConfig()
    config.backgroundColor = themeConfig.backgroundColor
    config.fadeColor = themeConfig.fadeColor
    config.eraseColor = themeConfig.eraseColor
    config.rainDrop.headColor = themeConfig.headColor
    config.rainDrop.trailColor = themeConfig.trailColor
    config.rainDrop.trailColors = themeConfig.trailColors

    container.style.backgroundColor = themeConfig.backgroundColor

    const instance = new MatrixAnimationCtor(container, config)
    refineTrailRenderer(instance)
    instance.ctx.fillStyle = themeConfig.backgroundColor
    instance.ctx.fillRect(0, 0, instance.canvasWidth, instance.canvasHeight)

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      instance.pause()
    }

    container.__matrixRainInstance = instance
  }

  function boot() {
    document.querySelectorAll("[data-matrix-rain]").forEach(initializeMatrixRain)
  }

  window.addEventListener("au7h:themechange", () => {
    document.querySelectorAll("[data-matrix-rain]").forEach((container) => {
      const instance = container.__matrixRainInstance
      if (!instance) {
        return
      }

      applyThemeToInstance(container, instance)
    })
  })

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true })
  } else {
    boot()
  }
})()

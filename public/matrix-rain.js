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

  const matrixPreset = {
    rainWidth: 100,
    rainHeight: 18,
    minFrameTime: 48,
    syncFrame: false,
    rainDrop: {
      direction: "TD",
      charArrays: [
        "⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿⡀⡁⡂⡃⡄⡅⡆⡇⡈⡉⡊⡋⡌⡍⡎⡏⡐⡑⡒⡓⡔⡕⡖⡗⡘⡙⡚⡛⡜⡝⡞⡟⡠⡡⡢⡣⡤⡥⡦⡧⡨⡩⡪⡫⡬⡭⡮⡯⡰⡱⡲⡳⡴⡵⡶⡷⡸⡹⡺⡻⡼⡽⡾⡿⢀⢁⢂⢃⢄⢅⢆⢇⢈⢉⢊⢋⢌⢍⢎⢏⢐⢑⢒⢓⢔⢕⢖⢗⢘⢙⢚⢛⢜⢝⢞⢟⢠⢡⢢⢣⢤⢥⢦⢧⢨⢩⢪⢫⢬⢭⢮⢯⢰⢱⢲⢳⢴⢵⢶⢷⢸⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣈⣉⣊⣋⣌⣍⣎⣏⣐⣑⣒⣓⣔⣕⣖⣗⣘⣙⣚⣛⣜⣝⣞⣟⣠⣡⣢⣣⣤⣥⣦⣧⣨⣩⣪⣫⣬⣭⣮⣯⣰⣱⣲⣳⣴⣵⣶⣷⣸⣹⣺⣻⣼⣽⣾⣿",
      ],
      headColor: "rgba(9,9,11,0.92)",
      trailColor: "rgba(24,24,27,0.74)",
      fontSize: 14,
      fontFamily: "Backwards",
      randomizePosition: true,
      frameDelay: 50,
      minFrameDelay: 50,
      maxFrameDelay: 130,
      randomizeFrameDelay: true,
      jitterLeftStrength: 0,
      jitterRightStrength: 0,
      jitterUpStrength: 0,
      jitterDownStrength: 10,
    },
    trailBloomSize: 2,
    trailBloomColor: "rgba(24,24,27,0.24)",
    headBloomSize: 1,
    headBloomColor: "rgba(9,9,11,0.28)",
    warmupIterations: 50,
    fadeStrength: 0.12,
    fadeColor: "rgba(255,255,255,0.12)",
  }

  function initializeMatrixRain(container) {
    if (container.__matrixRainInstance) {
      return
    }

    const config = structuredClone(matrixPreset)
    config.fadeColor = container.dataset.rainFadeColor ?? config.fadeColor
    config.rainDrop.headColor = container.dataset.rainHeadColor ?? config.rainDrop.headColor
    config.rainDrop.trailColor = container.dataset.rainColor ?? config.rainDrop.trailColor

    container.style.backgroundColor = container.dataset.rainBackground ?? "#ffffff"

    const instance = new MatrixAnimationCtor(container, config)
    instance.ctx.fillStyle = container.dataset.rainBackground ?? "#ffffff"
    instance.ctx.fillRect(0, 0, instance.canvasWidth, instance.canvasHeight)

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      instance.pause()
    }

    container.__matrixRainInstance = instance
  }

  function boot() {
    document.querySelectorAll("[data-matrix-rain]").forEach(initializeMatrixRain)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true })
  } else {
    boot()
  }
})()

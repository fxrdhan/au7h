(function () {
  const MatrixAnimationCtor = window.MatrixAnimation?.MatrixAnimation

  if (!MatrixAnimationCtor) {
    return
  }

  const originalPlay = MatrixAnimationCtor.prototype.play
  if (!MatrixAnimationCtor.prototype.__kamsisFadePatched) {
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

    MatrixAnimationCtor.prototype.__kamsisFadePatched = true
    MatrixAnimationCtor.prototype.__kamsisOriginalPlay = originalPlay
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
      headColor: "rgba(255,255,255,0.8)",
      trailColor: "rgba(62,225,78,1.00)",
      fontSize: 1,
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
    trailBloomSize: 8,
    trailBloomColor: "#82ffa9",
    headBloomSize: 4,
    headBloomColor: "#ffffff",
    warmupIterations: 50,
    fadeStrength: 0.03,
    fadeColor: "rgba(244,244,245,0.03)",
  }

  function initializeMatrixRain(container) {
    if (container.__matrixRainInstance) {
      return
    }

    const config = structuredClone(matrixPreset)
    config.fadeColor = container.dataset.rainFadeColor ?? config.fadeColor
    config.rainDrop.headColor = container.dataset.rainHeadColor ?? config.rainDrop.headColor
    config.rainDrop.trailColor = container.dataset.rainColor ?? config.rainDrop.trailColor

    container.style.backgroundColor = container.dataset.rainBackground ?? "#f4f4f5"

    const instance = new MatrixAnimationCtor(container, config)
    instance.ctx.fillStyle = container.dataset.rainBackground ?? "#f4f4f5"
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

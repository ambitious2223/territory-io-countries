import { getGiftTuning, setGiftTuning, resetGiftTuning } from './giftTuning.js'

export function initGiftPanel() {
  const inputs = document.querySelectorAll('.gift-input')
  if (inputs.length === 0) return
  const sync = () => {
    const values = getGiftTuning()
    inputs.forEach((input) => { input.value = String(values[input.dataset.key]) })
  }
  sync()
  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      setGiftTuning({ [input.dataset.key]: input.value })
      sync()
    })
  })
  document.getElementById('btn-gift-reset')?.addEventListener('click', () => {
    resetGiftTuning()
    sync()
  })
}

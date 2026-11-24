import './personal-brand-archive.css'
import { initPersonalBrandPreviews } from './personal-brand-preview.js'

export function initPersonalBrandArchive() {
  const previews = initPersonalBrandPreviews()
  return () => previews.destroy()
}

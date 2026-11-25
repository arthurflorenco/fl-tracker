/**
 * Compressão no dispositivo antes de enviar (fotografias de tablet têm 3–8 MB).
 * Reduz para no máximo 1600 px no lado maior, JPEG, e baixa a qualidade até caber.
 * Também vai ser útil no modo offline (menos espaço no IndexedDB).
 */
export async function comprimirImagem(ficheiro: File, maxBytes: number, maxLado = 1600): Promise<string> {
  const bitmap = await createImageBitmap(ficheiro)
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (let q = 0.82; q >= 0.4; q -= 0.12) {
    const url = canvas.toDataURL('image/jpeg', q)
    if ((url.length * 3) / 4 <= maxBytes) return url
  }
  throw new Error('Não foi possível reduzir a fotografia.')
}

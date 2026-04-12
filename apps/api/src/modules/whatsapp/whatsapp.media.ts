const META_API_BASE = 'https://graph.facebook.com/v21.0'
const MOCK = process.env.WHATSAPP_MOCK === 'true'

// -----------------------------------------------------------------------
// Media metadata response from Meta
// -----------------------------------------------------------------------

interface MetaMediaInfo {
  url: string
  mime_type: string
  sha256: string
  file_size: number
  id: string
  messaging_product: string
}

export interface DownloadedMedia {
  buffer: Buffer
  mimeType: string
  fileSize: number
}

// -----------------------------------------------------------------------
// Download media from Meta (audio, image, document)
// -----------------------------------------------------------------------

/**
 * Etapa 1: busca URL temporária do arquivo pela media ID.
 */
async function getMediaUrl(mediaId: string, accessToken: string): Promise<MetaMediaInfo> {
  if (MOCK) {
    return {
      url: `https://mock.example.com/media/${mediaId}`,
      mime_type: 'audio/ogg; codecs=opus',
      sha256: 'mock',
      file_size: 0,
      id: mediaId,
      messaging_product: 'whatsapp',
    }
  }

  const res = await fetch(`${META_API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta media info error ${res.status}: ${body}`)
  }

  return res.json() as Promise<MetaMediaInfo>
}

/**
 * Etapa 2: baixa os bytes do arquivo a partir da URL temporária.
 */
async function fetchMediaBytes(mediaUrl: string, accessToken: string): Promise<Buffer> {
  if (MOCK) {
    return Buffer.alloc(0)
  }

  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Meta media download error ${res.status}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Baixa um arquivo de mídia do WhatsApp (áudio, imagem, documento).
 * Retorna o buffer de bytes, mime type e tamanho.
 */
export async function downloadMedia(
  mediaId: string,
  accessToken: string,
): Promise<DownloadedMedia> {
  const info = await getMediaUrl(mediaId, accessToken)
  const buffer = await fetchMediaBytes(info.url, accessToken)
  return {
    buffer,
    mimeType: info.mime_type,
    fileSize: info.file_size,
  }
}

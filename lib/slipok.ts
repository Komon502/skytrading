// SlipOk API integration
// https://slipok.com/

const SLIPOK_BRANCH_ID = process.env.SLIPOK_BRANCH_ID!
const SLIPOK_API_KEY = process.env.SLIPOK_API_KEY!

export interface SlipOkResponse {
  success: boolean
  data?: {
    transRef: string
    date: string
    countryCode: string
    amount: number
    fee: number
    ref1: string
    ref2: string
    ref3: string
    sender: {
      bank: { id: string; name: string; short: string }
      account: { name: string; bank: { id: string; type: string } }
    }
    receiver: {
      bank: { id: string; name: string; short: string }
      account: { name: string; bank: { id: string; type: string; account?: string } }
    }
  }
  message?: string
}

export async function verifySlip(slipImageBase64: string): Promise<SlipOkResponse> {
  const formData = new FormData()
  
  // Convert base64 to blob
  const byteString = atob(slipImageBase64.split(',')[1])
  const mimeString = slipImageBase64.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([ab], { type: mimeString })
  formData.append('files', blob, 'slip.jpg')

  try {
    const res = await fetch(`https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID}`, {
      method: 'POST',
      headers: {
        'x-authorization': SLIPOK_API_KEY,
      },
      body: formData,
    })

    if (!res.ok) {
      return { success: false, message: 'SlipOk API error' }
    }

    const data = await res.json()
    return { success: true, data }
  } catch (err) {
    return { success: false, message: String(err) }
  }
}

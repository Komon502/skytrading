import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase (uses service role key - can bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SLIPOK_BRANCH_ID = process.env.SLIPOK_BRANCH_ID!
const SLIPOK_API_KEY = process.env.SLIPOK_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { slipBase64, amount, slipUrl, userId } = req.body

  if (!slipBase64 || !amount || !userId) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' })
  }

  try {
    // Convert base64 to buffer
    const base64Data = slipBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const mimeType = slipBase64.split(';')[0].split(':')[1]

    // Build form data for SlipOk
    const formData = new FormData()
    const blob = new Blob([buffer], { type: mimeType })
    formData.append('files', blob, 'slip.jpg')

    // Call SlipOk API
    const slipokRes = await fetch(
      `https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID}`,
      {
        method: 'POST',
        headers: { 'x-authorization': SLIPOK_API_KEY },
        body: formData,
      }
    )

    if (!slipokRes.ok) {
      // Log deposit as pending for manual review
      await supabaseAdmin.from('deposits').insert({
        user_id: userId,
        amount,
        slip_url: slipUrl,
        status: 'pending',
      })
      return res.json({ success: false, message: 'SlipOk ตรวจสอบไม่ได้ในขณะนี้ กรุณารอการตรวจสอบแบบ manual' })
    }

    const slipData = await slipokRes.json()

    // Verify amount matches (allow ±1 baht tolerance)
    const slipAmount = slipData?.data?.amount || 0
    const amountMatch = Math.abs(slipAmount - amount) <= 1

    if (!amountMatch) {
      await supabaseAdmin.from('deposits').insert({
        user_id: userId, amount, slip_url: slipUrl,
        slipok_ref: slipData?.data?.transRef,
        status: 'rejected',
      })
      return res.json({
        success: false,
        message: `ยอดเงินใน slip (฿${slipAmount}) ไม่ตรงกับที่กรอก (฿${amount})`
      })
    }

    // Check for duplicate transRef
    const { data: existing } = await supabaseAdmin
      .from('deposits')
      .select('id')
      .eq('slipok_ref', slipData.data.transRef)
      .single()

    if (existing) {
      return res.json({ success: false, message: 'slip นี้ถูกใช้ไปแล้ว' })
    }

    // All good - insert deposit and update real_balance
    await supabaseAdmin.from('deposits').insert({
      user_id: userId,
      amount,
      slip_url: slipUrl,
      slipok_ref: slipData.data.transRef,
      status: 'verified',
    })

    // Update real balance
    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('real_balance').eq('user_id', userId).single()

    await supabaseAdmin.from('wallets').update({
      real_balance: (wallet?.real_balance || 0) + amount
    }).eq('user_id', userId)

    return res.json({ success: true, message: 'ยืนยันสลิปสำเร็จ' })
  } catch (err) {
    console.error('SlipOk error:', err)
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

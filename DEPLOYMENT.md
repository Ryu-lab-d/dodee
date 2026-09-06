# คู่มือ Deploy ขึ้นออนไลน์จริง

**สถานะ: Deploy เสร็จแล้ว ✅** ใช้ **Vercel** (frontend, ฟรี) + **Railway** (backend + database + เก็บรูปภาพ, ~$5-10/เดือน)

## URL จริงที่ใช้งานอยู่ตอนนี้

- **เว็บไซต์ (frontend)**: https://frontend-six-swart-55.vercel.app
- **Backend API**: https://dodee-production.up.railway.app
- **Health check**: https://dodee-production.up.railway.app/health
- **GitHub repo**: https://github.com/Ryu-lab-d/dodee

เข้าเว็บด้วย `owner` / `owner1234` แล้ว**เปลี่ยนรหัสผ่านทันที**ที่หน้าตั้งค่า (รหัสนี้เป็นค่า default ที่ใครก็รู้)

## สิ่งที่ตั้งค่าไว้แล้ว

- Railway project "serene-serenity": service `dodee` (backend, root directory = `backend`) + service `Postgres`
- Volume ถาวรสำหรับรูปภาพ mount ที่ `/app/uploads` บน service `dodee` (รูปจะไม่หายตอน redeploy)
- Environment variables ทั้งหมดตั้งไว้แล้ว (NODE_ENV, DATABASE_URL, JWT_SECRET, FRONTEND_URL ฯลฯ)
- Vercel project "frontend" เชื่อมกับ GitHub repo แล้ว + ตั้ง `NEXT_PUBLIC_API_URL` ชี้มาที่ Railway backend
- CORS ฝั่ง backend ล็อกให้รับเฉพาะ origin จาก Vercel URL ด้านบนเท่านั้น (ทดสอบแล้วผ่าน)
- สร้างบัญชี owner บนฐานข้อมูลจริงแล้ว

## เหลืออีก 1 ขั้นตอนที่ต้องทำเอง: อัปเดต Webhook LINE

Tunnel ชั่วคราว (cloudflared) ที่ใช้ตอนทดสอบถูกปิดไปแล้ว ต้องเปลี่ยน Webhook URL ใน LINE
Developers Console ให้ชี้มาที่เซิร์ฟเวอร์จริงแทน ไม่งั้นบันทึกการประชุม/แจ้งเตือนจะส่งเข้า LINE ไม่ได้:

1. เข้า LINE Developers Console → channel Messaging API ของ DoDee → แท็บ **Messaging API**
2. แก้ **Webhook URL** เป็น:
   ```
   https://dodee-production.up.railway.app/api/line/webhook
   ```
3. กด **Update** แล้วกด **Verify** ต้องขึ้น Success (ตอนนี้เป็น URL ถาวรแล้ว ไม่มีวันหลุดเหมือน tunnel ตอนทดสอบ)

## ถ้าจะแก้โค้ดแล้ว deploy ใหม่ในอนาคต

Backend เชื่อมกับ GitHub repo ไว้แล้ว แต่การ deploy จริงตอนนี้ทำผ่านคำสั่ง (เพราะ Railway ตรวจจับ
root directory ของ monorepo ผ่าน GitHub auto-deploy ไม่แม่นยำ) - ให้บอกในแชทว่าอยากแก้อะไร แล้วจะรัน
ให้ทั้งสองฝั่ง:

```
# backend
cd backend && railway up --service dodee --ci --path-as-root .

# frontend
cd frontend && vercel --prod --yes
```

## ถ้าจะซื้อโดเมนของตัวเองทีหลัง

ทั้ง Vercel และ Railway มีปุ่มผูก custom domain ได้ทันที (เช่น dodee.co.th) - พอผูกเสร็จต้องกลับมาแก้
`FRONTEND_URL` บน Railway และ `NEXT_PUBLIC_API_URL` บน Vercel ให้เป็นโดเมนใหม่ด้วย แล้วอัปเดต LINE
Webhook URL อีกรอบ

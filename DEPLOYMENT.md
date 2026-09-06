# คู่มือ Deploy ขึ้นออนไลน์จริง

ใช้ **Vercel** (frontend, ฟรี) + **Railway** (backend + database + เก็บรูปภาพ, ~$5-10/เดือน)

## ภาพรวม

```
ผู้ใช้ → Vercel (Next.js frontend, dodee.vercel.app)
              ↓ เรียก API
         Railway (Node.js backend + PostgreSQL, xxx.up.railway.app)
```

## ขั้นตอนที่ 1: สร้าง GitHub repo แล้ว push โค้ดขึ้นไป

1. เข้า https://github.com/new สร้าง repo ใหม่ชื่อ `dodee` (private ก็ได้) **อย่าติ๊ก** "Add a README" (เรามีอยู่แล้ว)
2. คัดลอก URL ของ repo ที่ได้ (เช่น `https://github.com/USERNAME/dodee.git`)
3. บอก URL นี้กลับมา แล้วให้ระบบ push โค้ดขึ้นไปให้

## ขั้นตอนที่ 2: Deploy Backend + Database บน Railway

1. เข้า https://railway.app สมัคร/ล็อกอินด้วยบัญชี GitHub เดียวกัน
2. กด **New Project** → **Deploy from GitHub repo** → เลือก repo `dodee`
3. Railway จะถามหา root directory ของ service นี้ → ใส่ `backend`
4. กด **New** → **Database** → **Add PostgreSQL** (สร้างในโปรเจกต์เดียวกัน)
5. กลับไปที่ service ของ backend → แท็บ **Variables** → เพิ่มตัวแปรตามนี้:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = อ้างอิงจาก Postgres plugin (Railway จะมีปุ่มให้เลือก "Add Reference" → เลือก Postgres → `DATABASE_URL`)
   - `JWT_SECRET` = ใช้ค่านี้ (สร้างแบบสุ่มไว้ให้แล้ว ปลอดภัย ไม่ต้องเปลี่ยน):
     ```
     OVW6THteJDrmv5qW0tie7D+pIgQnMOHsZ/JhZ3n+IrepiAXKSr48usI35U/qw7q8
     ```
   - `JWT_EXPIRES_IN` = `7d`
   - `DEFAULT_WATER_RATE` = `50`
   - `DEFAULT_ELECTRICITY_RATE` = `7`
   - `INVOICE_DUE_DAYS` = `10`
   - `FRONTEND_URL` = ใส่ `https://placeholder.vercel.app` ไปก่อน (จะย้อนมาแก้เป็นของจริงหลังขั้นตอนที่ 3)
6. แท็บ **Settings** ของ service → เลื่อนไปหา **Volumes** → กด **Add Volume** → Mount path ใส่ `/app/uploads`
   (จำเป็นมาก - ถ้าไม่ทำขั้นตอนนี้ รูปภาพที่อัปโหลดจะหายเวลา redeploy)
7. รอ deploy เสร็จ → ไปแท็บ **Settings** → **Networking** → กด **Generate Domain** จะได้ URL แบบ
   `https://dodee-backend-production.up.railway.app` → เก็บ URL นี้ไว้
8. ทดสอบ: เปิด `https://<URL ที่ได้>/health` ในเบราว์เซอร์ ต้องเห็น `{"status":"ok"}`
9. สร้างบัญชี owner: ในหน้า Railway service กด **⋮** → เปิด shell/console (หรือใช้ Railway CLI) แล้วรัน:
   ```
   npm run seed
   ```

## ขั้นตอนที่ 3: Deploy Frontend บน Vercel

1. เข้า https://vercel.com สมัคร/ล็อกอินด้วยบัญชี GitHub เดียวกัน
2. กด **Add New** → **Project** → เลือก repo `dodee`
3. ตรง **Root Directory** กด Edit → เลือก `frontend`
4. ตรง **Environment Variables** เพิ่ม:
   - `NEXT_PUBLIC_API_URL` = `https://<URL backend จาก Railway>/api`
5. กด **Deploy** รอสักครู่ จะได้ URL แบบ `https://dodee-xxxx.vercel.app`

## ขั้นตอนที่ 4: เชื่อมสองฝั่งเข้าด้วยกัน

1. กลับไป Railway → backend service → Variables → แก้ `FRONTEND_URL` เป็น URL จริงจาก Vercel
   (เช่น `https://dodee-xxxx.vercel.app`) → save (จะ redeploy อัตโนมัติ)

## ขั้นตอนที่ 5: อัปเดต Webhook LINE ให้ชี้มาที่ของจริง

1. เข้า LINE Developers Console → channel Messaging API → แท็บ Messaging API
2. แก้ Webhook URL เป็น `https://<URL backend จาก Railway>/api/line/webhook`
3. กด **Verify** ต้องขึ้น Success (ตอนนี้เสถียรถาวรแล้ว ไม่ใช่ tunnel ชั่วคราวแบบตอนทดสอบ)

## ขั้นตอนที่ 6: ทดสอบเว็บจริง

1. เข้า URL จาก Vercel → login ด้วย `owner` / `owner1234`
2. **เปลี่ยนรหัสผ่านทันที** ที่หน้าตั้งค่า (เพราะรหัสนี้เป็นค่า default ที่ทุกคนรู้)
3. ลองเพิ่มทรัพย์สิน, อัปโหลดรูป, ทดสอบบันทึกการประชุมส่งเข้า LINE

## หลัง deploy เสร็จแล้ว

- ปิด tunnel ทดสอบที่รันอยู่ในเครื่อง (cloudflared) ได้เลย ไม่จำเป็นอีกต่อไป
- backend/frontend ในเครื่อง (localhost) ยังใช้พัฒนาต่อได้ตามปกติ ไม่กระทบกับเว็บจริง
- ถ้าจะซื้อโดเมนของตัวเองทีหลัง (เช่น dodee.co.th) ทั้ง Vercel และ Railway มีปุ่มให้ผูก custom domain ได้ทันที

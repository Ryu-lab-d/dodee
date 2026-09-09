'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import AvatarPicker from '@/components/AvatarPicker';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { useConfirm } from '@/components/ConfirmDialog';

interface LineSettingsResponse {
  accessTokenConfigured: boolean;
  accessTokenPreview: string | null;
  channelSecretConfigured: boolean;
  channelSecretPreview: string | null;
  locked: boolean;
}

function MyProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.put('/auth/me/profile', { name, phone: phone || null, email: email || null });
      await refreshUser();
      setNotice('บันทึกข้อมูลส่วนตัวสำเร็จ');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">ข้อมูลส่วนตัว</h2>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}

      <div className="mb-4 flex justify-center">
        <AvatarPicker
          avatarUrl={user?.avatarUrl}
          onUploaded={async (url) => {
            await api.put('/auth/me/profile', { avatarUrl: url });
            await refreshUser();
          }}
        />
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อ-นามสกุล</label>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">เบอร์โทร</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">อีเมล</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
        </button>
      </form>
    </div>
  );
}

function MyLineConnection() {
  const { user, refreshUser } = useAuth();
  const [linkCode, setLinkCode] = useState<string | null>(user?.lineLinkCode || null);
  const connected = !!user?.lineUserId;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Keep local link-code state in sync whenever the auth context refreshes (e.g. after linking).
  useEffect(() => {
    setLinkCode(user?.lineLinkCode || null);
  }, [user?.lineLinkCode]);

  // While a link code is pending, poll every few seconds so the page updates itself
  // the moment the webhook confirms the connection - no manual refresh needed.
  useEffect(() => {
    if (!linkCode || connected) return;
    const interval = setInterval(() => refreshUser(), 4000);
    return () => clearInterval(interval);
  }, [linkCode, connected, refreshUser]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ code: string }>('/users/me/line-link-code');
      setLinkCode(res.code);
    } finally {
      setLoading(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await refreshUser();
    } finally {
      setChecking(false);
    }
  };

  const unlink = async () => {
    await api.delete('/users/me/line');
    setLinkCode(null);
    await refreshUser();
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">เชื่อมต่อ LINE ของฉัน</h2>
      <p className="mb-4 text-sm text-slate-500">
        เชื่อมบัญชี LINE ส่วนตัว เพื่อรับการแจ้งเตือน เช่น บันทึกการประชุมที่ถูกส่งถึงคุณ
      </p>

      {connected ? (
        <div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">เชื่อมต่อแล้ว</span>
          <button type="button" onClick={unlink} className="ml-3 text-xs font-medium text-red-600 hover:text-red-700">
            ยกเลิกการเชื่อมต่อ
          </button>
        </div>
      ) : (
        <div>
          {linkCode ? (
            <div className="rounded-xl border border-blue-100 bg-sky-50 p-4">
              <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-700">
                <li>เพิ่มเพื่อน LINE Official Account ของบริษัท</li>
                <li>
                  พิมพ์ข้อความนี้ส่งไปหา OA: <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold text-blue-700">{linkCode}</span>
                </li>
                <li>หน้านี้จะเช็คสถานะให้อัตโนมัติทุก 4 วินาที (หรือกด &quot;เช็คสถานะตอนนี้&quot; ด้านล่าง)</li>
              </ol>
              <div className="mt-3 flex items-center gap-3">
                <button type="button"
                  onClick={checkNow}
                  disabled={checking}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {checking ? 'กำลังเช็ค...' : 'เช็คสถานะตอนนี้'}
                </button>
                <button type="button" onClick={generate} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                  สร้างรหัสใหม่
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-700">
                ถ้าส่งข้อความไปแล้วแต่ยังไม่เชื่อมต่อ ให้เจ้าของระบบตรวจสอบว่าตั้งค่า Webhook URL ของ LINE OA ไว้แล้วในหน้านี้ (ดูหัวข้อ &quot;ตั้งค่า LINE Official Account&quot; ด้านล่าง)
              </p>
            </div>
          ) : (
            <button type="button"
              onClick={generate}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'กำลังสร้างรหัส...' : 'สร้างรหัสเชื่อมต่อ LINE'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LineOaSettings() {
  const confirmDialog = useConfirm();
  const [data, setData] = useState<LineSettingsResponse | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const load = () => api.get<LineSettingsResponse>('/settings/line').then(setData).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const locked = !!data?.locked && !unlocked;

  const requestUnlock = async () => {
    const ok = await confirmDialog({
      title: 'แก้ไขการตั้งค่า LINE',
      message: 'การแก้ไขค่านี้อาจทำให้การแจ้งเตือนอัตโนมัติผ่าน LINE หยุดทำงานชั่วคราวจนกว่าจะตั้งค่าใหม่ถูกต้อง ยืนยันว่าต้องการแก้ไข?',
      confirmLabel: 'แก้ไข',
    });
    if (ok) {
      setUnlocked(true);
      setError(null);
      setNotice(null);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.put('/settings/line', {
        accessToken: accessToken || undefined,
        channelSecret: channelSecret || undefined,
        confirmChange: unlocked || undefined,
      });
      setAccessToken('');
      setChannelSecret('');
      setUnlocked(false);
      setNotice('บันทึกการตั้งค่า LINE OA สำเร็จ (ตรวจสอบกับ LINE แล้วว่าใช้งานได้จริง)');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">ตั้งค่า LINE Official Account (สำหรับแจ้งเตือนทั้งบริษัท)</h2>
        <button type="button" onClick={() => setShowGuide((v) => !v)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
          {showGuide ? 'ซ่อนวิธีตั้งค่า' : 'ยังไม่รู้วิธีตั้งค่า? ดูวิธีที่นี่'}
        </button>
      </div>

      {data?.locked && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span>{unlocked ? 'ปลดล็อกแล้ว - แก้ไขแล้วกดบันทึกเพื่อยืนยัน' : 'ตั้งค่าไว้แล้วและถูกล็อกไว้เพื่อป้องกันการแก้ไขโดยไม่ตั้งใจ'}</span>
          {!unlocked && (
            <button type="button" onClick={requestUnlock} className="font-medium text-blue-600 hover:text-blue-700">
              แก้ไข
            </button>
          )}
        </div>
      )}

      {showGuide && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-sky-50 p-4 text-sm text-slate-700">
          <p className="mb-2 font-medium">วิธีหา Channel Access Token และ Channel Secret:</p>
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>
              ถ้าเข้า LINE Developers Console แล้ว<strong>ไม่เจอแท็บ &quot;Messaging API&quot;</strong> เลย แปลว่า OA ของคุณยังไม่เคยเปิดใช้งาน
              Messaging API มาก่อน (เป็นสาเหตุที่พบบ่อยที่สุด) ต้องไปเปิดจากฝั่ง OA ก่อน:
              <ol className="mt-1 list-[lower-alpha] space-y-1 pl-4">
                <li>เข้า <span className="font-mono">manager.line.biz</span> (LINE Official Account Manager) แล้วล็อกอินด้วยบัญชีที่ดูแล OA</li>
                <li>เลือก OA ของคุณ → ไปที่ <strong>การตั้งค่า (Settings)</strong> → <strong>Messaging API</strong></li>
                <li>กด <strong>เปิดใช้งาน Messaging API</strong> ระบบจะถามให้เลือกหรือสร้าง &quot;ผู้ให้บริการ (Provider)&quot; - ตั้งชื่ออะไรก็ได้ เช่น ชื่อบริษัทคุณ แล้วกดยืนยัน</li>
                <li>เสร็จแล้วในหน้าเดียวกันจะมีลิงก์ &quot;LINE Developers&quot; กดเข้าไปเพื่อไปยัง Channel ที่สร้างขึ้นให้อัตโนมัติ - ตอนนี้จะเจอแท็บ Messaging API แล้ว</li>
              </ol>
            </li>
            <li>ถ้าเข้า LINE Developers Console ที่ <span className="font-mono">developers.line.biz</span> โดยตรง ให้เลือก Provider แล้วเลือก Channel ที่เป็น <strong>Messaging API</strong> ของ OA ตัวนี้ (ต้องทำขั้นตอนข้อ 1 มาก่อนถึงจะมี Channel นี้ให้เลือก)</li>
            <li>ในหน้า Channel เข้าแท็บ <strong>Basic settings</strong> จะเจอ <strong>Channel secret</strong> - คัดลอกมาใส่ในช่องด้านล่าง</li>
            <li>เข้าแท็บ <strong>Messaging API</strong> เลื่อนลงไปที่ <strong>Channel access token</strong> กด &quot;Issue&quot; เพื่อออก token ใหม่ (ใช้แบบ long-lived) แล้วคัดลอกมาใส่ด้านล่าง</li>
            <li>ในหน้าเดียวกัน ตั้งค่า <strong>Webhook URL</strong> เป็นที่อยู่ของ backend คุณ + <span className="font-mono">/api/line/webhook</span> แล้วเปิด &quot;Use webhook&quot; - จำเป็นสำหรับให้พนักงานเชื่อมบัญชี LINE ของตัวเองได้
              <div className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠️ ข้อสำคัญ: URL นี้ต้องเป็นที่อยู่ที่ LINE เรียกจากอินเทอร์เน็ตได้จริง <strong>ห้ามใช้ localhost</strong> เด็ดขาด
                (LINE เข้าเครื่องคุณตรงๆ ไม่ได้) ถ้ายังรันแค่บนเครื่องตัวเอง (dev) ต้องเปิด tunnel ก่อน เช่น
                <span className="font-mono"> npx localtunnel --port 4000</span> จะได้ URL แบบ
                <span className="font-mono"> https://xxxx.loca.lt</span> มาใช้แทน ถ้า deploy ขึ้น server จริงแล้วก็ใช้โดเมนจริงได้เลย
              </div>
            </li>
            <li>กด &quot;Verify&quot; ข้าง Webhook URL ใน LINE Developers Console ต้องขึ้นสำเร็จ (Success) ถ้าไม่สำเร็จแปลว่า URL เรียกเข้าเครื่องคุณไม่ได้ ให้เช็คข้อ 6 อีกครั้ง</li>
          </ol>
        </div>
      )}

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Channel Access Token</label>
          <p className="mb-1.5 text-xs text-slate-400">
            ค่าตัวยาวจาก LINE Developers Console (แท็บ Messaging API) - วางทั้งก้อนได้เลย ระบบตัดช่องว่างหน้า-หลังให้อัตโนมัติ
          </p>
          <textarea
            rows={3}
            disabled={locked}
            placeholder={data?.accessTokenConfigured ? data.accessTokenPreview || 'ตั้งค่าแล้ว' : 'วาง Channel Access Token ที่นี่'}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Channel Secret</label>
          <p className="mb-1.5 text-xs text-slate-400">ค่าสั้นจากแท็บ Basic settings</p>
          <input
            type="text"
            disabled={locked}
            placeholder={data?.channelSecretConfigured ? data.channelSecretPreview || 'ตั้งค่าแล้ว' : 'วาง Channel Secret ที่นี่'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            value={channelSecret}
            onChange={(e) => setChannelSecret(e.target.value)}
          />
        </div>
        {!locked && (
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังตรวจสอบและบันทึก...' : 'บันทึก'}
          </button>
        )}
      </form>
    </div>
  );
}

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
}

function CompanyProfileSettings() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    api.get<CompanyProfile>('/settings/company').then((c) => {
      setName(c.name);
      setAddress(c.address);
      setPhone(c.phone);
      setLogoUrl(c.logoUrl);
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.put('/settings/company', { name, address, phone, logoUrl });
      setNotice('บันทึกข้อมูลบริษัทสำเร็จ');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">ข้อมูลบริษัท</h2>
      <p className="mb-4 text-sm text-slate-500">ใช้แสดงบนใบเรียกเก็บและเอกสารต่างๆ ในระบบ</p>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">โลโก้บริษัท</label>
          <ImageUploader
            images={logoUrl ? [logoUrl] : []}
            onChange={(imgs) => setLogoUrl(imgs[imgs.length - 1] || '')}
            onUploadingChange={setPhotoUploading}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อบริษัท</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ที่อยู่</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">เบอร์โทร</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving || photoUploading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : photoUploading ? 'รอรูปภาพอัปโหลดเสร็จ...' : 'บันทึก'}
        </button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">ตั้งค่า</h1>
      <MyProfileSettings />
      {user?.role === 'owner' && <CompanyProfileSettings />}
      <MyLineConnection />
      <ChangePasswordForm />
      {user?.role === 'owner' && <LineOaSettings />}
    </div>
  );
}

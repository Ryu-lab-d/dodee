'use client';

import Image from 'next/image';

export default function MeetingSuccessModal({
  recordedByName,
  recordDate,
  time,
  onView,
  onClose,
}: {
  recordedByName: string;
  recordDate: string;
  time: string;
  onView: () => void;
  onClose: () => void;
}) {
  return (
    <div className="success-backdrop fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="success-card w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <Image src="/logo.png" alt="DoDee" width={200} height={145} className="mx-auto mb-4 h-10 w-auto" />

        <div className="success-circle mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg viewBox="0 0 24 24" className="h-10 w-10">
            <path
              className="success-check"
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-slate-900">บันทึกการประชุมสำเร็จแล้ว</h2>
        <p className="mt-2 text-sm text-slate-500">
          บันทึกการประชุมใหม่ถูกบันทึกโดย <span className="font-medium text-slate-700">{recordedByName}</span>
          <br />
          เวลา {time} วันที่ {recordDate}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onView}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ดูข้อมูลการบันทึก
          </button>
          <button onClick={onClose} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

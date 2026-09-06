'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { AppTransaction, FinancialSummary, Property, TransactionType } from '@/lib/types';
import CountUp from '@/components/CountUp';

const thisMonth = () => new Date().toISOString().slice(0, 7);

const EXPENSE_CATEGORIES = ['ซ่อมบำรุง', 'ค่าน้ำ', 'ค่าไฟ', 'เงินเดือน', 'ภาษี', 'อื่นๆ'];
const INCOME_CATEGORIES = ['rent', 'อื่นๆ'];

function downloadCsv(rows: AppTransaction[], month: string) {
  const header = ['วันที่', 'ประเภท', 'หมวดหมู่', 'ทรัพย์สิน', 'จำนวนเงิน', 'รายละเอียด'];
  const lines = rows.map((t) => [
    t.date,
    t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    t.category,
    t.property?.name || '',
    t.amount,
    (t.description || '').replace(/,/g, ' '),
  ]);
  const csv = [header, ...lines].map((r) => r.join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dodee-transactions-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [month, setMonth] = useState(thisMonth());
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [formPropertyId, setFormPropertyId] = useState('');

  const query = `month=${month}${propertyId ? `&propertyId=${propertyId}` : ''}`;

  const load = () => {
    api.get<AppTransaction[]>(`/transactions?${query}`).then(setTransactions).catch((err) => setError(err.message));
    api.get<FinancialSummary>(`/transactions/summary?${query}`).then(setSummary).catch(() => {});
  };

  useEffect(() => {
    api.get<Property[]>('/properties?category=hostel').then((hostels) =>
      api.get<Property[]>('/properties?category=single').then((singles) => setProperties([...hostels, ...singles]))
    );
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, propertyId]);

  useEffect(() => {
    if (properties.length > 0 && !formPropertyId) setFormPropertyId(properties[0].id);
  }, [properties, formPropertyId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/transactions', {
        type,
        category,
        amount: Number(amount),
        date,
        description: description || undefined,
        propertyId: formPropertyId,
      });
      setAmount('');
      setDescription('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบรายการนี้ใช่ไหม?')) return;
    await api.delete(`/transactions/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">รายรับ-รายจ่าย</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">ทุกทรัพย์สิน</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => downloadCsv(transactions, month)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'ยกเลิก' : '+ เพิ่มรายการ'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">รายรับรวม</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              ฿<CountUp value={summary.totalIncome} />
            </p>
          </div>
          <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '70ms' }}>
            <p className="text-sm text-slate-500">รายจ่ายรวม</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              ฿<CountUp value={summary.totalExpense} />
            </p>
          </div>
          <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '140ms' }}>
            <p className="text-sm text-slate-500">กำไร-ขาดทุน</p>
            <p className={`mt-1 text-2xl font-semibold ${summary.profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              ฿<CountUp value={summary.profit} />
            </p>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ประเภท</label>
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as TransactionType;
                  setType(t);
                  setCategory(t === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="expense">รายจ่าย</option>
                <option value="income">รายรับ</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">หมวดหมู่</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ทรัพย์สิน</label>
              <select
                value={formPropertyId}
                onChange={(e) => setFormPropertyId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงิน (บาท)</label>
              <input
                type="number"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">วันที่</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียด</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">วันที่</th>
              <th className="px-4 py-2 font-medium">ประเภท</th>
              <th className="px-4 py-2 font-medium">หมวดหมู่</th>
              <th className="px-4 py-2 font-medium">ทรัพย์สิน</th>
              <th className="px-4 py-2 font-medium">รายละเอียด</th>
              <th className="px-4 py-2 font-medium">จำนวนเงิน</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr
                key={t.id}
                className="fade-up border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/50"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <td className="px-4 py-2 text-slate-600">{t.date}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{t.category}</td>
                <td className="px-4 py-2 text-slate-600">{t.property?.name}</td>
                <td className="px-4 py-2 text-slate-600">{t.description || '-'}</td>
                <td className={`px-4 py-2 font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}฿{Number(t.amount).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDelete(t.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">ยังไม่มีรายการของเดือนนี้</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

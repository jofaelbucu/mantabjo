import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format angka ke format mata uang Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Format tanggal ke format Indonesia
export function formatTanggal(date: string | Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return new Date(date).toLocaleDateString('id-ID', options);
}

// Mendapatkan tanggal hari ini dalam format ISO
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Mendapatkan minggu dari tanggal
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Mendapatkan bulan dari tanggal (1-12)
export function getMonthNumber(date: Date): number {
  return date.getMonth() + 1;
}

// Mendapatkan tahun dari tanggal
export function getYear(date: Date): number {
  return date.getFullYear();
}
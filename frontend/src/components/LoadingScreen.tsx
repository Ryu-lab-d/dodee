import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-sky-50">
      <div className="splash-icon">
        <Image src="/icon.png" alt="" width={256} height={256} className="h-16 w-16" priority />
      </div>

      <div className="relative text-4xl font-extrabold tracking-tight sm:text-5xl">
        <span className="text-slate-200">Do Dee</span>
        <span className="splash-text-sweep absolute inset-0">
          <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">Do Dee</span>
        </span>
      </div>

      <div className="flex gap-1.5">
        <span className="splash-dot h-2 w-2 rounded-full bg-blue-500" style={{ animationDelay: '0s' }} />
        <span className="splash-dot h-2 w-2 rounded-full bg-blue-500" style={{ animationDelay: '0.15s' }} />
        <span className="splash-dot h-2 w-2 rounded-full bg-blue-500" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  );
}

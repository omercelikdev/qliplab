import { useId } from 'react';

interface QlipLabIconProps {
  size?: number;
  className?: string;
}

export function QlipLabIcon({ size = 32, className = '' }: QlipLabIconProps) {
  const gradId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <path
        d="m12 1c-7.813 0-11 3.187-11 11s3.187 11 11 11 11-3.187 11-11-3.187-11-11-11zm0 21c-7.196 0-10-2.804-10-10s2.804-10 10-10 10 2.804 10 10-2.804 10-10 10zm0-16c-3.505 0-5 1.794-5 6s1.495 6 5 6c1.412 0 2.483-.308 3.277-.931.301.463.569.989.744 1.574.078.267.365.415.623.335.265-.079.415-.357.335-.622-.233-.779-.603-1.451-1.005-2.031.689-.974 1.026-2.382 1.026-4.325 0-4.206-1.495-6-5-6zm1.777 8.084c-.23-.153-.54-.092-.693.139-.153.229-.091.539.138.693.012.008.72.501 1.446 1.35-.629.5-1.494.734-2.668.734-2.916 0-4-1.355-4-5s1.084-5 4-5 4 1.355 4 5c0 1.57-.217 2.693-.679 3.488-.769-.868-1.49-1.368-1.543-1.404z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

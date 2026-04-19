import type { CSSProperties } from 'react';

interface PaginationProps {
  page: number;
  total: number;
  size: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, total, size, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / size);
  if (totalPages <= 1) return null;

  const btnStyle = (active: boolean): CSSProperties => ({
    padding: '6px 12px', margin: '0 2px', border: '1px solid #dadce0',
    borderRadius: 4, cursor: 'pointer', backgroundColor: active ? '#1a73e8' : '#fff',
    color: active ? '#fff' : '#202124', fontSize: 14,
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 24 }}>
      <button style={btnStyle(false)} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>前へ</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} style={btnStyle(p === page)} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button style={btnStyle(false)} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>次へ</button>
    </div>
  );
}


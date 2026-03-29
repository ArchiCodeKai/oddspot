// Step 3: 景點詳情頁（待實作）
export default function SpotDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen p-6">
      <p className="text-gray-500">景點詳情頁 — {params.id}</p>
    </div>
  );
}

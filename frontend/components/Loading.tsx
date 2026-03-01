'use client'

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      {message && (
        <p className="mt-4 text-gray-300">{message}</p>
      )}
    </div>
  )
}

export function RoomListSkeleton() {
  return (
    <div className="space-y-4" aria-label="正在加载房间列表">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

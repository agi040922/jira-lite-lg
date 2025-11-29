import { MorphPanel } from "@/components/MorphPanel"

export default function MorphPanelPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="mb-8 text-2xl font-bold">MorphPanel Test</h1>
      <div className="relative h-[400px] w-full max-w-[500px] rounded-xl border bg-white p-8 shadow-sm">
        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <MorphPanel />
        </div>
        <div className="text-center text-gray-500">
          <p>Content above the panel...</p>
        </div>
      </div>
    </div>
  )
}

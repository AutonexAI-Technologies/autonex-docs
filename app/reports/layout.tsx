import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <Sidebar /><div className="flex-1 flex flex-col min-w-0 overflow-hidden"><TopBar /><main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main></div>
    </div>
  )
}

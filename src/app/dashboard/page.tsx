import { CommandCenter } from '@/components/chat/CommandCenter';
import { Header } from '@/components/layout/Header';
import { StrategyWidget } from '@/components/widgets/StrategyWidget';
import { PerformanceWidget } from '@/components/widgets/PerformanceWidget';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Strategy Widget */}
          <div className="hidden lg:block w-80">
            <StrategyWidget />
          </div>

          {/* Main Chat Interface */}
          <div className="flex-1">
            <CommandCenter />
          </div>

          {/* Performance Monitor */}
          <div className="hidden xl:block w-80">
            <PerformanceWidget />
          </div>
        </div>
      </main>
    </div>
  );
}

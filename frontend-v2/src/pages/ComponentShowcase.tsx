import { useMemo, useState } from 'react'
import { Cuboid, Layers3, MessageSquare, Mic, Monitor, Sparkles, TabletSmartphone } from 'lucide-react'

import { FloatingMenu, GlassButton, GlassCard, GlassInput, GlassPanel } from '@/components/vision-pro'
import { cn } from '@/lib/utils'

type DisplayMode = 'desktop' | 'vr'

export function ComponentShowcase() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('desktop')
  const [displayName, setDisplayName] = useState('Vision Pro User')

  const menuItems = useMemo(
    () => [
      { key: 'scene', label: '场景', icon: <Cuboid className="h-4 w-4" /> },
      { key: 'layers', label: '图层', icon: <Layers3 className="h-4 w-4" /> },
      { key: 'chat', label: '聊天', icon: <MessageSquare className="h-4 w-4" /> },
      { key: 'audio', label: '语音', icon: <Mic className="h-4 w-4" /> },
    ],
    [],
  )

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,#2b5ea7_0%,#101827_42%,#04060d_100%)] p-4 text-white sm:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <GlassPanel className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Phase 1.6</p>
              <h1 className="mt-1 text-3xl font-semibold">Vision Pro 组件展示页</h1>
              <p className="mt-2 text-sm text-white/75">Shadcn/ui + Tailwind · Apple Vision Pro 风格 · 支持桌面/VR 模式</p>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton
                variant={displayMode === 'desktop' ? 'primary' : 'ghost'}
                onClick={() => setDisplayMode('desktop')}
              >
                <Monitor className="h-4 w-4" />
                桌面
              </GlassButton>
              <GlassButton variant={displayMode === 'vr' ? 'primary' : 'ghost'} onClick={() => setDisplayMode('vr')}>
                <Sparkles className="h-4 w-4" />
                VR
              </GlassButton>
            </div>
          </div>
        </GlassPanel>

        <section
          className={cn(
            'mx-auto w-full transition-all duration-300',
            displayMode === 'desktop' ? 'max-w-6xl' : 'max-w-4xl scale-[1.015]',
          )}
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <GlassCard
              title="GlassButton / GlassInput"
              description="primary / secondary / ghost 变体 + 输入框"
              footer={<p className="text-xs text-white/70">44px+ 点击区域，触控友好</p>}
            >
              <div className="space-y-5">
                <div className="flex flex-wrap gap-3">
                  <GlassButton variant="primary">Primary</GlassButton>
                  <GlassButton variant="secondary">Secondary</GlassButton>
                  <GlassButton variant="ghost">Ghost</GlassButton>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/80" htmlFor="vp-display-name">
                    显示名称
                  </label>
                  <GlassInput
                    id="vp-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="请输入你的昵称"
                  />
                </div>
              </div>
            </GlassCard>

            <div className="space-y-6">
              <GlassPanel intensity="thin" className="p-4">
                <h2 className="mb-4 text-sm font-medium text-white/80">FloatingMenu</h2>
                <FloatingMenu items={menuItems} className="w-full justify-center" />
              </GlassPanel>

              <GlassPanel className="p-5">
                <h2 className="text-sm font-medium text-white/80">响应式测试</h2>
                <p className="mt-2 text-sm text-white/70">缩放窗口可观察布局变化：移动端纵向堆叠，桌面端双列展示。</p>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-xs text-white/80 backdrop-blur-xl">
                    <TabletSmartphone className="mb-1 h-4 w-4" />
                    Mobile: 1 列
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-xs text-white/80 backdrop-blur-xl">
                    <Monitor className="mb-1 h-4 w-4" />
                    Desktop: 2 列
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

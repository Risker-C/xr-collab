import { useState } from 'react'

import { XRButton } from '@/components/xr/XRButton'
import { XRCard } from '@/components/xr/XRCard'
import { XRPanel } from '@/components/xr/XRPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

function App() {
  const [displayName, setDisplayName] = useState('Vision Pro User')

  return (
    <main className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top,#1f3b66_0%,#0b1220_45%,#04060d_100%)] p-4 sm:p-8">
      <div className="pointer-events-none absolute -top-24 right-8 h-56 w-56 rounded-full bg-vision-cyan/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-vision-indigo/25 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <XRPanel intensity="regular">
          <h1 className="text-2xl font-semibold text-foreground">Shadcn/ui + Tailwind XR HUD</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Phase 1.5 集成完成：支持 Vision Pro 风格 UI、glassmorphism 和 DOM Overlay 交互。
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <XRButton>进入协作房间</XRButton>
            <XRButton variant="secondary">共享屏幕</XRButton>
            <Dialog>
              <DialogTrigger asChild>
                <XRButton variant="outline">打开连接设置</XRButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>XR 会话连接</DialogTitle>
                  <DialogDescription>输入设备名并确认连接到协作空间。</DialogDescription>
                </DialogHeader>
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                <DialogFooter>
                  <Button type="submit">确认连接</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </XRPanel>

        <div className="grid gap-4 md:grid-cols-2">
          <XRCard
            title="XR Overlay 卡片"
            description="用于 3D 场景上方的信息呈现与快速操作。"
            footer={<XRButton size="sm">同步状态</XRButton>}
          >
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground" htmlFor="display-name">
                显示名称
              </label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <Separator />
              <p className="text-sm text-muted-foreground">当前在线：4 名成员 · 延迟 28ms</p>
            </div>
          </XRCard>

          <XRCard
            title="标准 Shadcn 组件"
            description="Button / Input / Dialog / Separator 已可直接使用。"
            footer={
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  重新连接
                </Button>
                <Button size="sm">保存布局</Button>
              </div>
            }
            className="glass-regular"
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Tailwind tokens 来自 src/styles/tokens.css</p>
              <p>Glassmorphism 工具类通过 tailwind.config.js 插件扩展。</p>
            </div>
          </XRCard>
        </div>
      </div>
    </main>
  )
}

export default App

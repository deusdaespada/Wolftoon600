import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Home, List, Settings2,
  Maximize2, Minimize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ReaderSettings,
  ReaderSettingsButton,
  defaultReaderSettings,
  type ReaderSettingsState,
} from '@/components/reader/ReaderSettings'
import { cn } from '@/lib/utils'

// Mock chapter pages (placeholder images)
const PAGES = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  src: `https://picsum.photos/seed/manga${i}/800/1200`,
}))

export default function Reader() {
  const [settings, setSettings] = useState<ReaderSettingsState>(() => {
    try {
      const saved = localStorage.getItem('wolftoon-reader-settings')
      return saved ? { ...defaultReaderSettings, ...JSON.parse(saved) } : defaultReaderSettings
    } catch {
      return defaultReaderSettings
    }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scrolling, setScrolling] = useState(false)

  // Persist settings
  useEffect(() => {
    localStorage.setItem('wolftoon-reader-settings', JSON.stringify(settings))
  }, [settings])

  // Auto-scroll
  useEffect(() => {
    if (!settings.autoScroll || settings.readingMode !== 'webtoon') return
    const speed = settings.autoScrollSpeed / 60 // px per frame approx
    let raf: number
    const tick = () => {
      window.scrollBy(0, speed)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [settings.autoScroll, settings.autoScrollSpeed, settings.readingMode])

  // Auto-hide header on scroll
  useEffect(() => {
    if (!settings.autoHideHeader || settings.headerLayout === 'fixed') {
      setHeaderVisible(true)
      return
    }
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY + 8) setHeaderVisible(false)
      else if (y < lastY - 8) setHeaderVisible(true)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [settings.autoHideHeader, settings.headerLayout])

  // Keyboard shortcuts
  useEffect(() => {
    if (!settings.keyboardShortcuts) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd') setCurrentPage((p) => Math.min(PAGES.length - 1, p + 1))
      if (e.key === 'ArrowLeft' || e.key === 'a') setCurrentPage((p) => Math.max(0, p - 1))
      if (e.key === 's') setSettingsOpen(true)
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings.keyboardShortcuts])

  const handleTouchNav = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!settings.touchNavigation || settings.readingMode !== 'page') return
      const x = e.clientX
      const w = window.innerWidth
      if (x < w * 0.3) setCurrentPage((p) => Math.max(0, p - 1))
      else if (x > w * 0.7) setCurrentPage((p) => Math.min(PAGES.length - 1, p + 1))
      else setHeaderVisible((v) => !v)
    },
    [settings.touchNavigation, settings.readingMode]
  )

  const progress = settings.readingMode === 'page'
    ? ((currentPage + 1) / PAGES.length) * 100
    : 0

  const themeBg =
    settings.theme === 'light' ? 'bg-zinc-100 text-zinc-900' :
    settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5c4b37]' :
    'bg-black text-white'

  return (
    <div
      className={cn('min-h-screen relative', themeBg)}
      style={{
        filter: settings.brightness < 100 ? `brightness(${settings.brightness}%)` : undefined,
      }}
    >
      {/* Header */}
      {settings.showHeader && (
        <header
          className={cn(
            'z-40 transition-all duration-300',
            settings.headerLayout === 'fixed' && 'fixed top-0 left-0 right-0',
            settings.headerLayout === 'sticky' && 'sticky top-0',
            settings.headerLayout === 'floating' && 'fixed top-0 left-0 right-0',
            settings.headerLayout === 'static' && 'relative',
            !headerVisible && settings.autoHideHeader && '-translate-y-full opacity-0',
            settings.headerLayout === 'floating' && 'bg-black/50 backdrop-blur-md',
            settings.headerLayout !== 'floating' && 'bg-black/90 border-b border-white/5'
          )}
        >
          <div className="max-w-3xl mx-auto px-3 h-12 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white">
                  <Home className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white">
                <List className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 text-center min-w-0">
              <p className="text-sm font-semibold truncate">Solo Leveling</p>
              <p className="text-[10px] text-white/50">Capítulo 214</p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/80 hover:text-white"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div
        className={cn(
          'mx-auto',
          settings.imageFit === 'width' && 'max-w-3xl',
          settings.imageFit === 'height' && 'max-w-fit',
          settings.imageFit === 'original' && 'max-w-none'
        )}
        style={{ zoom: `${settings.zoom}%` }}
        onClick={handleTouchNav}
      >
        {settings.readingMode === 'webtoon' ? (
          // Vertical continuous scroll
          <div className="flex flex-col items-center">
            {PAGES.map((page) => (
              <img
                key={page.id}
                src={page.src}
                alt={`Página ${page.id}`}
                className={cn(
                  'w-full select-none',
                  settings.imageFit === 'width' && 'w-full h-auto',
                  settings.imageFit === 'height' && 'h-screen w-auto',
                  settings.imageFit === 'original' && 'w-auto h-auto max-w-none'
                )}
                draggable={false}
                loading="lazy"
              />
            ))}
            <div className="py-16 text-center text-muted-foreground text-sm">
              Fim do capítulo
            </div>
          </div>
        ) : (
          // Page mode
          <div className="min-h-[80vh] flex items-center justify-center p-2">
            <img
              src={PAGES[currentPage]?.src}
              alt={`Página ${currentPage + 1}`}
              className={cn(
                'select-none max-h-[85vh]',
                settings.imageFit === 'width' && 'w-full h-auto',
                settings.imageFit === 'height' && 'h-[85vh] w-auto',
                settings.imageFit === 'original' && 'w-auto h-auto'
              )}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {settings.showProgress && (
        <div
          className={cn(
            'fixed z-30 transition-opacity',
            settings.progressPosition === 'center' && 'left-1/2 -translate-x-1/2',
            settings.progressPosition === 'left' && 'left-4',
            settings.progressPosition === 'right' && 'right-4',
            settings.alwaysVisibleProgress ? 'opacity-100' : 'opacity-70 hover:opacity-100',
            'bottom-6'
          )}
        >
          {settings.progressLayout === 'pill' && (
            <div className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold tabular-nums text-white shadow-lg">
              {settings.readingMode === 'page'
                ? `${currentPage + 1} / ${PAGES.length}`
                : 'Webtoon'}
            </div>
          )}
          {settings.progressLayout === 'counter' && (
            <div className="text-sm font-bold tabular-nums text-white/90 drop-shadow">
              {currentPage + 1}/{PAGES.length}
            </div>
          )}
          {settings.progressLayout === 'bar' && (
            <div className="w-40 h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {settings.progressLayout === 'slider' && settings.readingMode === 'page' && (
            <input
              type="range"
              min={0}
              max={PAGES.length - 1}
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="w-48 h-1.5 accent-amber-500"
            />
          )}
          {settings.progressLayout === 'dots' && settings.readingMode === 'page' && (
            <div className="flex gap-1.5">
              {PAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === currentPage ? 'bg-amber-500 scale-125' : 'bg-white/30'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Page nav (page mode) */}
      {settings.readingMode === 'page' && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center gap-4 z-20 pointer-events-none">
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto rounded-full bg-black/60 backdrop-blur border border-white/10"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto rounded-full bg-black/60 backdrop-blur border border-white/10"
            disabled={currentPage >= PAGES.length - 1}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Floating settings button (always accessible) */}
      <div className="fixed bottom-6 right-4 z-40">
        <ReaderSettingsButton onClick={() => setSettingsOpen(true)} />
      </div>

      {/* Settings panel */}
      <ReaderSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </div>
  )
}

import {Box, Button, Flex, Text} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {DesktopIcon} from '@sanity/icons/Desktop'
import {MobileDeviceIcon} from '@sanity/icons/MobileDevice'
import {TabletDeviceIcon} from '@sanity/icons/TabletDevice'
import {SelectIcon} from '@sanity/icons/Select'
import {ExpandIcon} from '@sanity/icons/Expand'
import {CollapseIcon} from '@sanity/icons/Collapse'
import {RefreshIcon} from '@sanity/icons/Refresh'
import {useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react'
import {useClient, type DocumentLayoutProps} from 'sanity'
import {useDocumentPane} from 'sanity/structure'
import styled from 'styled-components'
import {buildPreviewContent, type PreviewDocument} from '../../src/lib/preview/content'
import {DEVICE_PRESETS, previewViewport, type PreviewMode} from '../../src/lib/preview/viewport'
import {MIN_EDITOR_WIDTH, MIN_PREVIEW_WIDTH, PREVIEW_SPLIT_KEY, readSplitRatio, splitWidth} from '../../src/lib/preview/split'
import {PREVIEW_CHANNEL, isPreviewMessage, isTrustedPreviewEvent} from '../../src/lib/preview/protocol'

const FitWidthIcon = styled(SelectIcon)`
  transform: rotate(90deg);
`

const Root = styled.div<{$split: boolean}>`
  display: grid;
  grid-template-columns: ${({$split}) => $split ? 'var(--preview-editor-width, 50%) minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  position: relative;
  isolation: isolate;
  &[data-resizing] { cursor: col-resize; user-select: none; }
  &[data-resizing] iframe { pointer-events: none; }
  &[data-resizing]::after { content: ''; position: absolute; inset: 0; z-index: 8; cursor: col-resize; }
`

const Divider = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--preview-editor-width) - 4px);
  width: 9px;
  z-index: 9;
  cursor: col-resize;
  touch-action: none;
  outline: none;
  &::after {
    content: '';
    position: absolute;
    inset: 0 3px;
    background: transparent;
  }
  &:hover::after, &:focus-visible::after, &[data-dragging]::after {
    background: var(--card-focus-ring-color, #556bfc);
  }
`

const Editor = styled.div`
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`

const Preview = styled.aside<{$expanded: boolean}>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--card-border-color, #e3e3e3);
  background: var(--card-bg-color, white);
  ${({$expanded}) => $expanded && 'position: absolute; inset: 0; z-index: 20;'}
`

const Toolbar = styled(Flex)`
  box-sizing: border-box;
  height: var(--preview-toolbar-height, auto);
  border-bottom: 1px solid var(--card-border-color, #e3e3e3);
  flex-shrink: 0;
  flex-wrap: nowrap;
`

const Stage = styled.div<{$device: boolean}>`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background: ${({$device}) => $device ? 'var(--card-code-bg-color, #f1f1f1)' : 'var(--card-bg-color, white)'};
`

const DeviceCaption = styled(Flex)`
  position: absolute;
  top: 16px;
  left: 8px;
  right: 8px;
  color: var(--card-muted-fg-color, #6b6b76);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
`

const ViewportFrame = styled.div<{$device: boolean}>`
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
  background: white;
  border: ${({$device}) => $device ? '1px solid var(--card-border-color, #c6c6cb)' : '0'};
  border-radius: ${({$device}) => $device ? '3px' : '0'};
  box-shadow: ${({$device}) => $device ? '0 2px 8px rgb(0 0 0 / 8%)' : 'none'};
  iframe { position: absolute; top: 0; left: 0; border: 0; max-width: none; max-height: none; transform-origin: top left; background: white; }
`

const projectQuery = '*[_type in ["homePage", "project"]]{_id,_type,headline,projects,title,shortTitle,slug,summary,description,scope,cover,gallery,relatedProjects}'

function WebsitePreview({documentId, documentType, expanded, setExpanded}: {documentId: string; documentType: string; expanded: boolean; setExpanded: (expanded: boolean) => void}) {
  const client = useClient({apiVersion: '2026-09-04'})
  const {displayed} = useDocumentPane()
  const [documents, setDocuments] = useState<PreviewDocument[]>([])
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [mode, setMode] = useState<PreviewMode>('auto')
  const [reload, setReload] = useState(0)
  const iframe = useRef<HTMLIFrameElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({width: 0, height: 0})
  const [session] = useState(() => crypto.randomUUID())
  const config = client.config()
  const websiteUrl = process.env.SANITY_STUDIO_PREVIEW_URL || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:4321' : 'https://studio-schatzi-site.fragrant-buffer.workers.dev')
  const websiteOrigin = new URL(websiteUrl).origin
  const src = `${websiteOrigin}/cms-preview/${documentType === 'homePage' ? 'home' : 'project'}/?reload=${reload}`
  const current = displayed ? {...displayed, _id: documentId, _type: documentType} as PreviewDocument : null
  const content = useMemo(() => buildPreviewContent(documents, current, config.projectId!, config.dataset!), [documents, displayed, documentId, documentType, config.projectId, config.dataset])
  const slugValue = displayed?.slug as {current?: string} | undefined
  const slug = slugValue?.current || `draft-${documentId.replace(/^drafts\./, '')}`
  const latest = useRef({content, slug})
  latest.current = {content, slug}

  useEffect(() => {
    let active = true
    let refresh: ReturnType<typeof setTimeout>
    let sequence = 0
    const fetch = async () => {
      const request = ++sequence
      try {
        const next = await client.fetch<PreviewDocument[]>(projectQuery, {}, {perspective: 'raw'})
        if (active && request === sequence) {setDocuments(next); setError('')}
      } catch {if (active) setError('Inhalte konnten nicht geladen werden.')}
    }
    void fetch()
    const subscription = client.listen(projectQuery, {}, {includeResult: false, visibility: 'query'}).subscribe({
      next: () => {clearTimeout(refresh); refresh = setTimeout(fetch, 250)},
      error: () => {if (active) setError('Live-Verbindung unterbrochen. Preview neu laden.')},
    })
    return () => {active = false; clearTimeout(refresh); subscription.unsubscribe()}
  }, [client, reload])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({width: entry.contentRect.width, height: entry.contentRect.height}))
    if (stage.current) observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setConnected(false)
    setConnectionFailed(false)
    const timeout = setTimeout(() => setConnectionFailed(true), 10000)
    const send = () => iframe.current?.contentWindow?.postMessage({channel: PREVIEW_CHANNEL, type: 'connect', session}, websiteOrigin)
    const receive = (event: MessageEvent) => {
      if (!isTrustedPreviewEvent(event, iframe.current?.contentWindow, [websiteOrigin]) || !isPreviewMessage(event.data) || event.data.session !== session) return
      if (event.data.type === 'error') setError('Preview konnte nicht aktualisiert werden. Bitte neu laden.')
      if (event.data.type === 'rendered') setError('')
      if (event.data.type === 'ready') {
        clearTimeout(timeout)
        setConnectionFailed(false)
        setConnected(true)
        iframe.current?.contentWindow?.postMessage({channel: PREVIEW_CHANNEL, type: 'content', session, ...latest.current}, websiteOrigin)
      }
    }
    window.addEventListener('message', receive)
    const interval = setInterval(send, 1000)
    send()
    return () => {clearTimeout(timeout); clearInterval(interval); window.removeEventListener('message', receive)}
  }, [websiteOrigin, session, reload])

  useEffect(() => {
    if (connected) iframe.current?.contentWindow?.postMessage({channel: PREVIEW_CHANNEL, type: 'content', session, content, slug}, websiteOrigin)
  }, [content, slug, connected, websiteOrigin, session])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') setExpanded(false)}
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])

  const device = mode !== 'auto'
  const viewport = previewViewport(mode, size)
  return <Preview $expanded={expanded} aria-label="Website Preview">
    <Toolbar align="center" gap={1} paddingX={2} paddingY={3}>
      <Box flex={1} paddingX={2}><Text size={1} weight="medium">Preview</Text></Box>
      {[
        {label: 'Auto', description: 'An Spaltenbreite anpassen', icon: FitWidthIcon, pressed: mode === 'auto', onClick: () => setMode('auto')},
        {label: 'Mobil', description: 'Mobil · Feste Breite: 390 px', icon: MobileDeviceIcon, pressed: mode === 'mobile', onClick: () => setMode('mobile')},
        {label: 'Tablet', description: 'Tablet · Feste Breite: 768 px', icon: TabletDeviceIcon, pressed: mode === 'tablet', onClick: () => setMode('tablet')},
        {label: 'Desktop', description: 'Desktop · Feste Breite: 1280 px', icon: DesktopIcon, pressed: mode === 'desktop', onClick: () => setMode('desktop')},
        {label: expanded ? 'Verkleinern' : 'Vergrößern', icon: expanded ? CollapseIcon : ExpandIcon, pressed: expanded, onClick: () => setExpanded(!expanded)},
        {label: 'Neu laden', icon: RefreshIcon, onClick: () => setReload(reload + 1)},
      ].map(({label, description, icon, pressed, onClick}) => (
        <Tooltip key={label} content={<Text size={1}>{description || label}</Text>} placement="bottom" portal delay={{open: 400, close: 0}}>
          <Button fontSize={1} padding={2} mode={pressed ? 'default' : 'bleed'} icon={icon} aria-label={label} aria-pressed={pressed} onClick={onClick} />
        </Tooltip>
      ))}
    </Toolbar>
    {(error || !connected) && <Box padding={3}><Text size={1} role="status">{error || (connectionFailed ? 'Preview nicht erreichbar. Bitte neu laden.' : 'Website wird verbunden …')}</Text></Box>}
    <Stage ref={stage} $device={device}>
      {device && <DeviceCaption justify="center" aria-label="Simulierter Viewport">
        <Text size={1}>{DEVICE_PRESETS[mode].label} · {viewport.width} px · {Math.round(viewport.scale * 100)}%</Text>
      </DeviceCaption>}
      <ViewportFrame $device={device} data-preview-mode={mode}
        style={{width: viewport.frameWidth, height: viewport.frameHeight, top: viewport.top, left: viewport.left}}>
        <iframe ref={iframe} title="Website Preview" sandbox="allow-scripts allow-same-origin" src={src} onLoad={() => setConnected(false)}
          style={{width: viewport.width, height: viewport.height, transform: `scale(${viewport.scale})`}} />
      </ViewportFrame>
    </Stage>
  </Preview>
}

function SplitDocumentLayout(props: DocumentLayoutProps) {
  const root = useRef<HTMLDivElement>(null)
  const editor = useRef<HTMLDivElement>(null)
  const divider = useRef<HTMLDivElement>(null)
  const editorId = useId()
  const [size, setSize] = useState({width: 0, viewport: 0})
  const [expanded, setExpanded] = useState(false)
  const [ratio, setRatio] = useState(() => {
    try {return readSplitRatio(localStorage.getItem(PREVIEW_SPLIT_KEY))} catch {return 0.5}
  })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{pointerId: number; startX: number; startWidth: number; startRatio: number; latest: number} | null>(null)
  const wide = size.width >= 800 && size.viewport >= 1000
  const editorWidth = splitWidth(size.width, ratio)
  const save = (next: number) => {
    setRatio(next)
    try {localStorage.setItem(PREVIEW_SPLIT_KEY, String(next))} catch { /* Resizing also works without browser storage. */ }
  }
  const finishDrag = (cancel = false) => {
    const current = drag.current
    if (!current) return
    drag.current = null
    setDragging(false)
    if (cancel) setRatio(current.startRatio)
    else save(current.latest)
    if (divider.current?.hasPointerCapture(current.pointerId)) divider.current.releasePointerCapture(current.pointerId)
  }
  useEffect(() => {
    const measure = () => setSize({width: root.current?.getBoundingClientRect().width || 0, viewport: window.innerWidth})
    const observer = new ResizeObserver(measure)
    if (root.current) observer.observe(root.current)
    window.addEventListener('resize', measure)
    measure()
    return () => {observer.disconnect(); window.removeEventListener('resize', measure)}
  }, [])
  useEffect(() => {if (!wide || expanded) finishDrag(true)}, [wide, expanded])

  useLayoutEffect(() => {
    const container = editor.current
    const layout = root.current
    if (!container || !layout) return
    let header: HTMLElement | null = null
    const measure = () => {
      const height = header?.getBoundingClientRect().height
      if (height) layout.style.setProperty('--preview-toolbar-height', `${height}px`)
    }
    const resize = new ResizeObserver(measure)
    const bindHeader = () => {
      // Sanity's action card includes its bottom border. Mirror its measured
      // size so browser font metrics, presence avatars and zoom cannot drift.
      const next = container.querySelector<HTMLElement>('[data-testid="document-pane"] > [data-ui="Flex"] > [data-ui="Card"]:first-child')
      if (next === header) return
      resize.disconnect()
      header = next
      if (header) {resize.observe(header); measure()}
      else layout.style.removeProperty('--preview-toolbar-height')
    }
    const mutations = new MutationObserver(bindHeader)
    mutations.observe(container, {childList: true, subtree: true})
    bindHeader()
    return () => {
      resize.disconnect()
      mutations.disconnect()
      layout.style.removeProperty('--preview-toolbar-height')
    }
  }, [])

  return <Root ref={root} $split={wide} data-resizing={dragging || undefined}
    style={{'--preview-editor-width': `${editorWidth}px`} as React.CSSProperties}>
    <Editor ref={editor} id={editorId} inert={wide && expanded}>{props.renderDefault(props)}</Editor>
    {wide && !expanded && <Divider ref={divider} role="separator" tabIndex={0} aria-orientation="vertical"
      aria-label="Breite von Editor und Preview" aria-controls={editorId}
      aria-valuemin={Math.round(MIN_EDITOR_WIDTH / size.width * 100)}
      aria-valuemax={Math.round((size.width - MIN_PREVIEW_WIDTH) / size.width * 100)}
      aria-valuenow={Math.round(editorWidth / size.width * 100)}
      aria-valuetext={`Editor ${Math.round(editorWidth / size.width * 100)} Prozent`}
      title="Ziehen zum Anpassen · Doppelklick für gleiche Breite"
      data-dragging={dragging || undefined}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {pointerId: event.pointerId, startX: event.clientX, startWidth: editorWidth, startRatio: ratio, latest: ratio}
        setDragging(true)
      }}
      onPointerMove={(event) => {
        const current = drag.current
        if (!current || current.pointerId !== event.pointerId) return
        const width = root.current?.getBoundingClientRect().width || size.width
        current.latest = splitWidth(width, (current.startWidth + event.clientX - current.startX) / width) / width
        setRatio(current.latest)
      }}
      onPointerUp={(event) => {if (event.pointerId === drag.current?.pointerId) finishDrag()}}
      onPointerCancel={() => finishDrag(true)}
      onLostPointerCapture={() => finishDrag(true)}
      onDoubleClick={() => save(0.5)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {finishDrag(true); return}
        if (drag.current) return
        let next = editorWidth / size.width
        const step = event.shiftKey ? 0.1 : 0.02
        if (event.key === 'ArrowLeft') next -= step
        else if (event.key === 'ArrowRight') next += step
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = 1
        else if (event.key === 'Enter') next = 0.5
        else return
        event.preventDefault()
        save(splitWidth(size.width, next) / size.width)
      }} />}
    {wide && <WebsitePreview key={props.documentId} documentId={props.documentId} documentType={props.documentType} expanded={expanded} setExpanded={setExpanded} />}
  </Root>
}

export function WebsitePreviewLayout(props: DocumentLayoutProps) {
  return props.documentType === 'homePage' || props.documentType === 'project'
    ? <SplitDocumentLayout {...props} /> : props.renderDefault(props)
}

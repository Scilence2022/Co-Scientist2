import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'node:path'
import { ENGINE_EVENT_CHANNEL, type EngineEvent } from '@shared/ipc'
import { Engine } from './engine/Engine'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let engine: Engine | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#11161d',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function emitEngineEvent(event: EngineEvent): void {
  mainWindow?.webContents.send(ENGINE_EVENT_CHANNEL, event)
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark'
  engine = new Engine(emitEngineEvent)
  registerIpc(engine)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async (e) => {
  if (engine) {
    e.preventDefault()
    const toClose = engine
    engine = null
    await toClose.shutdown()
    app.quit()
  }
})

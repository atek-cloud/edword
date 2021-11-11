import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createWindow () {
  const win = new BrowserWindow({
    titleBarStyle: 'hidden',
    titleBarOverlay: true
  })

  win.loadFile(join(__dirname, '../frontend/index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
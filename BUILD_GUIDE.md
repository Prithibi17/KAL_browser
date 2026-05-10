# KAL BROWSER: PRODUCTION BUILD & INSTALLER GUIDE

This guide provides the tactical protocols for generating professional, production-ready Windows installers for Kal Browser.

## 1. System Requirements
- **OS**: Windows 10/11 (x64)
- **Node.js**: v18+
- **Privileges**: Administrator (Required for NSIS symbolic link generation)

## 2. Framework Detection & Technology
- **Core Engine**: Electron (Detected)
- **Bundler**: Vite
- **Installer Tech**: NSIS (Nullsoft Scriptable Install System)
- **Target Architecture**: x64 (Optimized)

## 3. Build Protocols (Commands)

### A. Full Production Setup (`.exe`)
Generates a professional installer that allows custom path selection, shows EULA, and registers with Windows Apps & Features.
```powershell
npm run dist
```

### B. Portable Edition (`.exe`)
Generates a standalone tactical executable that runs without installation.
```powershell
npm run dist:portable
```

## 4. Maintenance & Customization

### Changing the Version
Update the `"version"` field in `package.json`. The installer filename will automatically update (e.g., `Kal_Browser_Setup_1.0.1.exe`).

### Changing the App Icon
Replace `public/logo.png`. The build pipeline uses this source to generate icons for the installer, uninstaller, taskbar, and desktop shortcuts.

### Code Signing (Certificate)
To remove the "Unknown Publisher" warning on Windows, you must sign the installer.
1. Obtain a **Windows Code Signing Certificate** (.pfx file).
2. Set environment variables before building:
   ```powershell
   $env:CSC_LINK = "path/to/your/certificate.pfx"
   $env:CSC_KEY_PASSWORD = "your_password"
   ```
3. Run `npm run dist` again.

## 5. Artifact Output
All generated files are located in the `release/` directory:
- `Kal_Browser_Setup_1.0.0.exe` (The Installer)
- `Kal_Browser_Portable_1.0.0.exe` (Standalone)
- `latest.yml` (Auto-updater metadata)

---
**STATUS: PRODUCTION_READY**
**ENCRYPTION: VERIFIED**
**DISTRIBUTION: ACTIVE**

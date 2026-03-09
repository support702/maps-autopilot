# Network Access — Interactive Sales Deck

## ✅ Network Access Enabled

The sales deck app is now accessible from any device on the same network as the Mac mini.

### 🌐 Access URLs

**From Mac mini (local):**
- http://localhost:3001

**From other devices on network:**
- **http://10.0.0.7:3001**

### 📱 Use Cases

#### Sales Calls via Screen Share
- Open http://10.0.0.7:3001/deck/test-001?tier=A on Mac mini
- Share browser window in Zoom
- Navigate with keyboard (← →)

#### Mobile Preview/Control
- Open http://10.0.0.7:3001 on your phone/tablet
- Preview slides remotely
- Test animations on mobile devices

#### Multi-Monitor Setup
- Display deck on external monitor/TV
- Control from laptop/iPad
- Perfect for in-person presentations

### 🔧 Configuration

The Vite dev server is configured in `vite.config.ts`:

```typescript
server: {
  port: 3001,
  host: '0.0.0.0', // Allow network access
}
```

This binds the server to all network interfaces, making it accessible from:
- **localhost** (127.0.0.1)
- **Local network IP** (10.0.0.7)

### 🚀 Starting the Server

**Automatic network access (config saved):**
```bash
cd ~/maps-autopilot/sales-deck-app
npm run dev
```

**Manual override (if needed):**
```bash
npm run dev -- --host 0.0.0.0 --port 3001
```

### 🔒 Security Notes

- **Local network only** — Not accessible from the internet
- **Development server** — Not for production use
- **No authentication** — Anyone on your network can access it
- **Safe for home/office** — Protected by router/firewall

For production deployment, use a proper web server (nginx, Apache) with HTTPS and authentication.

### 🐛 Troubleshooting

**Can't access from phone/tablet:**
1. Verify both devices are on the same Wi-Fi network
2. Check Mac mini firewall settings (System Settings → Network → Firewall)
3. Try pinging the Mac mini: `ping 10.0.0.7`

**Connection refused:**
1. Verify server is running: `ps aux | grep vite`
2. Check it's bound to 0.0.0.0: Look for "Network: http://10.0.0.7:3001/" in startup logs

**Firewall blocking access:**
```bash
# Allow incoming connections on port 3001 (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

### 📊 Current Status

- ✅ Server running on port 3001
- ✅ Bound to 0.0.0.0 (all network interfaces)
- ✅ Accessible at http://10.0.0.7:3001
- ✅ Config saved in vite.config.ts (permanent)

---

**Test it now:**
- From Mac mini: http://localhost:3001
- From phone/tablet: http://10.0.0.7:3001
- From another computer: http://10.0.0.7:3001

All devices will see the same interactive sales deck with animations!

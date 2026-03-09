# Maps Autopilot — Interactive Sales Deck

Full-screen React presentation app for sales calls. Replaces PowerPoint with an interactive, animated deck that reps screen-share on Zoom.

## 🚀 Quick Start

```bash
npm run dev
```

**Access at:** http://localhost:3001

## 📋 What's Built

### **11-Slide Sales Presentation**

1. **Hook** - "Is Google Maps stealing or sending you money?"
2. **Maps Pack** - Mock Google Maps with competitor cards + prospect position
3. **Money Math** - Animated lost revenue calculator with counters
4. **Phase 1** - 90-Day Maps Domination Sprint (4 feature cards)
5. **Phase 2** - Monthly Maps Autopilot features
6. **Proof** - Results showcase + pricing preview
7. **Guarantee** - Conditional based on market tier:
   - **7A** - Tier A guarantee (Top 3 in 90 days)
   - **7B** - Tier B soft guarantee
   - **7C** - Tier C Premium (no guarantee)
8. **Territory Lock** - Animated radar/exclusivity map
9. **Pricing** - Box A vs Box B comparison (Waived Fee close)
10. **Next 7 Days** - Onboarding timeline
11. **End** - Logo + CTA

### **Money Snapshot Page**

PDF-ready 1-page prospect pain document at `/snapshot/{audit_id}`
- Current Maps position vs top 3 competitors
- Review gap analysis
- Lost revenue calculation
- Investment comparison

## 🎨 Design System

- **Theme:** Dark glassmorphism
- **Background:** Navy/black gradient (#0A0A0B → #1A1A2E)
- **Glass cards:** `rgba(255,255,255,0.05)` with backdrop blur
- **Accent colors:**
  - Red: `#E63946` (urgency, lost revenue)
  - Green: `#2ECC71` (growth, success)
  - Gold: `#F1C40F` (stars, highlights)
  - Teal: `#0F9D9A` (secondary accent)
- **Typography:**
  - Headers: Bold sans-serif
  - Numbers: Monospace
  - Body: Clean sans-serif

## ⌨️ Keyboard Navigation

- **← / →** - Previous/Next slide
- **Spacebar** - Next slide
- **Home** - First slide
- **End** - Last slide

## 🔗 Routes

- **`/`** - Deck with sample data (Hail Dent Pro)
- **`/deck/:auditId`** - Deck with specific audit data
- **`/deck/:auditId?tier=A|B|C`** - Deck with tier-specific guarantee slide
- **`/snapshot/:auditId`** - Money Snapshot page (PDF-ready)

## 📊 Sample Data (Hail Dent Professional)

```json
{
  "audit_id": "test-001",
  "prospect_name": "Hail Dent Professional",
  "prospect_city": "Dallas",
  "prospect_state": "TX",
  "niche_label": "auto hail repair shop",
  "prospect_rank": "#8",
  "prospect_reviews": "34",
  "prospect_rating": "4.7",
  "comp1_name": "Dallas Dent Repair",
  "comp1_reviews": "187",
  "comp1_rating": "4.8",
  "comp2_name": "Hail Heroes PDR",
  "comp2_reviews": "142",
  "comp2_rating": "4.7",
  "comp3_name": "Texas Dent Pro",
  "comp3_reviews": "98",
  "comp3_rating": "4.5",
  "review_gap": "153",
  "missed_calls": "35",
  "avg_ticket": "450",
  "lost_monthly": "15,750",
  "lost_annual": "189,000",
  "monthly_price": "500",
  "setup_fee": "1,500",
  "market_tier": "A"
}
```

## 🎬 Animations

- **Number counters:** Count from 0 to target (200-400ms fast)
- **Cards:** Slide in from bottom with stagger
- **Text:** Smooth fade-in on headlines
- **Transitions:** Page transitions with fade (300ms)
- **Components:**
  - `<AnimatedCounter>` - Counting number effect
  - `<SlideTransition>` - Fade-in wrapper for slides
  - `<GlassCard>` - Glassmorphism card component
  - `<ProgressBar>` - Slide progress indicator

## 🏗️ Tech Stack

- **React 18** - UI framework
- **Vite 7** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Framer Motion 12** - Animations
- **React Router 7** - Routing
- **Lucide React** - Icons

## 📁 Project Structure

```
sales-deck-app/
├── src/
│   ├── slides/              # 11 slide components
│   │   ├── Slide01Hook.tsx
│   │   ├── Slide02MapsPack.tsx
│   │   ├── Slide03MoneyMath.tsx
│   │   ├── Slide04Phase1.tsx
│   │   ├── Slide05Phase2.tsx
│   │   ├── Slide06Proof.tsx
│   │   ├── Slide07Guarantee.tsx
│   │   ├── Slide08Territory.tsx
│   │   ├── Slide09Pricing.tsx
│   │   ├── Slide10NextDays.tsx
│   │   └── Slide11End.tsx
│   ├── pages/               # Route pages
│   │   ├── DeckPage.tsx     # Main presentation
│   │   └── SnapshotPage.tsx # Money Snapshot (PDF-ready)
│   ├── components/          # Reusable UI components
│   │   ├── AnimatedCounter.tsx
│   │   ├── GlassCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── SlideTransition.tsx
│   ├── data/
│   │   └── sampleData.ts    # Hail Dent Pro test data
│   ├── App.tsx              # Router config
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── package.json
├── vite.config.ts           # Port 3001 config
└── tsconfig.json
```

## 🔌 API Integration (Future)

To connect to real audit data from WF12:

1. **Create API endpoint** in `src/api/`:
   ```typescript
   export async function fetchAuditData(auditId: string) {
     const res = await fetch(`/api/deck/${auditId}`);
     return res.json();
   }
   ```

2. **Update DeckPage.tsx**:
   ```typescript
   const { auditId } = useParams();
   const [data, setData] = useState(null);
   
   useEffect(() => {
     if (auditId !== 'test-001') {
       fetchAuditData(auditId).then(setData);
     }
   }, [auditId]);
   ```

3. **Backend endpoint** (add to existing Express server or create new):
   ```typescript
   app.get('/api/deck/:auditId', async (req, res) => {
     const audit = await db.query(
       'SELECT * FROM prospect_audits WHERE audit_id = $1',
       [req.params.auditId]
     );
     res.json(audit.rows[0]);
   });
   ```

## 📤 PDF Export (Future)

To enable PDF export of Money Snapshot:

1. **Install Puppeteer:**
   ```bash
   npm install puppeteer
   ```

2. **Create export script:**
   ```typescript
   import puppeteer from 'puppeteer';
   
   export async function exportSnapshot(auditId: string) {
     const browser = await puppeteer.launch();
     const page = await browser.newPage();
     await page.goto(`http://localhost:3001/snapshot/${auditId}`);
     await page.pdf({
       path: `snapshots/${auditId}.pdf`,
       format: 'Letter',
       printBackground: true
     });
     await browser.close();
   }
   ```

## 🎯 Usage in Sales Calls

### Pre-Call Setup (15 min before)
1. Open http://localhost:3001/deck/{audit_id}?tier={A|B|C}
2. Press F11 for fullscreen (or ⌘+Ctrl+F on Mac)
3. Test keyboard navigation (← →)
4. Keep tab open, minimize until call

### During Call (Zoom screen share)
1. Share browser window (not desktop - cleaner)
2. Navigate with → arrow as you talk through slides
3. Pause on Slide 3 (Money Math) - let numbers animate
4. Adjust guarantee slide based on tier parameter
5. Close on Slide 9 (Pricing) - state price, hit spacebar for next slide, shut up for 8 seconds

### Post-Call
- Money Snapshot auto-sent via GHL nurture (WF12 sets `money_snapshot_url`)
- Rep has access to full deck for follow-up

## 🐛 Troubleshooting

### Port 3001 already in use
```bash
# Kill existing processes
pkill -f "sales-deck-app.*vite"

# Restart
npm run dev
```

### Animations not working
- Clear browser cache (Cmd+Shift+R)
- Check console for Framer Motion errors
- Verify React 18+ is installed

### Slides not navigating
- Check `DeckPage.tsx` keyboard event listeners
- Verify all 11 slide imports are correct
- Test with browser DevTools console

## 📝 Development

### Add a new slide
1. Create `src/slides/Slide12NewSlide.tsx`
2. Import in `src/pages/DeckPage.tsx`
3. Add to slides array
4. Update `TOTAL_SLIDES` constant

### Modify animations
- Edit timing in `src/components/SlideTransition.tsx`
- Adjust Framer Motion `transition` props in slide components
- Update `AnimatedCounter` duration prop (default 1.5s)

### Change color scheme
- Update CSS variables in `src/index.css`
- Modify Tailwind config for custom colors
- Search/replace hex codes in components

## 🚢 Deployment (VPS)

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Copy dist/ to VPS:**
   ```bash
   scp -r dist/* root@147.182.235.147:/var/www/sales-deck/
   ```

3. **Nginx config:**
   ```nginx
   server {
     listen 3001;
     server_name 147.182.235.147;
     root /var/www/sales-deck;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

4. **Reload nginx:**
   ```bash
   ssh root@147.182.235.147 'nginx -s reload'
   ```

## 📞 Support

Built for **Maps Autopilot** by OpenClaw (Titan)
- Project: `/Users/titanbot/maps-autopilot/sales-deck-app/`
- Spec reference: Uploaded sales playbooks + guarantee docs
- Sample data: Hail Dent Professional (Dallas, TX)

---

**Status:** ✅ COMPLETE
- All 11 slides implemented with animations
- Money Snapshot page PDF-ready
- Glassmorphism design system applied
- Keyboard navigation working
- Sample data loaded and tested
- Running on http://localhost:3001

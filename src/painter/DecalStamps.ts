import { DecalItem } from '../types/router';

export const PRESET_DECALS: DecalItem[] = [
  {
    id: 'wifi6',
    name: 'Wi-Fi 6 Logo',
    category: 'icon',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 80 a10 10 0 1 0 0 -20 a10 10 0 0 0 0 20" fill="#ffffff"/>
      <path d="M25 50 A35 35 0 0 1 75 50" stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M10 32 A55 55 0 0 1 90 32" stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round"/>
      <text x="50" y="96" font-family="monospace" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">WiFi 6</text>
    </svg>`
  },
  {
    id: 'gigabit',
    name: '1000M Gigabit',
    category: 'label',
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <text x="60" y="26" font-family="sans-serif" font-size="16" font-weight="900" fill="#38bdf8" text-anchor="middle">1000 BASE-T</text>
    </svg>`
  },
  {
    id: '10g_sfp',
    name: '10G SFP+ Link',
    category: 'label',
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" rx="4" fill="#1e293b" stroke="#eab308" stroke-width="2"/>
      <text x="60" y="26" font-family="sans-serif" font-size="17" font-weight="bold" fill="#eab308" text-anchor="middle">10G SFP+</text>
    </svg>`
  },
  {
    id: 'qsfp100',
    name: '100G QSFP28',
    category: 'label',
    svg: `<svg viewBox="0 0 130 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="40" rx="4" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
      <text x="65" y="26" font-family="sans-serif" font-size="16" font-weight="900" fill="#a5b4fc" text-anchor="middle">100G QSFP28</text>
    </svg>`
  },
  {
    id: 'vendor_cisco',
    name: 'Router Enterprise Logo',
    category: 'logo',
    svg: `<svg viewBox="0 0 140 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 35 L20 15 M30 35 L30 10 M40 35 L40 18 M50 35 L50 22 M60 35 L60 10 M70 35 L70 15" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <text x="105" y="32" font-family="sans-serif" font-size="20" font-weight="900" fill="#f8fafc" text-anchor="middle">NETSYS</text>
    </svg>`
  },
  {
    id: 'vendor_mikro',
    name: 'Carrier Router Logo',
    category: 'logo',
    svg: `<svg viewBox="0 0 130 45" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="45" rx="6" fill="#0284c7"/>
      <text x="65" y="30" font-family="monospace" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">RouterOS</text>
    </svg>`
  },
  {
    id: 'barcode_sticker',
    name: 'Serial & MAC Sticker',
    category: 'label',
    svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="70" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="15" y="10" width="3" height="30" fill="#000000"/>
      <rect x="22" y="10" width="6" height="30" fill="#000000"/>
      <rect x="32" y="10" width="2" height="30" fill="#000000"/>
      <rect x="38" y="10" width="5" height="30" fill="#000000"/>
      <rect x="47" y="10" width="3" height="30" fill="#000000"/>
      <rect x="54" y="10" width="7" height="30" fill="#000000"/>
      <rect x="65" y="10" width="3" height="30" fill="#000000"/>
      <rect x="72" y="10" width="5" height="30" fill="#000000"/>
      <rect x="81" y="10" width="4" height="30" fill="#000000"/>
      <rect x="89" y="10" width="2" height="30" fill="#000000"/>
      <rect x="95" y="10" width="6" height="30" fill="#000000"/>
      <rect x="105" y="10" width="4" height="30" fill="#000000"/>
      <rect x="113" y="10" width="3" height="30" fill="#000000"/>
      <rect x="120" y="10" width="5" height="30" fill="#000000"/>
      <rect x="129" y="10" width="4" height="30" fill="#000000"/>
      <rect x="137" y="10" width="8" height="30" fill="#000000"/>
      <text x="80" y="52" font-family="monospace" font-size="10" fill="#000000" text-anchor="middle">S/N: 94-8F-1B-4C-02-FF</text>
      <text x="80" y="64" font-family="monospace" font-size="9" fill="#475569" text-anchor="middle">MAC: E4:5F:01:23:AA:89</text>
    </svg>`
  },
  {
    id: 'power_12v',
    name: '12V DC In Label',
    category: 'label',
    svg: `<svg viewBox="0 0 100 35" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="35" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
      <text x="50" y="23" font-family="monospace" font-size="14" font-weight="bold" fill="#f8fafc" text-anchor="middle">12V ⎓ 2.5A</text>
    </svg>`
  },
  {
    id: 'reset_btn',
    name: 'RESET Hole Label',
    category: 'label',
    svg: `<svg viewBox="0 0 70 25" xmlns="http://www.w3.org/2000/svg">
      <text x="35" y="17" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ef4444" text-anchor="middle">RESET</text>
    </svg>`
  },
  {
    id: 'wan_port_label',
    name: 'WAN (INTERNET)',
    category: 'port',
    svg: `<svg viewBox="0 0 70 25" xmlns="http://www.w3.org/2000/svg">
      <rect width="70" height="25" rx="3" fill="#0284c7"/>
      <text x="35" y="17" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">WAN</text>
    </svg>`
  },
  {
    id: 'lan_port_label',
    name: 'LAN 1-4',
    category: 'port',
    svg: `<svg viewBox="0 0 70 25" xmlns="http://www.w3.org/2000/svg">
      <rect width="70" height="25" rx="3" fill="#eab308"/>
      <text x="35" y="17" font-family="sans-serif" font-size="11" font-weight="bold" fill="#000000" text-anchor="middle">LAN 1-4</text>
    </svg>`
  },
  {
    id: 'warning_ground',
    name: 'Warning Ground',
    category: 'icon',
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <polygon points="25,5 45,45 5,45" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
      <text x="25" y="40" font-family="sans-serif" font-size="28" font-weight="900" fill="#000000" text-anchor="middle">!</text>
    </svg>`
  }
];

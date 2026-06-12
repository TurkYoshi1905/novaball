const RP_KEY = "novaball_rp";

export interface RankTier {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  icon: string;
  description: string;
  benefit: string;
}

export interface RankLevel {
  id: string;
  fullName: string;
  tier: RankTier;
  level: number;
  minRP: number;
  maxRP: number | null;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: "demir",
    name: "Demir",
    color: "#8B96A0",
    glowColor: "rgba(139,150,160,0.4)",
    icon: "⚙️",
    description: "Oyunun temel mekaniklerini öğrendiğiniz başlangıç seviyesi. Her büyük oyuncu buradan başladı.",
    benefit: "Temel hareket ve şut pratiği için ideal ortam.",
  },
  {
    id: "bronz",
    name: "Bronz",
    color: "#CD7F32",
    glowColor: "rgba(205,127,50,0.4)",
    icon: "🥉",
    description: "Kontroller artık elinize oturmuş. Rakiplerle ilk ciddi çarpışmalar bu kademede yaşanır.",
    benefit: "Çarpışma ve top hakimiyeti becerilerini geliştirir.",
  },
  {
    id: "gumus",
    name: "Gümüş",
    color: "#C0C0C0",
    glowColor: "rgba(192,192,192,0.4)",
    icon: "🥈",
    description: "Orta seviye oyuncu. Top kontrolü ve şut tekniği belirginleşmeye başlar.",
    benefit: "Pozisyon oyunu ve alan okuma geliştirme fırsatı.",
  },
  {
    id: "altin",
    name: "Altın",
    color: "#FFD700",
    glowColor: "rgba(255,215,0,0.4)",
    icon: "🥇",
    description: "İyi bir oyuncu seviyesi. Stratejik düşünme ve saha anlayışı kritik hale gelir.",
    benefit: "Rekabetçi oyunculara karşı stratejik düşünme gelişir.",
  },
  {
    id: "platin",
    name: "Platin",
    color: "#00CED1",
    glowColor: "rgba(0,206,209,0.4)",
    icon: "💠",
    description: "Üst seviye oyuncular. Gelişmiş teknikler, depar zamanlaması ve alan kontrolü kritiktir.",
    benefit: "İleri düzey oyun anlayışı ve pozisyon optimizasyonu.",
  },
  {
    id: "elmas",
    name: "Elmas",
    color: "#5BE9FF",
    glowColor: "rgba(91,233,255,0.4)",
    icon: "💎",
    description: "Elit seviye. Sahadaki her hareketi önceden hesaplayan, hata oranı son derece düşük oyuncular.",
    benefit: "En zorlu rakiplerle karşılaşma ve mekaniklerin mükemmelleşmesi.",
  },
  {
    id: "usta",
    name: "Usta",
    color: "#FF6B35",
    glowColor: "rgba(255,107,53,0.4)",
    icon: "🏆",
    description: "NovaBall'un zirvesi. Bu ranka ulaşanlar oyunun gerçek ustalarıdır. Büyük saygınlık taşır.",
    benefit: "Seçkin bir topluluğun parçası olma ve oyunun efendisi statüsü.",
  },
];

// Her tier için alt ranklar oluştur (Usta hariç tek seviye)
function buildRanks(): RankLevel[] {
  const thresholds: [string, number[]][] = [
    ["demir",  [0,   100, 200]],
    ["bronz",  [300, 450, 600]],
    ["gumus",  [750, 1000, 1250]],
    ["altin",  [1500, 1800, 2100]],
    ["platin", [2400, 2800, 3200]],
    ["elmas",  [3600, 4100, 4600]],
    ["usta",   [5200]],
  ];

  const ranks: RankLevel[] = [];

  for (const [tierId, mins] of thresholds) {
    const tier = RANK_TIERS.find(t => t.id === tierId)!;
    if (tierId === "usta") {
      ranks.push({ id: "usta", fullName: "Usta", tier, level: 1, minRP: mins[0], maxRP: null });
    } else {
      for (let i = 0; i < 3; i++) {
        const maxRP = i < 2 ? mins[i + 1] - 1 : (thresholds.find(([id]) => id === nextTierId(tierId))![1][0] - 1);
        ranks.push({
          id: `${tierId}_${i + 1}`,
          fullName: `${tier.name} ${i + 1}`,
          tier,
          level: i + 1,
          minRP: mins[i],
          maxRP,
        });
      }
    }
  }

  return ranks;
}

function nextTierId(id: string): string {
  const order = ["demir","bronz","gumus","altin","platin","elmas","usta"];
  return order[order.indexOf(id) + 1] ?? "usta";
}

export const ALL_RANKS: RankLevel[] = buildRanks();

export function getRankForRP(rp: number): RankLevel {
  for (let i = ALL_RANKS.length - 1; i >= 0; i--) {
    if (rp >= ALL_RANKS[i].minRP) return ALL_RANKS[i];
  }
  return ALL_RANKS[0];
}

export function getNextRank(rp: number): RankLevel | null {
  const current = getRankForRP(rp);
  const idx = ALL_RANKS.indexOf(current);
  return idx < ALL_RANKS.length - 1 ? ALL_RANKS[idx + 1] : null;
}

export function getRPProgressInRank(rp: number): { current: number; total: number; percent: number } {
  const rank = getRankForRP(rp);
  const inRank = rp - rank.minRP;
  const total  = rank.maxRP !== null ? rank.maxRP - rank.minRP + 1 : 999;
  return { current: inRank, total, percent: Math.min(1, inRank / total) };
}

export function calcRPForWin(playerGoals: number): number {
  if (playerGoals <= 0) return 0;
  if (playerGoals === 1) return 10;
  if (playerGoals === 2) return 14;
  if (playerGoals === 3) return 18;
  if (playerGoals === 4) return 22;
  return 25;
}

export function loadRP(): number {
  const raw = localStorage.getItem(RP_KEY);
  const n   = parseInt(raw ?? "0", 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

export function saveRP(rp: number): void {
  localStorage.setItem(RP_KEY, String(Math.max(0, rp)));
}

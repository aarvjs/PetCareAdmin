/**
 * Veterinary Vaccination Protocol & Dose Tracking Knowledge Base
 * Healthy Paws Pet Clinic
 *
 * Implements authoritative veterinary dose calculation, series tracking,
 * and annual booster scheduling.
 */

export interface VaccineProtocol {
  name: string;
  aliases: string[];
  species: 'Dog' | 'Cat' | 'All';
  defaultBrand: string;
  totalDosesSeries: number;
  seriesIntervalDays: number;
  boosterIntervalDays: number;
  description: string;
}

export const KNOWN_VACCINE_PROTOCOLS: VaccineProtocol[] = [
  {
    name: 'Vaccination (9 in 1)',
    aliases: ['9 in 1', '9-in-1', 'dhppil', 'dhppi', 'mega-vac 9', 'megavac 9', 'nobivac dhppi', 'vanguard plus 5', 'canigen dhppi', '9in1'],
    species: 'Dog',
    defaultBrand: 'Nobivac',
    totalDosesSeries: 3,
    seriesIntervalDays: 21,
    boosterIntervalDays: 365,
    description: 'Core DHPPIL immunization against Distemper, Hepatitis, Parvovirus, Parainfluenza, and Leptospirosis.',
  },
  {
    name: 'Vaccination (7 in 1)',
    aliases: ['7 in 1', '7-in-1', 'mega-vac 7', 'megavac 7', 'canigen 7', '7in1'],
    species: 'Dog',
    defaultBrand: 'Megavac',
    totalDosesSeries: 3,
    seriesIntervalDays: 21,
    boosterIntervalDays: 365,
    description: 'Immunization against Canine Distemper, Hepatitis, Parvovirus, and Leptospirosis.',
  },
  {
    name: 'Anti-Rabies Vaccine (ARV)',
    aliases: ['rabies', 'arv', 'anti rabies', 'nobivac r', 'defensor 3', 'raksharab', 'rabies vaccine'],
    species: 'All',
    defaultBrand: 'Nobivac R',
    totalDosesSeries: 2,
    seriesIntervalDays: 28,
    boosterIntervalDays: 365,
    description: 'Mandatory immunization against Rabies virus.',
  },
  {
    name: 'Puppy DP',
    aliases: ['puppy dp', 'distemper parvo', 'nobivac dp', 'dp vaccine'],
    species: 'Dog',
    defaultBrand: 'Nobivac DP',
    totalDosesSeries: 1,
    seriesIntervalDays: 21,
    boosterIntervalDays: 365,
    description: 'Early puppy immunization against Parvovirus and Distemper at 6-8 weeks.',
  },
  {
    name: 'Kennel Cough (KC)',
    aliases: ['kennel cough', 'bordetella', 'kc', 'nobivac kc', 'bb oral', 'bronchicine'],
    species: 'Dog',
    defaultBrand: 'Nobivac KC',
    totalDosesSeries: 2,
    seriesIntervalDays: 28,
    boosterIntervalDays: 365,
    description: 'Protection against Infectious Tracheobronchitis (Bordetella bronchiseptica).',
  },
  {
    name: 'Canine Coronavirus Vaccine',
    aliases: ['coronavirus', 'ccv', 'corona', 'canine coronavirus'],
    species: 'Dog',
    defaultBrand: 'Zoetis Vanguard',
    totalDosesSeries: 2,
    seriesIntervalDays: 21,
    boosterIntervalDays: 365,
    description: 'Protection against Canine Coronavirus Enteritis.',
  },
  {
    name: 'Feline Tricat (3-in-1)',
    aliases: ['tricat', 'feline 3 in 1', 'felovax', 'nobivac tricat trio', 'tricat trio', '3-in-1 cat'],
    species: 'Cat',
    defaultBrand: 'Nobivac Tricat Trio',
    totalDosesSeries: 2,
    seriesIntervalDays: 21,
    boosterIntervalDays: 365,
    description: 'Core feline protection against Rhinotracheitis, Calicivirus, and Panleukopenia.',
  },
];

export const VACCINE_BRAND_OPTIONS = [
  'Nobivac (MSD Animal Health)',
  'Megavac (Indian Immunologicals)',
  'Zoetis Vanguard',
  'Canigen (Virbac)',
  'Defensor (Zoetis)',
  'Biocan',
  'Raksharab',
  'Boehringer Ingelheim',
  'Other / Generic',
];

export const DOSE_OPTIONS = [
  'Dose 1',
  'Dose 2',
  'Dose 3',
  'Dose 4',
  'Booster',
  'Annual Booster',
  'Single Dose',
];

/**
 * Normalizes text for vaccine matching
 */
function clean(str?: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[()_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds protocol by name or known alias
 */
export function findVaccineProtocol(name: string, species?: string): VaccineProtocol | null {
  if (!name) return null;
  const cName = clean(name);

  // Exact or alias match
  for (const p of KNOWN_VACCINE_PROTOCOLS) {
    if (clean(p.name) === cName) return p;
    for (const a of p.aliases) {
      const ca = clean(a);
      if (cName.includes(ca) || ca.includes(cName)) {
        if (!species || p.species === 'All' || p.species.toLowerCase() === species.toLowerCase()) {
          return p;
        }
      }
    }
  }

  return null;
}

/**
 * Checks if a medicine category or name represents a vaccine
 */
export function isVaccineItem(category?: string, name?: string): boolean {
  const cat = (category || '').toLowerCase();
  if (cat.includes('vaccin') || cat === 'immunization') return true;
  if (findVaccineProtocol(name || '')) return true;
  return false;
}

/**
 * Filters pet's historical records for a specific vaccine name.
 * Excludes cancelled or rejected treatments.
 */
export function getVaccineHistoryForPet(
  treatments: any[] = [],
  vaccineName?: string
): any[] {
  if (!Array.isArray(treatments)) return [];

  const targetClean = vaccineName ? clean(vaccineName) : '';

  return treatments
    .filter((t) => {
      if (!t || t.status === 'cancelled' || t.status === 'rejected') return false;
      const isVac = isVaccineItem(t.medicineCategory, t.medicineName || t.name);
      if (!isVac) return false;
      if (!targetClean) return true;

      const tClean = clean(t.medicineName || t.name || '');
      const tProtocol = findVaccineProtocol(t.medicineName || t.name || '');
      const targetProtocol = findVaccineProtocol(vaccineName || '');

      if (tProtocol && targetProtocol && tProtocol.name === targetProtocol.name) {
        return true;
      }
      return tClean.includes(targetClean) || targetClean.includes(tClean);
    })
    .sort((a, b) => {
      const timeA = new Date(a.administeredAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.administeredAt || b.createdAt || 0).getTime();
      return timeA - timeB; // Chronological order
    });
}

/**
 * Calculates suggested dose number, remaining doses, and next due date
 */
export function calculateVaccineDoseSchedule(params: {
  vaccineName: string;
  petSpecies?: string;
  historicalDoses?: any[];
  adminDate?: string | Date;
}): {
  protocol: VaccineProtocol | null;
  suggestedDoseNumber: string;
  suggestedBrand: string;
  totalDoses: number | null;
  dosesAdministered: number;
  dosesRemaining: number | null;
  suggestedNextDueDate: string | null;
  isBooster: boolean;
  scheduleStatus: string;
  previousAdminDates: string[];
} {
  const { vaccineName, petSpecies, historicalDoses = [], adminDate } = params;
  const protocol = findVaccineProtocol(vaccineName, petSpecies);

  const baseDate = adminDate ? new Date(adminDate) : new Date();
  const validDoses = historicalDoses.filter(
    (d) => d && d.status !== 'cancelled' && d.status !== 'rejected'
  );

  const previousAdminDates = validDoses.map((d) => {
    const raw = d.administeredAt || d.createdAt;
    if (!raw) return 'Historical';
    try {
      return new Date(raw).toLocaleDateString('en-GB');
    } catch {
      return String(raw);
    }
  });

  const prevCount = validDoses.length;

  if (protocol) {
    const totalSeries = protocol.totalDosesSeries;

    if (prevCount === 0) {
      // First dose of series
      const nextDue = new Date(baseDate);
      nextDue.setDate(nextDue.getDate() + (totalSeries > 1 ? protocol.seriesIntervalDays : protocol.boosterIntervalDays));
      const nextDueIso = nextDue.toISOString().split('T')[0];

      return {
        protocol,
        suggestedDoseNumber: totalSeries === 1 ? 'Single Dose' : 'Dose 1',
        suggestedBrand: protocol.defaultBrand,
        totalDoses: totalSeries,
        dosesAdministered: 1,
        dosesRemaining: Math.max(0, totalSeries - 1),
        suggestedNextDueDate: nextDueIso,
        isBooster: false,
        scheduleStatus: totalSeries > 1 ? 'Series in progress' : 'Schedule complete',
        previousAdminDates,
      };
    } else if (prevCount < totalSeries) {
      // Subsequent series dose (Dose 2 or Dose 3)
      const currentDoseNum = prevCount + 1;
      const isFinalOfSeries = currentDoseNum === totalSeries;
      const nextDue = new Date(baseDate);
      nextDue.setDate(
        nextDue.getDate() + (isFinalOfSeries ? protocol.boosterIntervalDays : protocol.seriesIntervalDays)
      );
      const nextDueIso = nextDue.toISOString().split('T')[0];

      return {
        protocol,
        suggestedDoseNumber: `Dose ${currentDoseNum}`,
        suggestedBrand: validDoses[validDoses.length - 1]?.vaccineBrand || protocol.defaultBrand,
        totalDoses: totalSeries,
        dosesAdministered: currentDoseNum,
        dosesRemaining: Math.max(0, totalSeries - currentDoseNum),
        suggestedNextDueDate: nextDueIso,
        isBooster: false,
        scheduleStatus: isFinalOfSeries ? 'Schedule complete' : 'Series in progress',
        previousAdminDates,
      };
    } else {
      // Annual Booster
      const nextDue = new Date(baseDate);
      nextDue.setDate(nextDue.getDate() + protocol.boosterIntervalDays);
      const nextDueIso = nextDue.toISOString().split('T')[0];

      return {
        protocol,
        suggestedDoseNumber: 'Annual Booster',
        suggestedBrand: validDoses[validDoses.length - 1]?.vaccineBrand || protocol.defaultBrand,
        totalDoses: 1,
        dosesAdministered: 1,
        dosesRemaining: 0,
        suggestedNextDueDate: nextDueIso,
        isBooster: true,
        scheduleStatus: 'Schedule complete',
        previousAdminDates,
      };
    }
  }

  // Unknown / Custom vaccine without pre-configured protocol:
  // "If previous dose history or veterinarian-approved schedule is missing,
  // show the dose count as Not configured or Needs review until doctor confirms."
  return {
    protocol: null,
    suggestedDoseNumber: prevCount === 0 ? 'Dose 1' : `Dose ${prevCount + 1}`,
    suggestedBrand: '',
    totalDoses: null, // Not configured
    dosesAdministered: prevCount + 1,
    dosesRemaining: null, // Needs review
    suggestedNextDueDate: null,
    isBooster: false,
    scheduleStatus: 'Needs review',
    previousAdminDates,
  };
}

/**
 * Computes human-friendly vaccine schedule status with badge styling
 */
export function getVaccineDisplayStatus(params: {
  nextDueDate?: string | null;
  scheduleStatus?: string;
  dosesRemaining?: number | null;
}): {
  label: string;
  color: 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  const { nextDueDate, scheduleStatus, dosesRemaining } = params;

  if (scheduleStatus === 'Needs review' || dosesRemaining === null) {
    return {
      label: 'Needs review',
      color: 'amber',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-200',
    };
  }

  if (nextDueDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr).getTime();
    const due = new Date(nextDueDate).getTime();
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue (${Math.abs(diffDays)}d ago)`,
        color: 'red',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
      };
    } else if (diffDays === 0) {
      return {
        label: 'Due Today',
        color: 'red',
        bgClass: 'bg-red-100',
        textClass: 'text-red-800',
        borderClass: 'border-red-300',
      };
    } else if (diffDays <= 14) {
      return {
        label: `Due in ${diffDays}d`,
        color: 'blue',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
      };
    }
  }

  if (scheduleStatus === 'Series in progress') {
    return {
      label: 'Series in progress',
      color: 'blue',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      borderClass: 'border-indigo-200',
    };
  }

  if (scheduleStatus === 'Booster due') {
    return {
      label: 'Booster due',
      color: 'purple',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-700',
      borderClass: 'border-purple-200',
    };
  }

  return {
    label: 'Schedule complete',
    color: 'emerald',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  };
}


import type { HostPreset, HostPresetId } from './domain'

/**
 * Built-in chassis presets. These steer the agents' design idioms and provide
 * sensible defaults; the scientist can always override with a custom host or
 * let the system recommend a chassis (host-agnostic).
 */
export const HOST_PRESETS: Record<HostPresetId, HostPreset> = {
  ecoli: {
    id: 'ecoli',
    name: 'Escherichia coli',
    shortName: 'E. coli',
    lineage: 'Gram-negative bacterium',
    strengths: 'Fast growth, rich genetic toolkit, recombinant proteins, platform chemicals',
    toolingNotes:
      'Prefer lambda-Red / CRISPR-Cas9 edits, plasmid or genome-integrated overexpression with characterised promoters (T7, anderson, pTac), RBS-calculator tuning, MAGE for multiplexed edits.'
  },
  scerevisiae: {
    id: 'scerevisiae',
    name: 'Saccharomyces cerevisiae',
    shortName: 'S. cerevisiae',
    lineage: 'Eukaryotic yeast',
    strengths: 'Robust industrial fermentation, terpenoids, secreted proteins, tolerant of harsh conditions',
    toolingNotes:
      'Prefer CRISPR-Cas9 with gRNA/HR donor, promoter swaps (TEF1, PGK1, GAL inducible), Ty/delta integration, codon optimisation, compartment targeting (mitochondria/peroxisome) for pathway flux.'
  },
  cglutamicum: {
    id: 'cglutamicum',
    name: 'Corynebacterium glutamicum',
    shortName: 'C. glutamicum',
    lineage: 'Gram-positive actinobacterium',
    strengths: 'Amino-acid and organic-acid production at industrial scale; high tolerance',
    toolingNotes:
      'Prefer suicide-vector (pK19mobsacB) markerless edits, CRISPRi knockdowns, native strong promoters (Psod, Ptuf, Pgro), feedback-resistant enzyme variants for amino-acid pathways.'
  },
  bsubtilis: {
    id: 'bsubtilis',
    name: 'Bacillus subtilis',
    shortName: 'B. subtilis',
    lineage: 'Gram-positive bacterium',
    strengths: 'Secreted enzymes, GRAS status, high secretion capacity',
    toolingNotes:
      'Prefer genome integration at amyE/lacA, signal-peptide engineering for secretion, xylose/IPTG inducible systems, removal of proteases (e.g. nprE, aprE) to stabilise products.'
  },
  pputida: {
    id: 'pputida',
    name: 'Pseudomonas putida',
    shortName: 'P. putida',
    lineage: 'Gram-negative bacterium',
    strengths: 'Solvent tolerance, redox-rich metabolism, aromatic and non-natural chemistries',
    toolingNotes:
      'Prefer SEVA vectors, CRISPR/recombineering, exploit strong NADPH supply and stress tolerance for redox-intensive pathways.'
  },
  ppastoris: {
    id: 'ppastoris',
    name: 'Komagataella phaffii (Pichia pastoris)',
    shortName: 'P. pastoris',
    lineage: 'Methylotrophic yeast',
    strengths: 'High-density fermentation, strong inducible expression, secreted recombinant proteins',
    toolingNotes:
      'Prefer AOX1/GAP promoters, α-factor secretion signal, multi-copy genome integration, methanol-inducible or constitutive expression depending on product.'
  },
  custom: {
    id: 'custom',
    name: 'Custom host',
    shortName: 'Custom',
    lineage: 'User-specified',
    strengths: 'Defined by the scientist',
    toolingNotes:
      'Use the host context and notes provided by the scientist; ground genetic feasibility against genomic data where available.'
  },
  agnostic: {
    id: 'agnostic',
    name: 'Host-agnostic (recommend chassis)',
    shortName: 'Host-agnostic',
    lineage: 'To be determined',
    strengths: 'Optimise around the target molecule and let the system recommend a chassis',
    toolingNotes:
      'Evaluate candidate chassis (E. coli, yeast, C. glutamicum, etc.) against the product and constraints, recommend the best fit, and justify the choice.'
  }
}

export const HOST_PRESET_LIST: HostPreset[] = Object.values(HOST_PRESETS)

export function hostDisplayName(
  preset: HostPresetId,
  customName?: string
): string {
  if (preset === 'custom') return customName?.trim() || 'Custom host'
  return HOST_PRESETS[preset]?.shortName ?? 'Unknown host'
}

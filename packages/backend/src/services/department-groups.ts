/**
 * FR7 (approved by Mohamed 2026-10-31): departments and specialties apart.
 *
 * "Which departments?" offers the 16 company departments only. The other 56
 * specialty groups either join one of them as a job group, or describe a kind
 * of company: answering "What does your company do?" adds one department for
 * that main work and pre-ticks the departments that usually go with it.
 */
import {SPECIALTY_GROUPS} from './specialty-catalogue.js';

/** Specialty groups whose jobs now sit inside a company department. */
export const JOINED_GROUPS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  operations: ['Leadership and governance', 'Strategy and business development', 'Administration and offices', 'Projects and programmes', 'Procurement and suppliers', 'Inventory and logistics', 'Facilities assets and physical security', 'Documents records and archives', 'Business continuity and crises', 'International operations and branches', 'Personal assistance and organisation'],
  hr: ['Employee onboarding and transitions', 'Organisational learning and development', 'Employee relations and representation', 'Occupational health and safety', 'Psychological and social support', 'Equality accessibility and integration', 'Career guidance and employment services', 'Coaching mentoring and professional supervision'],
  legal: ['Regulatory intelligence and public policy', 'Audit risk and investigations', 'Privacy and data protection'],
  research: ['Engineering robotics and scientific computing', 'Science and scientific research', 'Culture humanities libraries and heritage'],
  production: ['Literature and creative writing', 'Songs and music', 'Acting performance and presenting', 'Games and interactive worlds'],
  finance: ['Banking and financial services', 'Insurance and claims'],
  infrastructure: ['Internal IT and service desk'],
  data: ['Artificial intelligence'],
  design: ['Products and user experience'],
  education: ['Languages and translation'],
  marketing: ['Corporate communications and public relations'],
  support: ['Contact centres'],
  sales: ['E-commerce'],
});

export interface CompanyKind {
  /** Also the id of the main-work department it adds (the group name in lower case, as before FR7). */
  id: string;
  label: string;
  group: string;
  /** Company departments a company of this kind usually has, most needed first. */
  suggests: readonly string[];
}

const kind = (group: string, label: string, suggests: readonly string[]): CompanyKind =>
  Object.freeze({ id: group.toLowerCase(), label, group, suggests: Object.freeze([...suggests]) });

const COMMON = ['sales', 'support', 'marketing', 'operations'] as const;

export const COMPANY_KINDS: readonly CompanyKind[] = Object.freeze([
  kind('Healthcare rehabilitation and medical services', 'Healthcare', ['support', 'operations', 'hr', 'legal']),
  kind('Tourism and hospitality', 'Tourism and hospitality', COMMON),
  kind('Food culinary services and food safety', 'Food and catering', COMMON),
  kind('Construction building services and trades', 'Construction and trades', ['operations', 'sales', 'finance', 'legal']),
  kind('Real estate architecture and spatial design', 'Real estate and architecture', ['sales', 'design', 'legal', 'finance']),
  kind('Manufacturing production and maintenance', 'Manufacturing', ['operations', 'sales', 'finance', 'security']),
  kind('Industrial engineering materials and vehicle services', 'Engineering and vehicles', ['operations', 'sales', 'support', 'finance']),
  kind('Transport and mobility', 'Transport and mobility', ['operations', 'support', 'sales', 'finance']),
  kind('Energy utilities and environmental technology', 'Energy and utilities', ['operations', 'infrastructure', 'legal', 'finance']),
  kind('Telecommunications electrical systems and measurement', 'Telecom and electrical', ['infrastructure', 'support', 'sales', 'operations']),
  kind('Agriculture environment and sustainability', 'Agriculture and environment', ['operations', 'sales', 'finance', 'research']),
  kind('Forestry horticulture animals and veterinary services', 'Animals, forestry and gardens', ['support', 'operations', 'sales', 'finance']),
  kind('Fashion textiles crafts and publishing production', 'Fashion, crafts and printing', ['design', 'marketing', 'sales', 'operations']),
  kind('Cleaning beauty and personal services', 'Cleaning and beauty', ['support', 'sales', 'marketing', 'operations']),
  kind('Events', 'Events', ['marketing', 'sales', 'operations', 'support']),
  kind('Care family and community support', 'Care and family support', ['support', 'hr', 'operations', 'legal']),
  kind('Community services and nonprofit organisations', 'Nonprofit and community', ['marketing', 'finance', 'operations', 'support']),
  kind('Public services emergency and community safety', 'Public and emergency services', ['support', 'operations', 'legal', 'security']),
]);

export function companyKind(id: unknown): CompanyKind | undefined {
  return typeof id === 'string' ? COMPANY_KINDS.find((k) => k.id === id) : undefined;
}

/** Department id → the specialty groups whose jobs it offers (its own group first). */
export function departmentJobGroups(department: string, ownGroup?: string): string[] {
  const k = companyKind(department);
  if (k) return [k.group];
  return [...(ownGroup ? [ownGroup] : []), ...(JOINED_GROUPS[department] ?? [])];
}

/** The jobs of every joined group and every kind, as choices for the jobs popover (grouped by `group`). */
export function groupedJobChoices(): { department: string; name: string; description: string; group: string }[] {
  const entries = new Map<string, readonly string[]>(SPECIALTY_GROUPS.map((g) => [g.name, g.entries]));
  const out: { department: string; name: string; description: string; group: string }[] = [];
  const add = (department: string, group: string, label: string) => {
    for (const name of entries.get(group) ?? []) {
      out.push({ department, name, group: label, description: `Perform ${name.toLowerCase()} work, explain assumptions and deliver practical results within assigned permissions.` });
    }
  };
  for (const [department, groups] of Object.entries(JOINED_GROUPS)) for (const g of groups) add(department, g, g);
  for (const k of COMPANY_KINDS) add(k.id, k.group, k.label);
  return out;
}

/** The 37 joined groups' old department ids: still understood (agents hired before FR7 keep them), never offered. */
export const RETIRED_GROUP_DEPARTMENTS: ReadonlySet<string> = new Set(Object.values(JOINED_GROUPS).flat().map((g) => g.toLowerCase()));

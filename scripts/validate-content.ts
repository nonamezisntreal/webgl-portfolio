import { copy, profile, type Locale } from '../src/content';
import { casePages, insightPages, servicePages, siteConfig } from '../src/static-pages';

const locales: Locale[] = ['ru', 'en'];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertUnique(values: string[], label: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  assert(duplicates.length === 0, `${label} contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
}

assert(siteConfig.portfolioUrl === `${siteConfig.origin}${siteConfig.basePath}`, 'Portfolio URL must be derived from origin and base path.');
assert(siteConfig.portfolioUrl === 'https://nonamezisntreal.github.io/webgl-portfolio/', 'Canonical portfolio URL changed unexpectedly.');
assert(siteConfig.githubUrl === profile.github, 'Static and runtime GitHub URLs diverged.');
assert(siteConfig.telegramUrl === profile.telegram, 'Static and runtime Telegram URLs diverged.');
assert(siteConfig.email === profile.email, 'Static and runtime email addresses diverged.');

assertUnique(servicePages.map((item) => item.id), 'Service IDs');
assertUnique(servicePages.map((item) => item.slug), 'Service slugs');
assertUnique(casePages.map((item) => item.id), 'Case IDs');
assertUnique(casePages.map((item) => item.slug), 'Case slugs');
assertUnique(insightPages.map((item) => item.id), 'Insight IDs');
assertUnique(insightPages.map((item) => item.slug), 'Insight slugs');

const serviceIds = new Set(servicePages.map((item) => item.id));
const caseIds = new Set(casePages.map((item) => item.id));

for (const locale of locales) {
  assert(copy[locale].projects.length > 0, `No projects for locale ${locale}.`);
  assertUnique(copy[locale].projects.map((item) => item.id), `Project IDs (${locale})`);

  for (const descriptor of servicePages) {
    const content = descriptor.content[locale];
    assert(content.title.trim().length >= 8, `${descriptor.id}/${locale}: title is too short.`);
    assert(content.description.trim().length >= 50, `${descriptor.id}/${locale}: description is too short.`);
    assert(content.directAnswer.trim().length >= 80, `${descriptor.id}/${locale}: direct answer is too short.`);
    assert(content.sections.length >= 3, `${descriptor.id}/${locale}: at least three sections are required.`);
    if (descriptor.serviceIndex !== undefined) {
      assert(copy[locale].services[descriptor.serviceIndex], `${descriptor.id}/${locale}: invalid serviceIndex.`);
    }
    for (const caseId of descriptor.relatedCaseIds) assert(caseIds.has(caseId), `${descriptor.id}: unknown related case ${caseId}.`);
  }

  for (const descriptor of casePages) {
    assert(copy[locale].projects.some((project) => project.id === descriptor.id), `${descriptor.id}: project is missing for locale ${locale}.`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(descriptor.publishedAt), `${descriptor.id}: invalid publishedAt.`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(descriptor.updatedAt), `${descriptor.id}: invalid updatedAt.`);
    for (const serviceId of descriptor.relatedServiceIds) assert(serviceIds.has(serviceId), `${descriptor.id}: unknown related service ${serviceId}.`);
  }

  for (const descriptor of insightPages) {
    const content = descriptor.content[locale];
    assert(serviceIds.has(descriptor.relatedServiceId), `${descriptor.id}: unknown related service ${descriptor.relatedServiceId}.`);
    for (const caseId of descriptor.relatedCaseIds) assert(caseIds.has(caseId), `${descriptor.id}: unknown related case ${caseId}.`);
    assert(content.title.trim().length >= 8, `${descriptor.id}/${locale}: title is too short.`);
    assert(content.description.trim().length >= 50, `${descriptor.id}/${locale}: description is too short.`);
    assert(content.directAnswer.trim().length >= 80, `${descriptor.id}/${locale}: direct answer is too short.`);
    assert(content.sections.length >= 3, `${descriptor.id}/${locale}: at least three sections are required.`);
  }
}

console.log(`Validated ${servicePages.length} services, ${casePages.length} cases and ${insightPages.length} insights in ${locales.length} locales.`);

import { test, expect, type Page } from '@playwright/test';

const LAYOUTS = [
  'Top ↓ Bottom',
  'Left → Right',
  'Force',
  'Grid',
  'Radial',
] as const;

async function loadSmallDataset(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Small' }).click();
  // Graph starts empty while layout runs; wait for at least one node to appear.
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
}

async function readStatCount(page: Page, label: 'Total Nodes' | 'Total Edges') {
  const text = await page.getByText(new RegExp(`^${label}: \\d+$`)).textContent();
  const match = text?.match(/(\d+)/);
  if (!match) throw new Error(`Could not parse ${label}`);
  return Number(match[1]);
}

test.describe('GraphView e2e (Small dataset)', () => {
  test('renders every node and at least one edge', async ({ page }) => {
    await loadSmallDataset(page);
    const expectedNodes = await readStatCount(page, 'Total Nodes');
    await expect(page.locator('.react-flow__node')).toHaveCount(expectedNodes);
    await expect(page.locator('.react-flow__edge').first()).toBeVisible();
  });

  test('switches between all layouts without losing nodes', async ({ page }) => {
    await loadSmallDataset(page);
    const expectedNodes = await readStatCount(page, 'Total Nodes');

    for (const layout of LAYOUTS) {
      await page.getByRole('button', { name: layout }).click();
      await expect(page.locator('.react-flow__node')).toHaveCount(expectedNodes);
    }
  });

  test('clicking a node updates the sidebar selection count', async ({ page }) => {
    await loadSmallDataset(page);
    await page.locator('.react-flow__node').first().click();
    await expect(page.getByText(/^Nodes: 1$/)).toBeVisible();
    await expect(page.getByText('Selected Nodes:')).toBeVisible();
  });

  test('hovering a node surfaces its name in the Hover panel', async ({ page }) => {
    await loadSmallDataset(page);
    await page.locator('.react-flow__node').first().hover();
    // The Hover section shows `Node: <name>`; App.tsx delays the tooltip by 250ms
    // but the panel text updates immediately.
    await expect(page.getByText(/^Node: .+/)).toBeVisible();
  });
});

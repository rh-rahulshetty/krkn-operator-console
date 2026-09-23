import { render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateRun } from './CreateRun';
import { KrknAIPage } from './KrknAIPage';
import { mockAiRuns } from './mockData';

function renderCreateRun(existingNames: string[] = []) {
  const onStart = vi.fn();
  const onCancel = vi.fn();
  render(<CreateRun existingNames={existingNames} onStart={onStart} onCancel={onCancel} />);
  return { onStart, onCancel };
}

describe('Krkn AI mock run creation', () => {
  it('rejects an empty or duplicate DNS-label run name', async () => {
    const user = userEvent.setup();
    renderCreateRun(['existing-run']);

    expect(screen.getByText('Run name is required.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discover components' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'existing-run');
    expect(screen.getByText('A run with this name already exists.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discover components' })).toBeDisabled();
  });

  it('requires positive search sizes and at least one selected scenario', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'scenario-check');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));
    const generationsInput = screen.getByRole('spinbutton', { name: /Generations/ });
    const populationInput = screen.getByRole('spinbutton', { name: /Population size/ });
    await user.clear(generationsInput);
    await user.type(generationsInput, '0');
    await user.clear(populationInput);
    await user.type(populationInput, '0');
    expect(screen.getAllByText('Enter a whole number of at least 1.')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeDisabled();


    for (const label of ['Storage throttle', 'DNS outage', 'Container scenarios', 'PVC scenarios']) {
      await user.click(screen.getByLabelText(label));
    }

    expect(screen.getByText('Enable at least one scenario type.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeDisabled();
  });

  it('requires a mock config before launch and emits an empty Provisioning run', async () => {
    const user = userEvent.setup();
    const { onStart } = renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'ai-preview-1');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));

    expect(screen.queryByRole('button', { name: 'Start run (mock)' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));
    expect(screen.getByRole('button', { name: 'Start run (mock)' })).toBeEnabled();
    expect(onStart).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Start run (mock)' }));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      name: 'ai-preview-1',
      configId: 'mock-config-ai-preview-1',
      targetRequestId: 'mock-ai-target-staging-us-east-1',
      phase: 'Provisioning',
      generations: 6,
      populationSize: 4,
      completedGenerations: 0,
      scenarios: [],
      progression: [],
      orchestrator: expect.objectContaining({ status: 'Pending' }),
      configYaml: expect.stringContaining('kubeconfig_file_path: /input/kubeconfig'),
    }));
    const createdRun = onStart.mock.calls[0][0];
    expect(createdRun.configYaml).toContain('  generations: 6');
    expect(createdRun.configYaml).toContain('  population_size: 4');
    expect(createdRun.configYaml).not.toContain('https://');
  });

  it('invalidates the frozen config when a generation setting changes', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'config-refresh');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));
    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));
    expect(screen.getByText('mock-config-config-refresh')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    const generationsInput = screen.getByRole('spinbutton', { name: /Generations/ });
    await user.clear(generationsInput);
    await user.type(generationsInput, '3');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));

    expect(screen.getByText('12', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText(/generations: 3/)).toBeInTheDocument();
  });
});

function StatefulMockPage() {
  const [runs, setRuns] = useState(mockAiRuns);
  return <KrknAIPage runs={runs} onAddRun={(run) => setRuns((current) => [run, ...current])} />;
}

describe('Krkn AI run inspection', () => {
  it('shows observed fixture progress and drills into generation two and failed scenario 17', async () => {
    const user = userEvent.setup();
    render(<KrknAIPage runs={mockAiRuns} onAddRun={vi.fn()} />);

    const completedRow = screen.getByRole('row', { name: /Open run robot-shop-exploration/ });
    expect(completedRow).toHaveTextContent('6 / 6');
    expect(completedRow).toHaveTextContent('24 / 24');
    expect(screen.getByRole('row', { name: /Open run staging-preview-in-progress/ })).toHaveTextContent('2 / 6');
    expect(screen.getByRole('row', { name: /Open run staging-preview-in-progress/ })).toHaveTextContent('8 / 24');

    await user.click(completedRow);
    expect(screen.getByRole('heading', { name: 'Generation 2 scenarios' })).toBeInTheDocument();
    const fitnessTable = screen.getByRole('table', { name: /Numeric fitness values/ });
    expect(within(fitnessTable).getByText('26.798')).toBeInTheDocument();
    expect(within(fitnessTable).getByText('30.4453')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Scenario 6/ }));
    expect(screen.getAllByText('30.4453 fitness units').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Generation 5/ }));
    expect(screen.getByRole('heading', { name: 'Generation 5 scenarios' })).toBeInTheDocument();
    expect(screen.getByText(/individual scenario failed; the overall run phase is Succeeded/)).toBeInTheDocument();
    expect(screen.getAllByText('-1 fitness units').length).toBeGreaterThan(0);
  });

  it('adds a newly launched run to the session list with zero observed progress', async () => {
    const user = userEvent.setup();
    render(<StatefulMockPage />);
    await user.click(screen.getByRole('button', { name: 'Create run' }));
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'ai-preview-1');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));
    const generations = screen.getByRole('spinbutton', { name: /Generations/ });
    await user.clear(generations);
    await user.type(generations, '3');
    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));
    await user.click(screen.getByRole('button', { name: 'Start run (mock)' }));

    expect(screen.getByText('Provisioning')).toBeInTheDocument();
    expect(screen.getByText('No generations yet')).toBeInTheDocument();
    expect(screen.getByText('No scenario pods yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to runs' }));

    const newRunRow = screen.getByRole('row', { name: /Open run ai-preview-1/ });
    expect(newRunRow).toHaveTextContent('0 / 3');
    expect(newRunRow).toHaveTextContent('0 / 12');
    expect(newRunRow).toHaveTextContent('Not available yet');
  });

  it('keeps failed runs without artifacts free of fabricated charts or scores', async () => {
    const user = userEvent.setup();
    render(<KrknAIPage runs={mockAiRuns} onAddRun={vi.fn()} />);
    await user.click(screen.getByRole('row', { name: /Open run failed-preview/ }));

    expect(screen.getByText('Illustrative orchestrator pod exited non-zero')).toBeInTheDocument();
    expect(screen.getAllByText('Not available yet').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: /Best and average fitness/ })).not.toBeInTheDocument();
  });
});

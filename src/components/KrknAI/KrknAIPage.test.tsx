import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    const generationsInput = screen.getByRole('spinbutton', { name: 'Generations' });
    const populationInput = screen.getByRole('spinbutton', { name: /Population size/ });
    await user.clear(generationsInput);
    await user.type(generationsInput, '0');
    await user.clear(populationInput);
    await user.type(populationInput, '0');
    expect(screen.getByText('Generations must be at least 1.')).toBeInTheDocument();
    expect(screen.getByText('Population size must be at least 1.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeDisabled();


    for (const label of ['Storage throttle', 'DNS outage', 'Container scenarios', 'PVC scenarios']) {
      await user.click(screen.getByLabelText(label));
    }

    expect(screen.getByText('Enable at least one scenario type.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeDisabled();
  }, 15_000);

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
      mainPod: expect.objectContaining({ status: 'Pending' }),
      configYaml: expect.stringContaining('kubeconfig_file_path: /input/kubeconfig'),
    }));
    const createdRun = onStart.mock.calls[0][0];
    expect(createdRun.configYaml).toContain('  generations: 6');
    expect(createdRun.configYaml).toContain('  population_size: 4');
    expect(createdRun.configYaml).toContain('url: "https://robot-shop-health.staging-east.example.com/healthz"');
    expect(createdRun.configYaml).not.toContain('https://api.staging-east.example.com:6443');
  });

  it('invalidates the frozen config when a generation setting changes', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'config-refresh');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));
    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));
    expect(screen.getByText('mock-config-config-refresh')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    const generationsInput = screen.getByRole('spinbutton', { name: 'Generations' });
    await user.clear(generationsInput);
    await user.type(generationsInput, '3');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));

    expect(screen.getByText('12', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText(/generations: 3/)).toBeInTheDocument();
  });
  it('edits fitness items and dummy health checks into categorized YAML', async () => {
    const user = userEvent.setup();
    const { onStart } = renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'fitness-edit');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));
    expect(screen.queryByText('Kubeconfig file path')).not.toBeInTheDocument();

    expect(screen.getByText('Algorithm · genetic')).toBeInTheDocument();
    expect(screen.getByText('Health checks')).toBeInTheDocument();
    expect(screen.getByText('Fitness function')).toBeInTheDocument();
    expect(screen.getByText('Item 15')).toBeInTheDocument();
    await user.click(screen.getByText(/Pod container restarts/));
    const query = screen.getByRole('textbox', { name: 'Fitness item 0 query' });
    await user.clear(query);
    await user.type(query, 'sum(kube_pod_container_status_restarts_total) * 2');
    const weight = screen.getByRole('spinbutton', { name: 'Fitness item 0 weight' });
    await user.clear(weight);
    await user.type(weight, '0.2');
    const mutationRate = screen.getByRole('spinbutton', { name: 'Mutation rate' });
    await user.clear(mutationRate);
    await user.type(mutationRate, '0.4');
    const outputFormat = screen.getByRole('textbox', { name: 'result_name_fmt' });
    await user.clear(outputFormat);
    await user.type(outputFormat, 'custom_%s.yaml');

    await user.click(screen.getByText(/robot-shop.*robot-shop-health/));
    const healthUrl = screen.getByRole('textbox', { name: 'Health check 0 URL' });
    await user.clear(healthUrl);
    await user.type(healthUrl, 'https://health.live-cluster.example.org/ready');
    expect(screen.getByText(/reserved example.com domain/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeDisabled();
    await user.clear(healthUrl);
    await user.type(healthUrl, 'https://health-preview.example.com/ready');

    const preview = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect(preview).toContain('query: "sum(kube_pod_container_status_restarts_total) * 2"');
    expect(preview).toContain('weight: 0.2');
    expect(preview).toContain('url: "https://health-preview.example.com/ready"');
    expect(preview).not.toContain('adaptive_mutation:');
    expect(preview).not.toContain('stopping_criteria:');
    expect(preview).toContain('mutation_rate: 0.4');
    expect(preview).toContain('result_name_fmt: "custom_%s.yaml"');
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Create config (mock)' }));
    expect(screen.getByText('Fitness items')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start run (mock)' }));
    expect(onStart.mock.calls[0][0].configYaml).toContain('https://health-preview.example.com/ready');
  }, 15_000);
  it('shows the prod discovery warning and supports a complete dummy health URL', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'prod-health-preview');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select one cluster' }), 'mock-ai-target-prod-us-central1');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));

    expect(screen.getByText('No active health checks in this mock discovery')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add health check (mock)' }));
    expect(screen.getByRole('textbox', { name: 'Health check 0 URL' })).toHaveValue('https://service.example.com/healthz');

    const preview = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect(preview).toContain('https://service.example.com/healthz');
    expect(preview).toContain('payments');
    expect(preview).not.toContain('https://api.prod.example.com:6443');
    await user.click(screen.getByText('application-0'));
    await user.click(screen.getByRole('button', { name: 'Remove health check application-0' }));
    expect(screen.getByText(/No health checks configured in this mock config/)).toBeInTheDocument();
    const emptyHealthChecksYaml = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect(emptyHealthChecksYaml).toContain('  applications: []');
    expect(screen.getByRole('button', { name: 'Create config (mock)' })).toBeEnabled();
  });
  it('uses wildcard discovery defaults and rebinds filters to the selected cluster', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'west-discovery');
    expect(screen.getByRole('textbox', { name: 'Namespace pattern' })).toHaveValue('*');
    expect(screen.getByRole('textbox', { name: 'Pod label-key pattern' })).toHaveValue('*');
    expect(screen.getByRole('textbox', { name: 'Node label-key pattern' })).toHaveValue('*');
    const namespacePattern = screen.getByRole('textbox', { name: 'Namespace pattern' });
    fireEvent.change(namespacePattern, { target: { value: '[' } });
    expect(screen.getByText(/Namespace pattern is invalid/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discover components' })).toBeDisabled();
    await user.clear(namespacePattern);
    await user.type(namespacePattern, '*');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select one cluster' }), 'mock-ai-target-staging-eu-west-1');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));

    const preview = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect(screen.queryByText('Namespace pattern')).not.toBeInTheDocument();
    expect(preview).toContain('name: "cart-1"');
    expect(preview).toContain('name: "payment-1"');
    expect(preview).toContain('shop-staging');
    expect(preview).not.toContain('robot-shop');
    expect(preview).toContain('https://shop-staging-health.staging-west.example.com/healthz');
  });

  it('applies namespace and label-key patterns during mock discovery', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'filtered-discovery');
    const namespacePattern = screen.getByRole('textbox', { name: 'Namespace pattern' });
    const podLabelPattern = screen.getByRole('textbox', { name: 'Pod label-key pattern' });
    const nodeLabelPattern = screen.getByRole('textbox', { name: 'Node label-key pattern' });
    await user.clear(namespacePattern);
    await user.type(namespacePattern, 'robot-shop');
    await user.clear(podLabelPattern);
    await user.type(podLabelPattern, 'service');
    await user.clear(nodeLabelPattern);
    await user.type(nodeLabelPattern, 'node-role.*');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));

    const preview = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect(preview).toContain('name: "cart-1"');
    expect(preview).toContain('name: "payment-1"');
    expect(preview).toContain('"service": "payment"');
    expect(preview).toContain('"node-role.kubernetes.io/worker"');
    expect(preview).toContain('"kubernetes.io/hostname"');
  }, 15_000);

  it('cascades namespace enable changes to all descendants', async () => {
    const user = userEvent.setup();
    renderCreateRun();
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'component-flags');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));

    const namespaceToggle = screen.getByRole('checkbox', { name: 'Enable namespace robot-shop' });
    expect(namespaceToggle).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Enable pod cart-1' })).toBeChecked();
    await user.click(namespaceToggle);

    let preview = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect(preview).toMatch(/name: "robot-shop"\s+disabled: true/);
    expect(preview).toMatch(/name: "cart-1"\s+disabled: true/);
    expect(preview).toMatch(/containers:\s+- name: "cart"\s+disabled: true/);
    expect(preview).toMatch(/services:\s+- name: "cart"\s+disabled: true/);
    expect(preview).toMatch(/name: "data-redis-0"\s+disabled: true/);
    expect(screen.getByRole('checkbox', { name: 'Enable pod cart-1' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Enable namespace robot-shop' }));
    const podToggle = screen.getByRole('checkbox', { name: 'Enable pod cart-1' });
    expect(podToggle).toBeEnabled();
    expect(podToggle).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Enable container cart in cart-1' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Enable node worker-1' }));
    preview = (screen.getByLabelText('Generated krkn-ai.yaml preview') as HTMLTextAreaElement).value;
    expect((preview.match(/disabled: true/g) ?? [])).toHaveLength(1);
    expect(preview).toMatch(/name: "robot-shop"\s+disabled: false/);
    expect(preview).toMatch(/name: "cart-1"\s+disabled: false/);
    expect(preview).toMatch(/containers:\s+- name: "cart"\s+disabled: false/);
    expect(preview).toMatch(/name: "worker-1"\s+disabled: true/);
  }, 15_000);
});

function StatefulMockPage() {
  const [runs, setRuns] = useState(mockAiRuns);
  return <KrknAIPage runs={runs} onAddRun={(run) => setRuns((current) => [run, ...current])} />;
}

describe('Krkn AI run inspection', () => {
  it('sorts and filters scenario rows and opens detailed health telemetry', async () => {
    const user = userEvent.setup();
    render(<KrknAIPage runs={mockAiRuns} onAddRun={vi.fn()} />);

    const completedRow = screen.getByRole('row', { name: /Open run robot-shop-exploration/ });
    expect(completedRow).toHaveTextContent('6 / 6');
    expect(completedRow).toHaveTextContent('24 / 24');
    expect(screen.getByRole('row', { name: /Open run staging-preview-in-progress/ })).toHaveTextContent('2 / 6');
    expect(screen.getByRole('row', { name: /Open run staging-preview-in-progress/ })).toHaveTextContent('9 / 24');

    await user.click(completedRow);
    expect(screen.getByText('Scenarios executed').nextSibling).toHaveTextContent('24');
    const mainPodOutput = screen.getByLabelText('Main pod output');
    expect(within(mainPodOutput).getByText(/Krkn-AI run UUID: 90715e34-b0ff-40cd-b96f-9b6cdd59a033/)).toBeInTheDocument();
    expect(within(mainPodOutput).getByText(/Generation 1 — 4 scenarios/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Uploader' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Orchestrator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /Numeric fitness values/ })).not.toBeInTheDocument();

    await user.click(screen.getByText('View krkn-ai.yaml used for this run'));
    expect(screen.getByText(/kubeconfig_file_path: \/input\/kubeconfig/)).toBeInTheDocument();

    const scenarioTable = screen.getByRole('table', { name: 'Scenario executions' });
    expect(within(scenarioTable).getAllByRole('row')).toHaveLength(25);
    expect(within(scenarioTable).queryByRole('columnheader', { name: 'Health checks' })).not.toBeInTheDocument();
    expect(within(scenarioTable).queryByRole('columnheader', { name: 'Origin' })).not.toBeInTheDocument();
    await user.click(within(scenarioTable).getByRole('button', { name: 'Fitness score' }));
    await user.click(within(scenarioTable).getByRole('button', { name: /Fitness score/ }));
    expect(within(scenarioTable).getAllByRole('row')[1]).toHaveTextContent('30.4453');
    expect(within(scenarioTable).getAllByRole('row')[1]).toHaveTextContent('storage-throttle');

    const search = screen.getByRole('searchbox', { name: 'Search scenarios' });
    await user.type(search, 'storage-throttle');
    expect(screen.getByText('8 of 24 scenarios')).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'scenario-name-that-does-not-exist');
    expect(screen.getByText('No scenarios match the current filters.')).toBeInTheDocument();
    await user.clear(search);

    await user.click(screen.getByRole('row', { name: 'Open scenario 1 details' }));
    const dialog = screen.getByRole('dialog', { name: 'Scenario 1: storage-throttle' });
    expect(within(dialog).queryByText('Health: Degraded')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Origin')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Parent scenarios')).not.toBeInTheDocument();
    expect(within(dialog).getByText('500')).toBeInTheDocument();
    expect(within(dialog).getByText('58')).toBeInTheDocument();
    expect(within(dialog).getByText('11.6%')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: /Health-check response time by application/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: /Health-check success heatmap by application/ })).toBeInTheDocument();
    expect(within(dialog).getByText(/krknctl run storage-throttle --telemetry-prometheus-backup False/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Copy scenario command/ })).toBeInTheDocument();
    expect(within(dialog).getByText(/Running StorageThrottleScenarioPlugin/)).toBeInTheDocument();
    expect(within(dialog).getByText(/I\/O throttle removed/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('row', { name: 'Open scenario 17 details' }));
    expect(screen.getByText(/scenario failed; the overall run phase is Succeeded/)).toBeInTheDocument();
    expect(screen.getAllByText('-1 fitness units').length).toBeGreaterThan(0);
  });

  it('shows one active scenario with pending fitness and log-only live details', async () => {
    const user = userEvent.setup();
    render(<KrknAIPage runs={mockAiRuns} onAddRun={vi.fn()} />);

    await user.click(screen.getByRole('row', { name: /Open run staging-preview-in-progress/ }));
    expect(screen.getByRole('img', { name: /across 2 observed generations/ })).toBeInTheDocument();
    expect(screen.getByText(/chart of completed generations.*refresh when generation 3 completes/i)).toBeInTheDocument();

    const scenarioTable = screen.getByRole('table', { name: 'Scenario executions' });
    expect(within(scenarioTable).getAllByRole('row')).toHaveLength(10);
    expect(within(scenarioTable).getAllByText('Running')).toHaveLength(1);
    const activeRow = within(scenarioTable).getByRole('row', { name: 'Open scenario 9 details' });
    expect(activeRow).toHaveTextContent('Pending');
    expect(activeRow).toHaveTextContent('38.42s elapsed');

    await user.click(activeRow);
    const dialog = screen.getByRole('dialog', { name: 'Scenario 9: container-scenarios' });
    expect(within(dialog).getByText('Running')).toBeInTheDocument();
    expect(within(dialog).getByText('Elapsed')).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Scenario run configuration' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Fitness function result' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Health-check telemetry' })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Running ContainerScenarioPlugin/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Scenario is still running/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/successfully injected/)).not.toBeInTheDocument();
  });

  it('adds a newly launched run to the session list with zero observed progress', async () => {
    const user = userEvent.setup();
    render(<StatefulMockPage />);
    await user.click(screen.getByRole('button', { name: 'Create run' }));
    await user.type(screen.getByRole('textbox', { name: /Run name/ }), 'ai-preview-1');
    await user.click(screen.getByRole('button', { name: 'Discover components' }));
    const generations = screen.getByRole('spinbutton', { name: 'Generations' });
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

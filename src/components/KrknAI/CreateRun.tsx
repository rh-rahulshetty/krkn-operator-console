import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { mockAiTargets } from './mockData';
import type { MockAiRun, MockAiTarget } from './types';

const scenarioTypeOptions = [
  { id: 'storage-throttle', label: 'Storage throttle', configKey: 'storage_throttle' },
  { id: 'dns-outage', label: 'DNS outage', configKey: 'dns_outage' },
  { id: 'container-scenarios', label: 'Container scenarios', configKey: 'container_scenarios' },
  { id: 'pvc-scenarios', label: 'PVC scenarios', configKey: 'pvc_scenarios' },
] as const;

type ScenarioType = (typeof scenarioTypeOptions)[number]['id'];
type ScenarioFlags = Record<ScenarioType, boolean>;

interface MockConfig {
  id: string;
  targetRequestId: string;
  clusterName: string;
  yaml: string;
  generations: number;
  populationSize: number;
  scenarioTypes: ScenarioType[];
}

interface CreateRunProps {
  existingNames: string[];
  onStart: (run: MockAiRun) => void;
  onCancel: () => void;
}

function buildConfigYaml(target: MockAiTarget, generations: number, populationSize: number, enabledTypes: ScenarioFlags): string {
  const lines = [
    '# Mock preview configuration; no cluster endpoint or credentials are included.',
    'kubeconfig_file_path: /input/kubeconfig',
    'baseline:',
    '  enable: true',
    '  duration: 30',
    'scenario:',
  ];

  for (const option of scenarioTypeOptions) {
    lines.push(`  ${option.configKey}:`, `    enable: ${enabledTypes[option.id]}`);
  }

  lines.push(
    'algorithm: genetic',
    'genetic:',
    `  generations: ${generations}`,
    `  population_size: ${populationSize}`,
    'fitness_function:',
    '  query: sum(kube_pod_container_status_restarts_total)',
    '  type: point',
    '  include_krkn_failure: true',
    '  include_health_check_failure: true',
    '  include_health_check_response_time: true',
    'output:',
    '  result_name_fmt: scenario_%s.yaml',
    '  graph_name_fmt: scenario_%s.png',
    '  log_name_fmt: scenario_%s.log',
    'cluster_components:',
    '  namespaces:',
  );

  for (const namespace of target.components.namespaces) {
    lines.push(`    - name: ${namespace}`, '      pods:');
    for (const pod of target.components.pods) {
      lines.push(`        - name: ${pod}`);
    }
    lines.push('      services:');
    for (const service of target.components.services) {
      lines.push(`        - name: ${service}`);
    }
  }

  lines.push('  nodes:');
  for (const node of target.components.nodes) {
    lines.push(`    - name: ${node}`);
  }
  return lines.join('\n');
}

export function CreateRun({ existingNames, onStart, onCancel }: CreateRunProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [runName, setRunName] = useState('');
  const [selectedTargetRequestId, setSelectedTargetRequestId] = useState(mockAiTargets[0].targetRequestId);
  const [generations, setGenerations] = useState('6');
  const [populationSize, setPopulationSize] = useState('4');
  const [scenarioFlags, setScenarioFlags] = useState<ScenarioFlags>({
    'storage-throttle': true,
    'dns-outage': true,
    'container-scenarios': true,
    'pvc-scenarios': true,
  });
  const [createdConfig, setCreatedConfig] = useState<MockConfig | null>(null);

  const selectedTarget = mockAiTargets.find((target) => target.targetRequestId === selectedTargetRequestId);
  const trimmedName = runName.trim();
  const nameError = trimmedName.length === 0
    ? 'Run name is required.'
    : !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(trimmedName)
      ? 'Use a DNS label: 1–63 lowercase letters, numbers, or hyphens; start and end with a letter or number.'
      : existingNames.some((name) => name.toLowerCase() === trimmedName.toLowerCase())
        ? 'A run with this name already exists.'
        : undefined;
  const generationCount = Number(generations);
  const populationCount = Number(populationSize);
  const generationError = !Number.isInteger(generationCount) || generationCount < 1 ? 'Enter a whole number of at least 1.' : undefined;
  const populationError = !Number.isInteger(populationCount) || populationCount < 1 ? 'Enter a whole number of at least 1.' : undefined;
  const enabledTypes = scenarioTypeOptions.filter((option) => scenarioFlags[option.id]).map((option) => option.id);
  const scenarioError = enabledTypes.length === 0 ? 'Enable at least one scenario type.' : undefined;
  const canDiscover = !nameError && !!selectedTarget;
  const canCreateConfig = !!selectedTarget && !nameError && !generationError && !populationError && !scenarioError;
  const canStart = !!createdConfig
    && !!selectedTarget
    && !nameError
    && !generationError
    && !populationError
    && !scenarioError
    && createdConfig.targetRequestId === selectedTarget.targetRequestId
    && createdConfig.clusterName === selectedTarget.cluster.clusterName
    && createdConfig.id === `mock-config-${trimmedName}`;
  const configPreview = selectedTarget && !generationError && !populationError
    ? buildConfigYaml(selectedTarget, generationCount, populationCount, scenarioFlags)
    : '';

  const handleCreateConfig = () => {
    if (!canCreateConfig || !selectedTarget) return;
    const frozenYaml = buildConfigYaml(selectedTarget, generationCount, populationCount, scenarioFlags);
    setCreatedConfig({
      id: `mock-config-${trimmedName}`,
      targetRequestId: selectedTarget.targetRequestId,
      clusterName: selectedTarget.cluster.clusterName,
      yaml: frozenYaml,
      generations: generationCount,
      populationSize: populationCount,
      scenarioTypes: enabledTypes,
    });
    setStep(3);
  };

  const handleStart = () => {
    if (!canStart || !selectedTarget || !createdConfig) return;
    onStart({
      name: trimmedName,
      runId: `mock-run-${trimmedName}`,
      cluster: selectedTarget.cluster,
      targetRequestId: createdConfig.targetRequestId,
      configId: createdConfig.id,
      configYaml: createdConfig.yaml,
      phase: 'Provisioning',
      createdAt: new Date().toISOString(),
      generations: createdConfig.generations,
      populationSize: createdConfig.populationSize,
      completedGenerations: 0,
      scenarios: [],
      progression: [],
      orchestrator: {
        status: 'Pending',
        logLines: ['Illustrative mock orchestration request queued; no Kubernetes resources were created.'],
      },
      uploader: {
        status: 'Not started',
        logLines: ['Mock results uploader has not started.'],
      },
    });
  };

  return (
    <section className="krkn-ai-create" aria-labelledby="krkn-ai-create-title">
      <div className="krkn-ai-page-heading">
        <div>
          <Title id="krkn-ai-create-title" headingLevel="h1">Create Krkn AI run</Title>
          <p>Configure a single-cluster exploration using static mock discovery data.</p>
        </div>
        <Button variant="link" onClick={onCancel}>Cancel</Button>
      </div>
      <Alert variant="info" title="Mock preview — no cluster resources will be created" isInline />
      <ol className="krkn-ai-steps" aria-label="Run creation steps">
        <li aria-current={step === 1 ? 'step' : undefined} className={step === 1 ? 'is-current' : ''}>1. Select target</li>
        <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'is-current' : ''}>2. Discover and configure</li>
        <li aria-current={step === 3 ? 'step' : undefined} className={step === 3 ? 'is-current' : ''}>3. Review and launch</li>
      </ol>

      {step === 1 && (
        <Card>
          <CardTitle>Target and run name</CardTitle>
          <CardBody>
            <FormGroup label="Run name" fieldId="krkn-ai-run-name" isRequired>
              <TextInput
                id="krkn-ai-run-name"
                value={runName}
                onChange={(_event, value) => {
                  setRunName(value);
                  setCreatedConfig(null);
                }}
                validated={nameError ? 'error' : 'default'}
                aria-invalid={!!nameError}
                aria-describedby="krkn-ai-run-name-error"
              />
              {nameError && <p id="krkn-ai-run-name-error" className="krkn-ai-field-error" role="alert">{nameError}</p>}
            </FormGroup>
            <FormGroup label="Cluster" fieldId="krkn-ai-target" isRequired>
              <FormSelect
                id="krkn-ai-target"
                value={selectedTargetRequestId}
                onChange={(_event, value) => {
                  setSelectedTargetRequestId(value);
                  setCreatedConfig(null);
                }}
                aria-label="Select one cluster"
              >
                {mockAiTargets.map((target) => (
                  <FormSelectOption key={target.targetRequestId} value={target.targetRequestId} label={target.cluster.clusterName} />
                ))}
              </FormSelect>
            </FormGroup>
            <div className="krkn-ai-actions">
              <Button variant="primary" isDisabled={!canDiscover} onClick={() => setStep(2)}>Discover components</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && selectedTarget && (
        <>
          <Card>
            <CardTitle>Simulated cluster discovery</CardTitle>
            <CardBody>
              <p className="krkn-ai-muted">Illustrative components for <strong>{selectedTarget.cluster.clusterName}</strong>; no target API was called.</p>
              <dl className="krkn-ai-discovery-grid">
                <div><dt>Namespaces</dt><dd>{selectedTarget.components.namespaces.join(', ')}</dd></div>
                <div><dt>Pods</dt><dd>{selectedTarget.components.pods.join(', ')}</dd></div>
                <div><dt>Services</dt><dd>{selectedTarget.components.services.join(', ')}</dd></div>
                <div><dt>Nodes</dt><dd>{selectedTarget.components.nodes.join(', ')}</dd></div>
              </dl>
              {selectedTarget.recommendations.map((recommendation) => (
                <Alert key={recommendation} variant="success" title="Recommendation" isInline>{recommendation}</Alert>
              ))}
              {selectedTarget.warnings.map((warning) => (
                <Alert key={warning} variant="warning" title="Discovery warning" isInline>{warning}</Alert>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardTitle>Genetic search configuration</CardTitle>
            <CardBody>
              <div className="krkn-ai-number-fields">
                <FormGroup label="Generations" fieldId="krkn-ai-generations" isRequired>
                  <TextInput
                    id="krkn-ai-generations"
                    type="number"
                    min={1}
                    step={1}
                    value={generations}
                    onChange={(_event, value) => {
                      setGenerations(value);
                      setCreatedConfig(null);
                    }}
                    validated={generationError ? 'error' : 'default'}
                    aria-invalid={!!generationError}
                    aria-describedby="krkn-ai-generations-error"
                  />
                  {generationError && <p id="krkn-ai-generations-error" className="krkn-ai-field-error" role="alert">{generationError}</p>}
                </FormGroup>
                <FormGroup label="Population size" fieldId="krkn-ai-population" isRequired>
                  <TextInput
                    id="krkn-ai-population"
                    type="number"
                    min={1}
                    step={1}
                    value={populationSize}
                    onChange={(_event, value) => {
                      setPopulationSize(value);
                      setCreatedConfig(null);
                    }}
                    validated={populationError ? 'error' : 'default'}
                    aria-invalid={!!populationError}
                    aria-describedby="krkn-ai-population-error"
                  />
                  {populationError && <p id="krkn-ai-population-error" className="krkn-ai-field-error" role="alert">{populationError}</p>}
                </FormGroup>
              </div>
              <fieldset className="krkn-ai-scenario-options" aria-describedby="krkn-ai-scenario-error">
                <legend>Recommended scenario types</legend>
                {scenarioTypeOptions.map((option) => (
                  <Checkbox
                    key={option.id}
                    id={`krkn-ai-scenario-${option.id}`}
                    label={option.label}
                    isChecked={scenarioFlags[option.id]}
                    onChange={(_event, checked) => {
                      setScenarioFlags((current) => ({ ...current, [option.id]: checked }));
                      setCreatedConfig(null);
                    }}
                  />
                ))}
                {scenarioError && <p id="krkn-ai-scenario-error" className="krkn-ai-field-error" role="alert">{scenarioError}</p>}
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardTitle>Generated krkn-ai.yaml preview</CardTitle>
            <CardBody>
              <p className="krkn-ai-muted">Read-only deterministic preview. The example kubeconfig path is not a real credential, and target URLs are omitted.</p>
              <textarea className="krkn-ai-yaml" aria-label="Generated krkn-ai.yaml preview" value={configPreview} readOnly rows={24} />
            </CardBody>
          </Card>
          <div className="krkn-ai-actions krkn-ai-actions-between">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" isDisabled={!canCreateConfig} onClick={handleCreateConfig}>Create config (mock)</Button>
          </div>
        </>
      )}

      {step === 3 && selectedTarget && createdConfig && (
        <>
          <Card>
            <CardTitle>Review mock configuration</CardTitle>
            <CardBody>
              <dl className="krkn-ai-review-grid">
                <div><dt>Run</dt><dd>{trimmedName}</dd></div>
                <div><dt>Cluster</dt><dd>{createdConfig.clusterName}</dd></div>
                <div><dt>Mock config ID</dt><dd>{createdConfig.id}</dd></div>
                <div><dt>Expected scenarios</dt><dd>{createdConfig.generations * createdConfig.populationSize}</dd></div>
              </dl>
              <p className="krkn-ai-muted">This config is frozen in memory. Returning to edit its name, target, counts, or scenario selection requires creating the config again.</p>
              <pre className="krkn-ai-yaml" aria-label="Frozen mock configuration YAML">{createdConfig.yaml}</pre>
            </CardBody>
          </Card>
          <div className="krkn-ai-actions krkn-ai-actions-between">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" isDisabled={!canStart} onClick={handleStart}>Start run (mock)</Button>
          </div>
        </>
      )}
    </section>
  );
}

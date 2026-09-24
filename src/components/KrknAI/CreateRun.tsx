import { useState, type ComponentType } from 'react';
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
import {
  ChartLineIcon,
  ClipboardListIcon,
  CubesIcon,
  DnaIcon,
  FileCodeIcon,
  HeartbeatIcon,
  SlidersHIcon,
  TopologyIcon,
} from '@patternfly/react-icons';
import { mockAiTargets } from './mockData';
import { FitnessFunctionEditor } from './FitnessFunctionEditor';
import { HealthChecksEditor } from './HealthChecksEditor';
import { DiscoveryOptionsEditor } from './DiscoveryOptionsEditor';
import { ClusterComponentsEditor } from './ClusterComponentsEditor';
import {
  buildMockConfigYaml,
  copyClusterComponents,
  createDefaultConfigDraft,
  scenarioTypeOptions,
  validateConfigDraft,
} from './configModel';
import {
  defaultMockDiscoveryOptions,
  discoverMockComponents,
  preserveDisabledComponentFlags,
  validateMockDiscoveryOptions,
} from './discoveryOptions';
import type { MockDiscoveryOptions } from './discoveryOptions';
import type {
  ConfigValidationErrors,
  EditableConfigDraft,
  GeneticSettingsDraft,
  ScenarioType,
} from './configModel';
import type { MockAiRun } from './types';
type ConfigurationSectionId =
  | 'scenarios'
  | 'components'
  | 'genetic'
  | 'fitness'
  | 'health'
  | 'run-settings'
  | 'preview';

interface ConfigurationSection {
  id: ConfigurationSectionId;
  label: string;
  summary: string;
  icon: ComponentType;
}

const configurationSections: ConfigurationSection[] = [
  { id: 'scenarios', label: 'Scenarios', summary: 'Select experiment families', icon: ClipboardListIcon },
  { id: 'components', label: 'Cluster components', summary: 'Set the mutation scope', icon: CubesIcon },
  { id: 'genetic', label: 'Genetic algorithm', summary: 'Tune the search strategy', icon: DnaIcon },
  { id: 'fitness', label: 'Fitness functions', summary: 'Define scoring signals', icon: ChartLineIcon },
  { id: 'health', label: 'Health checks', summary: 'Configure mock endpoints', icon: HeartbeatIcon },
  { id: 'run-settings', label: 'Run settings', summary: 'Set timing and output', icon: SlidersHIcon },
  { id: 'preview', label: 'Review YAML', summary: 'Inspect the generated config', icon: FileCodeIcon },
];

interface MockConfig {
  id: string;
  targetRequestId: string;
  clusterName: string;
  yaml: string;
  generations: number;
  populationSize: number;
  scenarioTypes: ScenarioType[];
  fitnessItemCount: number;
  healthCheckCount: number;
  discoveryOptions: MockDiscoveryOptions;
}

interface CreateRunProps {
  existingNames: string[];
  onStart: (run: MockAiRun) => void;
  onCancel: () => void;
}

interface ConfigTextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
}

function ConfigTextField({ id, label, value, onChange, error, helperText }: ConfigTextFieldProps) {
  return (
    <FormGroup label={label} fieldId={id} isRequired>
      <TextInput
        id={id}
        value={value}
        onChange={(_event, nextValue) => onChange(nextValue)}
        validated={error ? 'error' : 'default'}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <p id={`${id}-error`} className="krkn-ai-field-error" role="alert">{error}</p>}
      {!error && helperText && <p className="krkn-ai-muted">{helperText}</p>}
    </FormGroup>
  );
}

interface ConfigNumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  min?: number;
  max?: number;
  step?: number | string;
  optional?: boolean;
}

function ConfigNumberField({ id, label, value, onChange, error, min, max, step, optional = false }: ConfigNumberFieldProps) {
  return (
    <FormGroup label={label} fieldId={id} isRequired={!optional}>
      <TextInput
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(_event, nextValue) => onChange(nextValue)}
        validated={error ? 'error' : 'default'}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <p id={`${id}-error`} className="krkn-ai-field-error" role="alert">{error}</p>}
      {!error && optional && <p className="krkn-ai-muted">Leave blank for null.</p>}
    </FormGroup>
  );
}

function errorFor(errors: ConfigValidationErrors, field: string): string | undefined {
  return errors[field];
}

export function CreateRun({ existingNames, onStart, onCancel }: CreateRunProps) {
  const firstTarget = mockAiTargets[0];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [runName, setRunName] = useState('');
  const [selectedTargetRequestId, setSelectedTargetRequestId] = useState(firstTarget.targetRequestId);
  const [draft, setDraft] = useState<EditableConfigDraft>(() => createDefaultConfigDraft(firstTarget));
  const [discoveryOptions, setDiscoveryOptions] = useState<MockDiscoveryOptions>(defaultMockDiscoveryOptions);
  const [discoveryWarnings, setDiscoveryWarnings] = useState<string[]>([]);
  const [createdConfig, setCreatedConfig] = useState<MockConfig | null>(null);
  const [configurationSection, setConfigurationSection] = useState<ConfigurationSectionId>('scenarios');

  const selectedTarget = mockAiTargets.find((target) => target.targetRequestId === selectedTargetRequestId);
  const trimmedName = runName.trim();
  const nameError = trimmedName.length === 0
    ? 'Run name is required.'
    : !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(trimmedName)
      ? 'Use a DNS label: 1–63 lowercase letters, numbers, or hyphens; start and end with a letter or number.'
      : existingNames.some((name) => name.toLowerCase() === trimmedName.toLowerCase())
        ? 'A run with this name already exists.'
        : undefined;
  const discoveryOptionErrors = validateMockDiscoveryOptions(discoveryOptions);
  const discoveryComponentError = draft.clusterComponents.namespaces.length === 0
    ? `No mock namespaces matched pattern "${discoveryOptions.namespacePattern}". Update the pattern and discover again.`
    : undefined;
  const configErrors = validateConfigDraft(draft);
  const generationCount = Number(draft.genetic.generations);
  const populationCount = Number(draft.genetic.populationSize);
  const enabledTypes = scenarioTypeOptions.filter((option) => draft.scenarioFlags[option.id]).map((option) => option.id);
  const canDiscover = !nameError && !!selectedTarget && Object.keys(discoveryOptionErrors).length === 0;
  const canCreateConfig = !!selectedTarget && !nameError && !discoveryComponentError && Object.keys(configErrors).length === 0;
  const canStart = !!createdConfig
    && !!selectedTarget
    && !nameError
    && Object.keys(configErrors).length === 0
    && !discoveryComponentError
    && createdConfig.targetRequestId === selectedTarget.targetRequestId
    && createdConfig.clusterName === selectedTarget.cluster.clusterName
    && createdConfig.id === `mock-config-${trimmedName}`;
  const configPreview = selectedTarget ? buildMockConfigYaml(selectedTarget, draft) : '';

  const updateDraft = (updates: Partial<EditableConfigDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
    setCreatedConfig(null);
  };

  const updateGenetic = (field: keyof GeneticSettingsDraft, value: string | boolean) => {
    updateDraft({ genetic: { ...draft.genetic, [field]: value } as GeneticSettingsDraft });
  };

  const updateDiscoveryOption = (field: keyof MockDiscoveryOptions, value: string) => {
    setDiscoveryOptions((current) => ({ ...current, [field]: value }));
    setDiscoveryWarnings([]);
    setCreatedConfig(null);
  };

  const handleDiscover = () => {
    if (!canDiscover || !selectedTarget) return;
    const result = discoverMockComponents(selectedTarget, discoveryOptions);
    if (Object.keys(result.errors).length > 0) return;
    setDraft((current) => ({
      ...current,
      clusterComponents: preserveDisabledComponentFlags(result.components, current.clusterComponents),
    }));
    setDiscoveryWarnings(result.warnings);
    setConfigurationSection('scenarios');
    setStep(2);
  };

  const handleTargetChange = (targetRequestId: string) => {
    const nextTarget = mockAiTargets.find((target) => target.targetRequestId === targetRequestId);
    if (!nextTarget) return;
    const oldNamespace = selectedTarget?.components.namespaces[0]?.name;
    const nextNamespace = nextTarget.components.namespaces[0]?.name;
    setSelectedTargetRequestId(targetRequestId);
    setDraft((current) => ({
      ...current,
      clusterComponents: copyClusterComponents(nextTarget.components),
      fitnessItems: oldNamespace && nextNamespace
        ? current.fitnessItems.map((item) => ({
          ...item,
          query: item.query.split(`namespace="${oldNamespace}"`).join(`namespace="${nextNamespace}"`),
        }))
        : current.fitnessItems,
      healthChecks: nextTarget.healthChecks.map((healthCheck, key) => ({
        key,
        name: healthCheck.name,
        url: healthCheck.url,
        statusCode: String(healthCheck.statusCode),
        timeout: String(healthCheck.timeoutSeconds),
        interval: String(healthCheck.intervalSeconds),
      })),
    }));
    setCreatedConfig(null);
    setDiscoveryWarnings([]);
  };

  const handleCreateConfig = () => {
    if (!canCreateConfig || !selectedTarget) return;
    const frozenYaml = buildMockConfigYaml(selectedTarget, draft);
    setCreatedConfig({
      id: `mock-config-${trimmedName}`,
      targetRequestId: selectedTarget.targetRequestId,
      clusterName: selectedTarget.cluster.clusterName,
      yaml: frozenYaml,
      generations: generationCount,
      populationSize: populationCount,
      scenarioTypes: enabledTypes,
      fitnessItemCount: draft.fitnessItems.length,
      healthCheckCount: draft.healthChecks.length,
      discoveryOptions: { ...discoveryOptions },
    });
    setStep(3);
    setConfigurationSection('preview');
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
      mainPod: {
        status: 'Pending',
        logText: 'Illustrative mock run request queued; no Kubernetes resources were created.',
      },
    });
  };
  const configurationSectionIndex = configurationSections.findIndex((section) => section.id === configurationSection);
  const previousConfigurationSection = configurationSections[configurationSectionIndex - 1];
  const nextConfigurationSection = configurationSections[configurationSectionIndex + 1];

  const configurationTitle = (section: ConfigurationSection) => {
    const Icon = section.icon;
    return (
      <div className="krkn-ai-config-wizard__title">
        <span className="krkn-ai-config-wizard__title-icon" aria-hidden="true"><Icon /></span>
        <div>
          <span>{section.label}</span>
          <small>{section.summary}</small>
        </div>
      </div>
    );
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
        <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'is-current' : ''}>2. Configure run</li>
        <li aria-current={step === 3 ? 'step' : undefined} className={step === 3 ? 'is-current' : ''}>3. Review and launch</li>
      </ol>

      {step === 1 && (
        <>
        <Card>
          <CardTitle>
            <div className="krkn-ai-config-wizard__title">
              <span className="krkn-ai-config-wizard__title-icon" aria-hidden="true"><TopologyIcon /></span>
              <span>Run name and cluster</span>
            </div>
          </CardTitle>
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
                onChange={(_event, value) => handleTargetChange(value)}
                aria-label="Select one cluster"
              >
                {mockAiTargets.map((target) => (
                  <FormSelectOption key={target.targetRequestId} value={target.targetRequestId} label={target.cluster.clusterName} />
                ))}
              </FormSelect>
            </FormGroup>
          </CardBody>
        </Card>
        <DiscoveryOptionsEditor
          options={discoveryOptions}
          errors={discoveryOptionErrors}
          onChange={updateDiscoveryOption}
        />
        <div className="krkn-ai-actions">
          <Button variant="primary" isDisabled={!canDiscover} onClick={handleDiscover}>Discover components</Button>
        </div>
        </>
      )}


      {step === 2 && selectedTarget && (
        <div className="krkn-ai-config-wizard">
          <div className="krkn-ai-config-wizard__heading">
            <div>
              <Title headingLevel="h2">Configure the exploration</Title>
              <p>Complete one focused section at a time. Your entries are retained when you move between sections.</p>
            </div>
            <span>Section {configurationSectionIndex + 1} of {configurationSections.length}</span>
          </div>

          <nav aria-label="Configuration sections">
            <ol className="krkn-ai-config-wizard__nav">
              {configurationSections.map((section, index) => {
                const Icon = section.icon;
                const isCurrent = section.id === configurationSection;
                return (
                  <li key={section.id} className={isCurrent ? 'is-current' : index < configurationSectionIndex ? 'is-visited' : ''}>
                    <button
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => setConfigurationSection(section.id)}
                    >
                      <span className="krkn-ai-config-wizard__nav-icon" aria-hidden="true"><Icon /></span>
                      <span>
                        <strong>{section.label}</strong>
                        <small>{section.summary}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {configurationSection === 'scenarios' && (
            <Card>
              <CardTitle>{configurationTitle(configurationSections[0])}</CardTitle>
              <CardBody>
                <Alert variant="info" title="Choose what Krkn AI can explore" isInline>
                  Start with the scenario families relevant to this run. At least one family must remain enabled.
                </Alert>
                <fieldset className="krkn-ai-scenario-options" aria-describedby="krkn-ai-scenario-error">
                  <legend>Recommended safe scenario types</legend>
                  {scenarioTypeOptions.map((option) => (
                    <Checkbox
                      key={option.id}
                      id={`krkn-ai-scenario-${option.id}`}
                      label={option.label}
                      isChecked={draft.scenarioFlags[option.id]}
                      onChange={(_event, checked) => updateDraft({ scenarioFlags: { ...draft.scenarioFlags, [option.id]: checked } })}
                    />
                  ))}
                  {configErrors.scenarioFlags && <p id="krkn-ai-scenario-error" className="krkn-ai-field-error" role="alert">{configErrors.scenarioFlags}</p>}
                </fieldset>
              </CardBody>
            </Card>
          )}

          {configurationSection === 'components' && (
            <Card>
              <CardTitle>{configurationTitle(configurationSections[1])}</CardTitle>
              <CardBody>
                <Alert variant="info" title="Limit the cluster mutation scope" isInline>
                  Disable anything Krkn AI must not target. Disabling a namespace or pod also disables its descendants.
                </Alert>
                {selectedTarget.recommendations.map((recommendation) => (
                  <Alert key={recommendation} variant="success" title="Recommendation" isInline>{recommendation}</Alert>
                ))}
                {selectedTarget.warnings.map((warning) => (
                  <Alert key={warning} variant="warning" title="Discovery warning" isInline>{warning}</Alert>
                ))}
                {discoveryWarnings.map((warning) => (
                  <Alert key={warning} variant="warning" title="Discovery filter warning" isInline>{warning}</Alert>
                ))}
                <ClusterComponentsEditor
                  components={draft.clusterComponents}
                  onChange={(components) => updateDraft({ clusterComponents: components })}
                />
              </CardBody>
            </Card>
          )}

          {configurationSection === 'genetic' && (
            <Card>
              <CardTitle>{configurationTitle(configurationSections[2])}</CardTitle>
              <CardBody>
                <Alert variant="info" title="Control the search breadth" isInline>
                  Generations and population size determine the expected scenario count. Rates must remain between 0 and 1.
                </Alert>
                <div className="krkn-ai-config-fields">
                  <ConfigTextField
                    id="krkn-ai-algorithm"
                    label="Algorithm"
                    value={draft.algorithm}
                    onChange={(value) => updateDraft({ algorithm: value })}
                    error={errorFor(configErrors, 'algorithm')}
                  />
                  <ConfigNumberField id="krkn-ai-generations" label="Generations" value={draft.genetic.generations} onChange={(value) => updateGenetic('generations', value)} error={errorFor(configErrors, 'generations')} min={1} step={1} />
                  <ConfigNumberField id="krkn-ai-population" label="Population size" value={draft.genetic.populationSize} onChange={(value) => updateGenetic('populationSize', value)} error={errorFor(configErrors, 'populationSize')} min={1} step={1} />
                  <ConfigNumberField id="krkn-ai-genetic-duration" label="Genetic duration (seconds)" value={draft.genetic.duration} onChange={(value) => updateGenetic('duration', value)} error={errorFor(configErrors, 'genetic.duration')} min={0} step="any" optional />
                  <ConfigNumberField id="krkn-ai-mutation-rate" label="Mutation rate" value={draft.genetic.mutationRate} onChange={(value) => updateGenetic('mutationRate', value)} error={errorFor(configErrors, 'genetic.mutationRate')} min={0} max={1} step="any" />
                  <ConfigNumberField id="krkn-ai-scenario-mutation-rate" label="Scenario mutation rate" value={draft.genetic.scenarioMutationRate} onChange={(value) => updateGenetic('scenarioMutationRate', value)} error={errorFor(configErrors, 'genetic.scenarioMutationRate')} min={0} max={1} step="any" />
                  <ConfigNumberField id="krkn-ai-crossover-rate" label="Crossover rate" value={draft.genetic.crossoverRate} onChange={(value) => updateGenetic('crossoverRate', value)} error={errorFor(configErrors, 'genetic.crossoverRate')} min={0} max={1} step="any" />
                  <ConfigNumberField id="krkn-ai-composition-rate" label="Composition rate" value={draft.genetic.compositionRate} onChange={(value) => updateGenetic('compositionRate', value)} error={errorFor(configErrors, 'genetic.compositionRate')} min={0} max={1} step="any" />
                  <ConfigTextField id="krkn-ai-selection-strategy" label="Selection strategy" value={draft.genetic.selectionStrategy} onChange={(value) => updateGenetic('selectionStrategy', value)} error={errorFor(configErrors, 'genetic.selectionStrategy')} />
                  <ConfigNumberField id="krkn-ai-tournament-size" label="Tournament size" value={draft.genetic.tournamentSize} onChange={(value) => updateGenetic('tournamentSize', value)} error={errorFor(configErrors, 'genetic.tournamentSize')} min={1} step={1} />
                  <ConfigNumberField id="krkn-ai-population-injection-rate" label="Population injection rate" value={draft.genetic.populationInjectionRate} onChange={(value) => updateGenetic('populationInjectionRate', value)} error={errorFor(configErrors, 'genetic.populationInjectionRate')} min={0} max={1} step="any" />
                  <ConfigNumberField id="krkn-ai-population-injection-size" label="Population injection size" value={draft.genetic.populationInjectionSize} onChange={(value) => updateGenetic('populationInjectionSize', value)} error={errorFor(configErrors, 'genetic.populationInjectionSize')} min={0} step={1} />
                </div>
              </CardBody>
            </Card>
          )}

          {configurationSection === 'fitness' && (
            <Card>
              <CardTitle>{configurationTitle(configurationSections[3])}</CardTitle>
              <CardBody>
                <Alert variant="info" title="Define how scenarios are ranked" isInline>
                  Fitness signals guide scenario selection between generations. Expand only the items you need to adjust.
                </Alert>
                <FitnessFunctionEditor draft={draft} errors={configErrors} onChange={updateDraft} />
              </CardBody>
            </Card>
          )}

          {configurationSection === 'health' && (
            <Card>
              <CardTitle>{configurationTitle(configurationSections[4])}</CardTitle>
              <CardBody>
                <Alert variant="info" title="Describe application availability checks" isInline>
                  These reserved example URLs are serialized into the mock configuration but are never requested.
                </Alert>
                <HealthChecksEditor draft={draft} errors={configErrors} onChange={updateDraft} />
              </CardBody>
            </Card>
          )}

          {configurationSection === 'run-settings' && (
            <>
              <Card>
                <CardTitle>{configurationTitle(configurationSections[5])}</CardTitle>
                <CardBody>
                  <Alert variant="info" title="Set execution defaults" isInline>
                    Kubeconfig remains on the runtime mount. Seed, timing, baseline, and output naming are safe to customize here.
                  </Alert>
                  <div className="krkn-ai-config-fields">
                    <ConfigNumberField id="krkn-ai-seed" label="Seed" value={draft.seed} onChange={(value) => updateDraft({ seed: value })} error={errorFor(configErrors, 'seed')} step={1} optional />
                    <ConfigNumberField id="krkn-ai-wait-duration" label="Wait duration (seconds)" value={draft.waitDuration} onChange={(value) => updateDraft({ waitDuration: value })} error={errorFor(configErrors, 'waitDuration')} min={0} step="any" />
                  </div>
                  <section className="krkn-ai-config-subsection" aria-labelledby="krkn-ai-baseline-heading">
                    <h3 id="krkn-ai-baseline-heading">Baseline</h3>
                    <Checkbox id="krkn-ai-baseline-enabled" label="Enable baseline run" isChecked={draft.baselineEnabled} onChange={(_event, checked) => updateDraft({ baselineEnabled: checked })} />
                    <div className="krkn-ai-config-fields">
                      <ConfigNumberField id="krkn-ai-baseline-duration" label="Duration (seconds)" value={draft.baselineDuration} onChange={(value) => updateDraft({ baselineDuration: value })} error={errorFor(configErrors, 'baselineDuration')} min={0} step="any" />
                    </div>
                  </section>
                  <section className="krkn-ai-config-subsection" aria-labelledby="krkn-ai-output-heading">
                    <h3 id="krkn-ai-output-heading">Output formats</h3>
                    <p className="krkn-ai-muted">Each filename format must retain the <code>%s</code> scenario placeholder.</p>
                    <div className="krkn-ai-config-fields">
                      <ConfigTextField id="krkn-ai-result-name-format" label="result_name_fmt" value={draft.resultNameFormat} onChange={(value) => updateDraft({ resultNameFormat: value })} error={errorFor(configErrors, 'resultNameFormat')} />
                      <ConfigTextField id="krkn-ai-graph-name-format" label="graph_name_fmt" value={draft.graphNameFormat} onChange={(value) => updateDraft({ graphNameFormat: value })} error={errorFor(configErrors, 'graphNameFormat')} />
                      <ConfigTextField id="krkn-ai-log-name-format" label="log_name_fmt" value={draft.logNameFormat} onChange={(value) => updateDraft({ logNameFormat: value })} error={errorFor(configErrors, 'logNameFormat')} />
                    </div>
                  </section>
                </CardBody>
              </Card>
            </>
          )}

          {configurationSection === 'preview' && (
            <Card>
              <CardTitle>{configurationTitle(configurationSections[6])}</CardTitle>
              <CardBody>
                <Alert variant="info" title="Final configuration check" isInline>
                  Review the generated YAML before creating the mock config. Return to any section above to make changes.
                </Alert>
                <p className="krkn-ai-muted">Read-only deterministic preview. Health-check URLs use reserved mock example.com hosts and are never requested. Kubeconfig stays on its runtime mount; credentials, host parameters, headers, and live endpoints are omitted.</p>
                <textarea className="krkn-ai-yaml" aria-label="Generated krkn-ai.yaml preview" value={configPreview} readOnly rows={32} />
                {Object.keys(configErrors).length > 0 && <p className="krkn-ai-field-error" role="status">Fix the highlighted settings before creating this mock config.</p>}
              </CardBody>
            </Card>
          )}

          <div className="krkn-ai-actions krkn-ai-actions-between">
            <Button
              variant="secondary"
              onClick={() => previousConfigurationSection ? setConfigurationSection(previousConfigurationSection.id) : setStep(1)}
            >
              {previousConfigurationSection ? 'Previous section' : 'Back to target'}
            </Button>
            {nextConfigurationSection ? (
              <Button variant="primary" onClick={() => setConfigurationSection(nextConfigurationSection.id)}>Continue</Button>
            ) : (
              <Button variant="primary" isDisabled={!canCreateConfig} onClick={handleCreateConfig}>Create config (mock)</Button>
            )}
          </div>
        </div>
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
                <div><dt>Fitness items</dt><dd>{createdConfig.fitnessItemCount}</dd></div>
                <div><dt>Health checks</dt><dd>{createdConfig.healthCheckCount}</dd></div>
                <div><dt>Namespace pattern</dt><dd>{createdConfig.discoveryOptions.namespacePattern}</dd></div>
                <div><dt>Pod label-key pattern</dt><dd>{createdConfig.discoveryOptions.podLabelPattern}</dd></div>
                <div><dt>Node label-key pattern</dt><dd>{createdConfig.discoveryOptions.nodeLabelPattern}</dd></div>
              </dl>
              <p className="krkn-ai-muted">This complete YAML config is frozen in memory. Returning to edit any setting requires creating the config again.</p>
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

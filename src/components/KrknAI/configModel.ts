import type { MockAiClusterComponents, MockAiDisabledComponent, MockAiTarget } from './types';

export const scenarioTypeOptions = [
  { id: 'storage-throttle', label: 'Storage throttle', configKey: 'storage_throttle' },
  { id: 'dns-outage', label: 'DNS outage', configKey: 'dns_outage' },
  { id: 'container-scenarios', label: 'Container scenarios', configKey: 'container_scenarios' },
  { id: 'pvc-scenarios', label: 'PVC scenarios', configKey: 'pvc_scenarios' },
] as const;

export type ScenarioType = (typeof scenarioTypeOptions)[number]['id'];
export type ScenarioFlags = Record<ScenarioType, boolean>;
export type FitnessValueType = 'point' | 'range';

export interface FitnessItemDraft {
  key: number;
  id: string;
  title: string;
  query: string;
  type: FitnessValueType;
  weight: string;
}

export interface HealthCheckDraft {
  key: number;
  name: string;
  url: string;
  statusCode: string;
  timeout: string;
  interval: string;
}

export interface GeneticSettingsDraft {
  duration: string;
  generations: string;
  populationSize: string;
  mutationRate: string;
  scenarioMutationRate: string;
  crossoverRate: string;
  compositionRate: string;
  selectionStrategy: string;
  tournamentSize: string;
  populationInjectionRate: string;
  populationInjectionSize: string;
}

export interface EditableConfigDraft {
  seed: string;
  waitDuration: string;
  baselineEnabled: boolean;
  baselineDuration: string;
  scenarioFlags: ScenarioFlags;
  algorithm: string;
  genetic: GeneticSettingsDraft;
  healthChecks: HealthCheckDraft[];
  stopWatcherOnFailure: boolean;
  stopTimeout: string;
  fitnessQuery: string;
  fitnessType: FitnessValueType;
  includeKrknFailure: boolean;
  includeHealthCheckFailure: boolean;
  includeHealthCheckResponseTime: boolean;
  fitnessItems: FitnessItemDraft[];
  clusterComponents: MockAiClusterComponents;
  resultNameFormat: string;
  graphNameFormat: string;
  logNameFormat: string;
}

export type ConfigValidationErrors = Record<string, string>;

type FitnessItemTemplate = readonly [title: string, query: string];

const fitnessItemTemplates: FitnessItemTemplate[] = [
  ['Pod container restarts', '(sum(increase(kube_pod_container_status_restarts_total{namespace="{{namespace}}"}[$range$]))) or vector(0)'],
  ['Pods not ready', '(sum(kube_pod_status_phase{namespace="{{namespace}}", phase=~"Pending|Failed|Unknown"})) or vector(0)'],
  ['OOM-killed containers', '(sum(kube_pod_container_status_last_terminated_reason{namespace="{{namespace}}", reason="OOMKilled"})) or vector(0)'],
  ['Container CPU throttling', '(max(rate(container_cpu_cfs_throttled_periods_total{namespace="{{namespace}}", container!=""}[$range$]) / rate(container_cpu_cfs_periods_total{namespace="{{namespace}}", container!=""}[$range$]))) or vector(0)'],
  ['Node pressure conditions', '(sum(kube_node_status_condition{condition=~"MemoryPressure|DiskPressure|PIDPressure", status="true"})) or vector(0)'],
  ['API server 5xx rate', '(sum(rate(apiserver_request_total{code=~"5.."}[$range$])) / sum(rate(apiserver_request_total[$range$]))) or vector(0)'],
  ['API server p99 request latency', '(histogram_quantile(0.99, sum(rate(apiserver_request_duration_seconds_bucket{verb!~"WATCH|CONNECT"}[$range$])) by (le))) or vector(0)'],
  ['Unready nodes', '(sum(kube_node_status_condition{condition="Ready", status="true"} == bool 0)) or vector(0)'],
  ['Unavailable deployment replicas', '(clamp_min(sum(kube_deployment_spec_replicas{namespace="{{namespace}}"} - kube_deployment_status_replicas_available{namespace="{{namespace}}"}), 0)) or vector(0)'],
  ['Unavailable StatefulSet replicas', '(clamp_min(sum(kube_statefulset_status_replicas{namespace="{{namespace}}"} - kube_statefulset_status_replicas_ready{namespace="{{namespace}}"}), 0)) or vector(0)'],
  ['CrashLoopBackOff containers', '(sum(kube_pod_container_status_waiting_reason{namespace="{{namespace}}", reason="CrashLoopBackOff"})) or vector(0)'],
  ['Disruption budget shortfall', '(clamp_min(sum(kube_poddisruptionbudget_status_desired_healthy{namespace="{{namespace}}"} - kube_poddisruptionbudget_status_current_healthy{namespace="{{namespace}}"}), 0)) or vector(0)'],
  ['Pending persistent volume claims', '(sum(kube_persistentvolumeclaim_status_phase{namespace="{{namespace}}", phase="Pending"})) or vector(0)'],
  ['etcd p99 request latency', '(histogram_quantile(0.99, sum(rate(etcd_request_duration_seconds_bucket[$range$])) by (le))) or vector(0)'],
  ['etcd request error rate', '((sum(rate(etcd_request_errors_total[$range$])) / sum(rate(etcd_requests_total[$range$]))) and (sum(rate(etcd_requests_total[$range$])) > 0)) or vector(0)'],
  ['API server storage size', '(max(apiserver_storage_size_bytes)) or vector(0)'],
];

function copyDisabledComponent(component: MockAiDisabledComponent): MockAiDisabledComponent {
  return {
    ...component,
    ...(component.labels ? { labels: { ...component.labels } } : {}),
  };
}

export function copyClusterComponents(components: MockAiClusterComponents): MockAiClusterComponents {
  return {
    namespaces: components.namespaces.map((namespace) => ({
      ...namespace,
      ...(namespace.labels ? { labels: { ...namespace.labels } } : {}),
      pods: namespace.pods.map((pod) => ({
        ...pod,
        labels: { ...pod.labels },
        containers: pod.containers.map(copyDisabledComponent),
      })),
      services: namespace.services.map(copyDisabledComponent),
      pvcs: namespace.pvcs.map(copyDisabledComponent),
    })),
    nodes: components.nodes.map(copyDisabledComponent),
  };
}

export function createDefaultConfigDraft(target: MockAiTarget): EditableConfigDraft {
  const namespace = target.components.namespaces[0]?.name ?? 'default';
  return {
    seed: '',
    waitDuration: '0',
    baselineEnabled: true,
    baselineDuration: '30',
    scenarioFlags: {
      'storage-throttle': true,
      'dns-outage': true,
      'container-scenarios': true,
      'pvc-scenarios': true,
    },
    algorithm: 'genetic',
    genetic: {
      duration: '',
      generations: '6',
      populationSize: '4',
      mutationRate: '0.7',
      scenarioMutationRate: '0.6',
      crossoverRate: '0.6',
      compositionRate: '0.0',
      selectionStrategy: 'tournament',
      tournamentSize: '6',
      populationInjectionRate: '0.0',
      populationInjectionSize: '2',
    },
    healthChecks: target.healthChecks.map((healthCheck, key) => ({
      key,
      name: healthCheck.name,
      url: healthCheck.url,
      statusCode: String(healthCheck.statusCode),
      timeout: String(healthCheck.timeoutSeconds),
      interval: String(healthCheck.intervalSeconds),
    })),
    clusterComponents: copyClusterComponents(target.components),
    stopWatcherOnFailure: false,
    stopTimeout: '5.0',
    fitnessQuery: 'sum(kube_pod_container_status_restarts_total)',
    fitnessType: 'point',
    includeKrknFailure: true,
    includeHealthCheckFailure: true,
    includeHealthCheckResponseTime: true,
    fitnessItems: fitnessItemTemplates.map(([title, query], id) => ({
      key: id,
      id: String(id),
      title,
      query: query.replace(/\{\{namespace\}\}/g, namespace),
      type: 'range',
      weight: '0.0625',
    })),
    resultNameFormat: 'scenario_%s.yaml',
    graphNameFormat: 'scenario_%s.png',
    logNameFormat: 'scenario_%s.log',
  };
}

function numberError(
  value: string,
  label: string,
  options: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {},
): string | undefined {
  if (options.optional && value.trim() === '') return undefined;
  const parsed = Number(value);
  if (value.trim() === '' || !Number.isFinite(parsed)) return `Enter a valid ${label}.`;
  if (options.integer && !Number.isInteger(parsed)) return `${label} must be a whole number.`;
  if (options.min !== undefined && parsed < options.min) return `${label} must be at least ${options.min}.`;
  if (options.max !== undefined && parsed > options.max) return `${label} must be at most ${options.max}.`;
  return undefined;
}

export function validateConfigDraft(draft: EditableConfigDraft): ConfigValidationErrors {
  const errors: ConfigValidationErrors = {};
  const addError = (field: string, error: string | undefined) => {
    if (error) errors[field] = error;
  };
  const genetic = draft.genetic;

  addError('seed', numberError(draft.seed, 'Seed', { integer: true, optional: true }));
  addError('waitDuration', numberError(draft.waitDuration, 'Wait duration', { min: 0 }));
  addError('baselineDuration', numberError(draft.baselineDuration, 'Baseline duration', { min: 0 }));
  addError('generations', numberError(genetic.generations, 'Generations', { min: 1, integer: true }));
  addError('populationSize', numberError(genetic.populationSize, 'Population size', { min: 1, integer: true }));
  addError('genetic.duration', numberError(genetic.duration, 'Genetic duration', { min: 0, optional: true }));
  addError('genetic.mutationRate', numberError(genetic.mutationRate, 'Mutation rate', { min: 0, max: 1 }));
  addError('genetic.scenarioMutationRate', numberError(genetic.scenarioMutationRate, 'Scenario mutation rate', { min: 0, max: 1 }));
  addError('genetic.crossoverRate', numberError(genetic.crossoverRate, 'Crossover rate', { min: 0, max: 1 }));
  addError('genetic.compositionRate', numberError(genetic.compositionRate, 'Composition rate', { min: 0, max: 1 }));
  addError('genetic.tournamentSize', numberError(genetic.tournamentSize, 'Tournament size', { min: 1, integer: true }));
  addError('genetic.populationInjectionRate', numberError(genetic.populationInjectionRate, 'Population injection rate', { min: 0, max: 1 }));
  addError('genetic.populationInjectionSize', numberError(genetic.populationInjectionSize, 'Population injection size', { min: 0, integer: true }));
  addError('genetic.selectionStrategy', genetic.selectionStrategy.trim() ? undefined : 'Selection strategy is required.');
  addError('algorithm', draft.algorithm.trim() ? undefined : 'Algorithm is required.');
  addError('stopTimeout', numberError(draft.stopTimeout, 'Health-check stop timeout', { min: 0 }));
  addError('fitnessQuery', draft.fitnessQuery.trim() ? undefined : 'Fitness query is required.');

  if (!scenarioTypeOptions.some((option) => draft.scenarioFlags[option.id])) {
    errors.scenarioFlags = 'Enable at least one scenario type.';
  }
  if (draft.fitnessItems.length === 0) errors.fitnessItems = 'Add at least one fitness function item.';
  const fitnessIds = new Set<string>();
  for (const item of draft.fitnessItems) {
    const itemKey = `fitnessItem.${item.key}`;
    if (!/^\d+$/.test(item.id) || Number(item.id) < 0) {
      errors[`${itemKey}.id`] = 'Item ID must be a non-negative whole number.';
    } else if (fitnessIds.has(item.id)) {
      errors[`${itemKey}.id`] = 'Fitness item IDs must be unique.';
    }
    fitnessIds.add(item.id);
    if (!item.query.trim()) errors[`${itemKey}.query`] = 'PromQL query is required.';
    addError(`${itemKey}.weight`, numberError(item.weight, 'Weight', { min: 0, max: 1 }));
  }

  for (const check of draft.healthChecks) {
    const itemKey = `healthCheck.${check.key}`;
    if (!check.name.trim()) errors[`${itemKey}.name`] = 'Health-check name is required.';
    try {
      const url = new URL(check.url);
      const isExampleHost = url.hostname === 'example.com' || url.hostname.endsWith('.example.com');
      if (!['http:', 'https:'].includes(url.protocol) || !isExampleHost) {
        errors[`${itemKey}.url`] = 'Use a complete HTTP or HTTPS URL on the reserved example.com domain.';
      }
    } catch {
      errors[`${itemKey}.url`] = 'Enter a complete HTTP or HTTPS URL.';
    }
    addError(`${itemKey}.statusCode`, numberError(check.statusCode, 'Expected status code', { min: 100, max: 599, integer: true }));
    addError(`${itemKey}.timeout`, numberError(check.timeout, 'Health-check timeout', { min: 1 }));
    addError(`${itemKey}.interval`, numberError(check.interval, 'Health-check interval', { min: 1 }));
  }

  const outputFormats: Array<[string, string, string]> = [
    ['resultNameFormat', draft.resultNameFormat, 'Result filename format'],
    ['graphNameFormat', draft.graphNameFormat, 'Graph filename format'],
    ['logNameFormat', draft.logNameFormat, 'Log filename format'],
  ];
  for (const [field, value, label] of outputFormats) {
    if (!value.includes('%s')) errors[field] = `${label} must include the %s scenario placeholder.`;
  }
  return errors;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}


function yamlNumber(value: string, optional = false): string {
  if (optional && value.trim() === '') return 'null';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : yamlString(value);
}

export function buildMockConfigYaml(target: MockAiTarget, draft: EditableConfigDraft): string {
  const lines = [
    '# Mock preview configuration; no credentials or live endpoints are used.',
    `# Synthetic target cluster: ${target.cluster.clusterName}`,
    'kubeconfig_file_path: /input/kubeconfig',
    `seed: ${yamlNumber(draft.seed, true)}`,
    `wait_duration: ${yamlNumber(draft.waitDuration)}`,
    'baseline:',
    `  enable: ${draft.baselineEnabled}`,
    `  duration: ${yamlNumber(draft.baselineDuration)}`,
    'health_checks:',
    `  stop_watcher_on_failure: ${draft.stopWatcherOnFailure}`,
    `  stop_timeout: ${yamlNumber(draft.stopTimeout)}`,
    ...(draft.healthChecks.length === 0 ? ['  applications: []'] : ['  applications:']),
  ];

  if (draft.healthChecks.length > 0) {
    for (const check of draft.healthChecks) {
      lines.push(
        `    - name: ${yamlString(check.name)}`,
        `      url: ${yamlString(check.url)}`,
        `      status_code: ${yamlNumber(check.statusCode)}`,
        `      timeout: ${yamlNumber(check.timeout)}`,
        `      interval: ${yamlNumber(check.interval)}`,
      );
    }
  }

  lines.push('  headers: null', 'scenario:');
  for (const option of scenarioTypeOptions) {
    lines.push(`  ${option.configKey}:`, `    enable: ${draft.scenarioFlags[option.id]}`);
  }

  const genetic = draft.genetic;
  lines.push(
    'allow_dangerous_scenarios: false',
    `algorithm: ${yamlString(draft.algorithm)}`,
    'genetic:',
    `  duration: ${yamlNumber(genetic.duration, true)}`,
    `  generations: ${yamlNumber(genetic.generations)}`,
    `  population_size: ${yamlNumber(genetic.populationSize)}`,
    `  mutation_rate: ${yamlNumber(genetic.mutationRate)}`,
    `  scenario_mutation_rate: ${yamlNumber(genetic.scenarioMutationRate)}`,
    `  crossover_rate: ${yamlNumber(genetic.crossoverRate)}`,
    `  composition_rate: ${yamlNumber(genetic.compositionRate)}`,
    `  selection_strategy: ${yamlString(genetic.selectionStrategy)}`,
    `  tournament_size: ${yamlNumber(genetic.tournamentSize)}`,
    `  population_injection_rate: ${yamlNumber(genetic.populationInjectionRate)}`,
    `  population_injection_size: ${yamlNumber(genetic.populationInjectionSize)}`,
    'fitness_function:',
    `  query: ${yamlString(draft.fitnessQuery)}`,
    `  type: ${draft.fitnessType}`,
    `  include_krkn_failure: ${draft.includeKrknFailure}`,
    `  include_health_check_failure: ${draft.includeHealthCheckFailure}`,
    `  include_health_check_response_time: ${draft.includeHealthCheckResponseTime}`,
    '  items:',
  );

  for (const item of draft.fitnessItems) {
    lines.push(
      `  - id: ${yamlNumber(item.id)}`,
      `    query: ${yamlString(item.query)}`,
      `    type: ${item.type}`,
      `    weight: ${yamlNumber(item.weight)}`,
    );
  }

  lines.push(
    'output:',
    `  result_name_fmt: ${yamlString(draft.resultNameFormat)}`,
    `  graph_name_fmt: ${yamlString(draft.graphNameFormat)}`,
    `  log_name_fmt: ${yamlString(draft.logNameFormat)}`,
  );
  const components = draft.clusterComponents;
  lines.push('cluster_components:', '  namespaces:');
  if (components.namespaces.length === 0) lines.push('    []');
  for (const namespace of components.namespaces) {
    lines.push(
      `    - name: ${yamlString(namespace.name)}`,
      `      disabled: ${namespace.disabled}`,
      `      pods:${namespace.pods.length === 0 ? ' []' : ''}`,
    );
    for (const pod of namespace.pods) {
      lines.push(
        `        - name: ${yamlString(pod.name)}`,
        `          disabled: ${pod.disabled}`,
        `          labels:${Object.keys(pod.labels).length === 0 ? ' {}' : ''}`,
      );
      for (const [label, value] of Object.entries(pod.labels)) {
        lines.push(`            ${yamlString(label)}: ${yamlString(value)}`);
      }
      lines.push(`          containers:${pod.containers.length === 0 ? ' []' : ''}`);
      for (const container of pod.containers) {
        lines.push(`            - name: ${yamlString(container.name)}`, `              disabled: ${container.disabled}`);
      }
    }
    lines.push(`      services:${namespace.services.length === 0 ? ' []' : ''}`);
    for (const service of namespace.services) {
      lines.push(`        - name: ${yamlString(service.name)}`, `          disabled: ${service.disabled}`);
    }
    lines.push(`      pvcs:${namespace.pvcs.length === 0 ? ' []' : ''}`);
    for (const pvc of namespace.pvcs) {
      lines.push(`        - name: ${yamlString(pvc.name)}`, `          disabled: ${pvc.disabled}`);
    }
  }
  lines.push(`  nodes:${components.nodes.length === 0 ? ' []' : ''}`);
  for (const node of components.nodes) {
    const labels = Object.entries(node.labels ?? {});
    lines.push(
      `    - name: ${yamlString(node.name)}`,
      `      disabled: ${node.disabled}`,
      `      labels:${labels.length === 0 ? ' {}' : ''}`,
    );
    for (const [label, value] of labels) lines.push(`        ${yamlString(label)}: ${yamlString(value)}`);
  }
  return lines.join('\n');
}

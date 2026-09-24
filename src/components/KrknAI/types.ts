import type { SelectedCluster } from '../../types/api';

export type MockAiRunPhase = 'Pending' | 'Provisioning' | 'Running' | 'Succeeded' | 'Failed' | 'Cancelled';
export type MockAiScenarioOutcome = 'Succeeded' | 'Failed';
export type MockAiMainPodStatus = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Not created';
export type MockAiHealthStatus = 'Healthy' | 'Degraded' | 'Failed' | 'Unavailable';

export type MockAiScenarioParameter =
  | 'namespace'
  | 'duration'
  | 'pvc-name'
  | 'target-service'
  | 'action'
  | 'throttle-type'
  | 'read-iops'
  | 'write-iops'
  | 'fill-percentage';

export interface MockAiDisabledComponent {
  name: string;
  disabled: boolean;
  labels?: Record<string, string>;
}

export interface MockAiPodComponent extends MockAiDisabledComponent {
  labels: Record<string, string>;
  containers: MockAiDisabledComponent[];
}

export interface MockAiNamespaceComponent extends MockAiDisabledComponent {
  pods: MockAiPodComponent[];
  services: MockAiDisabledComponent[];
  pvcs: MockAiDisabledComponent[];
}

export interface MockAiClusterComponents {
  namespaces: MockAiNamespaceComponent[];
  nodes: MockAiDisabledComponent[];
}

export interface MockAiHealthCheck {
  name: string;
  url: string;
  statusCode: number;
  timeoutSeconds: number;
  intervalSeconds: number;
}

export interface MockAiTarget {
  cluster: SelectedCluster;
  targetRequestId: string;
  components: MockAiClusterComponents;
  healthChecks: MockAiHealthCheck[];
  recommendations: string[];
  warnings: string[];
}

export interface MockAiHealthCheckSample {
  application: string;
  secondsIntoScenario: number;
  responseTimeSeconds: number;
  statusCode: number;
  success: boolean;
}

export interface MockAiScenarioHealth {
  status: MockAiHealthStatus;
  totalChecks: number;
  failedChecks: number;
  samples: MockAiHealthCheckSample[];
}

export interface MockAiScenario {
  scenarioId: number;
  /** Zero-based generation ID from the sample run. */
  generation: number;
  scenarioType: string;
  fitnessScore: number;
  durationSeconds: number;
  outcome: MockAiScenarioOutcome;
  podName: string;
  logLines: string[];
  parameters: Partial<Record<MockAiScenarioParameter, string>>;
  /** Allowlisted arguments only; the executable and environment are intentionally omitted. */
  arguments: string[];
  parentIds: string[];
  origin: string;
  healthCheckFailureScore?: number;
  healthCheckResponseTimeScore?: number;
  krknFailureScore?: number;
  returnCode?: number;
  healthChecks: MockAiScenarioHealth;
}

export interface MockAiFitnessPoint {
  /** Zero-based generation ID. */
  generation: number;
  best: number;
  average: number;
}

export interface MockAiRun {
  name: string;
  runId?: string;
  cluster: SelectedCluster;
  targetRequestId: string;
  configId: string;
  /** Frozen YAML for an in-memory mock config, when created in this session. */
  configYaml?: string;
  /** Operator-facing phase; distinct from Krkn AI results.json.status. */
  phase: MockAiRunPhase;
  createdAt: string;
  generations: number;
  populationSize: number;
  completedGenerations: number | null;
  scenarios: MockAiScenario[];
  progression: MockAiFitnessPoint[];
  baselineFitness?: number;
  mainPod: {
    podName?: string;
    status: MockAiMainPodStatus;
    logLines: string[];
  };
  failureReason?: string;
  /** Fixed, non-polling snapshot annotation for seeded in-progress fixtures. */
  snapshotLabel?: string;
}

import { buildMockConfigYaml, createDefaultConfigDraft } from './configModel';
import { orchestratorLogText, scenarioLogTextById } from './scenarioLogData';
import type { MockAiFitnessPoint, MockAiHealthCheckSample, MockAiRun, MockAiScenario, MockAiTarget } from './types';

const clusterNames = {
  east: 'staging-us-east-1',
  west: 'staging-eu-west-1',
  prod: 'prod-us-central1',
} as const;

export const mockAiTargets: MockAiTarget[] = [
  {
    cluster: { operatorName: 'krkn-operator', clusterName: clusterNames.east, clusterApiUrl: 'https://api.staging-east.example.com:6443' },
    targetRequestId: `mock-ai-target-${clusterNames.east}`,
    components: {
      namespaces: [{
        name: 'robot-shop',
        disabled: false,
        pods: [
          { name: 'cart-1', disabled: false, labels: { service: 'cart' }, containers: [{ name: 'cart', disabled: false }] },
          { name: 'payment-1', disabled: false, labels: { service: 'payment' }, containers: [{ name: 'payment', disabled: false }] },
          { name: 'redis-0', disabled: false, labels: { service: 'redis' }, containers: [{ name: 'redis', disabled: false }] },
          { name: 'dispatch-1', disabled: false, labels: { service: 'dispatch' }, containers: [{ name: 'dispatch', disabled: false }] },
        ],
        services: [
          { name: 'cart', disabled: false },
          { name: 'payment', disabled: false },
          { name: 'redis', disabled: false },
          { name: 'dispatch', disabled: false },
        ],
        pvcs: [{ name: 'data-redis-0', disabled: false }],
      }],
      nodes: [
        { name: 'worker-1', disabled: false, labels: { 'kubernetes.io/hostname': 'worker-1', 'node-role.kubernetes.io/worker': '' } },
        { name: 'worker-2', disabled: false, labels: { 'kubernetes.io/hostname': 'worker-2', 'node-role.kubernetes.io/worker': '' } },
      ],
    },
    healthChecks: [{ name: 'robot-shop', url: 'https://robot-shop-health.staging-east.example.com/healthz', statusCode: 200, timeoutSeconds: 4, intervalSeconds: 2 }],
    recommendations: ['Storage and network scenario families are available in this mock discovery.'],
    warnings: [],
  },
  {
    cluster: { operatorName: 'krkn-operator', clusterName: clusterNames.west, clusterApiUrl: 'https://api.staging-west.example.com:6443' },
    targetRequestId: `mock-ai-target-${clusterNames.west}`,
    components: {
      namespaces: [{
        name: 'shop-staging',
        disabled: false,
        pods: [
          { name: 'cart-1', disabled: false, labels: { service: 'cart' }, containers: [{ name: 'cart', disabled: false }] },
          { name: 'payment-1', disabled: false, labels: { service: 'payment' }, containers: [{ name: 'payment', disabled: false }] },
        ],
        services: [{ name: 'cart', disabled: false }, { name: 'payment', disabled: false }],
        pvcs: [],
      }],
      nodes: [{ name: 'worker-1', disabled: false, labels: { 'kubernetes.io/hostname': 'worker-1', 'node-role.kubernetes.io/worker': '' } }],
    },
    healthChecks: [{ name: 'shop-staging', url: 'https://shop-staging-health.staging-west.example.com/healthz', statusCode: 200, timeoutSeconds: 4, intervalSeconds: 2 }],
    recommendations: ['Pod and container scenario families are available in this mock discovery.'],
    warnings: [],
  },
  {
    cluster: { operatorName: 'krkn-operator', clusterName: clusterNames.prod, clusterApiUrl: 'https://api.prod.example.com:6443' },
    targetRequestId: `mock-ai-target-${clusterNames.prod}`,
    components: {
      namespaces: [{
        name: 'payments',
        disabled: false,
        pods: [
          { name: 'checkout-1', disabled: false, labels: { service: 'checkout' }, containers: [{ name: 'checkout', disabled: false }] },
          { name: 'ledger-1', disabled: false, labels: { service: 'ledger' }, containers: [{ name: 'ledger', disabled: false }] },
        ],
        services: [{ name: 'checkout', disabled: false }, { name: 'ledger', disabled: false }],
        pvcs: [],
      }],
      nodes: [
        { name: 'worker-1', disabled: false, labels: { 'kubernetes.io/hostname': 'worker-1', 'node-role.kubernetes.io/worker': '' } },
        { name: 'worker-2', disabled: false, labels: { 'kubernetes.io/hostname': 'worker-2', 'node-role.kubernetes.io/worker': '' } },
      ],
    },
    healthChecks: [],
    recommendations: ['Review the health-check configuration before selecting a scenario family.'],
    warnings: ['No active health checks in this mock discovery'],
  },
];

// The source run's scenario UUIDs are retained only to preserve lineage parent IDs.
const scenarioUuids: Record<number, string> = {
  1: '020f3fab-57f9-43f8-8f92-5831eb6b7c57',
  2: 'b6bf2f13-c725-4c0a-8ba9-bd18404d3662',
  3: 'a44a99df-2a5d-4756-be84-ff94256cb3d9',
  4: '31fa768a-489d-4b53-9047-250d184d7623',
  5: 'd2dfcb62-1cb4-4f75-8699-8cecda4f3604',
  6: '00efc10e-314d-4645-8587-fb93ee99cb56',
  7: 'f2dea19c-4ba6-4b97-ac95-3a03b0946915',
  8: '59185fe9-cf72-439c-8108-78bd70c0669e',
  9: '24eda424-0c04-44d4-be04-4d911a2884e7',
  10: '0de7ac60-e8a9-4f3d-8304-4372b06dbac1',
  11: 'c9d56c43-b039-4274-8623-01b9f4aabba3',
  12: 'c1871b79-176a-4e7e-9414-2555b9bc56ce',
  13: '0197b047-b6a7-4209-b9df-cecd761a9a02',
  14: '3701f2e2-920c-4d9d-a54d-2e52b2b4239b',
  15: 'f3bbec30-ca16-44ee-8829-e8eeb9cf9e3d',
  16: 'f99cc160-24b8-4e19-a211-254c780e11a8',
  17: '20373b85-02e0-4dc2-9e49-9060bf9a7e49',
  18: 'd74b1e5f-d8b2-4339-b702-6fd6abd621f5',
  19: 'a8d80772-40c7-4378-9bd0-827a8b69e175',
  20: 'a810c0eb-e015-4fc1-bb63-4bb35633536b',
  21: 'f88ca614-607e-4c17-a0f9-0f59a27064d6',
  22: 'e8be358b-2746-46d4-a8c8-192c31effd5c',
  23: 'b9239e4c-e036-4a00-9043-8e1292b9e0a0',
  24: 'c3eaccb4-dab6-48fb-9924-4d7eb970d079',
};

type RawScenario = [
  id: number,
  generation: number,
  scenarioType: string,
  fitness: number,
  durationSeconds: number,
  parameters: MockAiScenario['parameters'],
  parentScenarioIds: number[],
  origin: string,
  healthCheckFailureScore: number,
  healthCheckResponseTimeScore: number,
  krknFailureScore: number,
  returnCode: number | null,
];

// CSV parameters are allowlisted; commands, image values, and credentials are excluded.
const rawScenarios: RawScenario[] = [
  [1, 0, 'storage-throttle', 26.798, 234.18, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'iops', 'read-iops': '80', 'write-iops': '353', duration: '60' }, [], 'initial', 0.116, 0.7849, 0, null],
  [2, 0, 'storage-throttle', 16.6341, 139.37, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'both', 'read-iops': '418', 'write-iops': '489', duration: '60' }, [], 'initial', 0.1122, 0.4322, 0, null],
  [3, 0, 'pod-scenarios', 13.4904, 82.46, { namespace: 'robot-shop' }, [], 'initial', 0.1111, 0.3237, 0, null],
  [4, 0, 'pod-scenarios', 13.0093, 57.32, { namespace: 'robot-shop' }, [], 'initial', 0.1085, 0.3263, 0, null],
  [5, 1, 'syn-flood', 20.5855, 136.47, { namespace: 'robot-shop', 'target-service': 'mysql' }, [2, 2], 'type_mutation', 0.1111, 0.6459, 0, null],
  [6, 1, 'storage-throttle', 30.4453, 140.98, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'iops', 'read-iops': '12', 'write-iops': '278', duration: '60' }, [2, 2], 'parameter_mutation', 0.1139, 0.9584, 0, null],
  [7, 1, 'dns-outage', 30.1776, 193.29, { namespace: 'robot-shop' }, [1, 2], 'type_mutation', 0.1188, 0.965, 0, null],
  [8, 1, 'pvc-scenarios', 25.3652, 146.86, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'fill-percentage': '16', duration: '60' }, [1, 2], 'type_mutation', 0.1159, 0.8363, 0, null],
  [9, 2, 'container-scenarios', 27.9348, 111.65, { namespace: 'robot-shop', action: '1' }, [6, 6], 'type_mutation', 0.1097, 0.928, 0, null],
  [10, 2, 'storage-throttle', 17.699, 159.04, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'both', 'read-iops': '275', 'write-iops': '458', duration: '60' }, [6, 6], 'parameter_mutation', 0.1155, 0.5307, 0, null],
  [11, 2, 'syn-flood', 17.7204, 116.93, { namespace: 'robot-shop', 'target-service': 'mongodb' }, [6, 7], 'type_mutation', 0.1179, 0.5909, 0, null],
  [12, 2, 'storage-throttle', 18.8781, 142.21, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'iops', 'read-iops': '59', 'write-iops': '105', duration: '60' }, [6, 7], 'type_mutation', 0.116, 0.4516, 0, null],
  [13, 3, 'storage-throttle', 19.0744, 140.01, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'iops', 'read-iops': '198', 'write-iops': '87', duration: '60' }, [9, 9], 'type_mutation', 0.1218, 0.5189, 0, null],
  [14, 3, 'pvc-scenarios', 17.7563, 144.15, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'fill-percentage': '10', duration: '60' }, [9, 9], 'type_mutation', 0.1149, 0.595, 0, null],
  [15, 3, 'storage-throttle', 21.7345, 149.56, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'iops', 'read-iops': '204', 'write-iops': '274', duration: '60' }, [9, 12], 'type_mutation', 0.1152, 0.6311, 0, null],
  [16, 3, 'pvc-scenarios', 22.5432, 140.97, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'fill-percentage': '86', duration: '60' }, [9, 12], 'type_mutation', 0.1032, 0.6627, 0, null],
  [17, 4, 'container-scenarios', -1, 80.18, { namespace: 'robot-shop', action: '1' }, [16, 15], 'type_mutation', 0, 0, -1, 1],
  [18, 4, 'syn-flood', 15.2516, 123.64, { namespace: 'robot-shop', 'target-service': 'ratings' }, [16, 15], 'type_mutation', 0.0963, 0.39, 0, null],
  [19, 4, 'storage-throttle', 17.7387, 140.35, { namespace: 'robot-shop', 'pvc-name': 'data-redis-0', 'throttle-type': 'iops', 'read-iops': '42', 'write-iops': '396', duration: '60' }, [13, 13], 'parameter_mutation', 0.0987, 0.4649, 0, null],
  [20, 4, 'syn-flood', 15.393, 121.19, { namespace: 'robot-shop', 'target-service': 'dispatch' }, [13, 13], 'type_mutation', 0.0947, 0.4585, 0, null],
  [21, 5, 'time-scenarios', 16.6958, 148.49, { action: 'skew_date', namespace: 'robot-shop' }, [20, 20], 'type_mutation', 0.1027, 0.5026, 0, null],
  [22, 5, 'node-memory-hog', 12.5558, 128.47, { namespace: 'robot-shop' }, [20, 20], 'type_mutation', 0.1021, 0.2029, 0, null],
  [23, 5, 'node-io-hog', 16.2195, 128.75, { namespace: 'robot-shop' }, [19, 19], 'type_mutation', 0.0979, 0.4243, 0, null],
  [24, 5, 'dns-outage', 10.1455, 303.11, { namespace: 'robot-shop' }, [19, 19], 'type_mutation', 0.0955, 0.1952, 0, null],
];

const healthCheckCounts: Record<number, readonly [total: number, failed: number]> = {
  1: [500, 58], 2: [312, 35], 3: [189, 21], 4: [129, 14],
  5: [306, 34], 6: [316, 36], 7: [421, 50], 8: [328, 38],
  9: [237, 26], 10: [355, 41], 11: [263, 31], 12: [319, 37],
  13: [312, 38], 14: [322, 37], 15: [330, 38], 16: [310, 32],
  17: [176, 17], 18: [270, 26], 19: [304, 30], 20: [264, 25],
  21: [331, 34], 22: [284, 29], 23: [286, 28], 24: [670, 64],
};

type RawHealthSample = readonly [
  application: string,
  secondsIntoScenario: number,
  responseTimeSeconds: number,
  statusCode: number,
  success: boolean,
];

// Sanitized, downsampled points from generation_0/scenario_1.yaml. URLs and errors are omitted.
const representativeHealthSamples: RawHealthSample[] = [
  ['rs', 1.2, 1.188, 200, true], ['rs', 73.3, 0.515, 200, true], ['rs', 138.6, 1.277, 200, true], ['rs', 232.8, 1.244, 200, true],
  ['cart', 1.2, 1.187, 200, true], ['cart', 74, 1.332, 200, true], ['cart', 136.5, 1.24, 200, true], ['cart', 230.8, 0.517, 200, true],
  ['catalogue', 1.2, 1.189, 200, true], ['catalogue', 72.5, 1.444, 200, true], ['catalogue', 137.7, 1.232, 200, true], ['catalogue', 232.8, 1.238, 200, true],
  ['payment', 1.2, 1.188, 200, true], ['payment', 70.7, 1.412, 200, true], ['payment', 136.2, 1.196, 200, true], ['payment', 231, 1.227, 200, true],
  ['ratings', 2, 1.225, 404, false], ['ratings', 74.6, 0.498, 404, false], ['ratings', 137.9, 1.543, 404, false], ['ratings', 234.2, 1.277, 404, false],
  ['shipping', 1.2, 1.185, 200, true], ['shipping', 71.3, 1.768, 200, true], ['shipping', 134.9, 1.294, 200, true], ['shipping', 230.5, 1.197, 200, true],
  ['user', 1.2, 1.201, 200, true], ['user', 75.3, 1.221, 200, true], ['user', 139.7, 1.258, 200, true], ['user', 232.6, 1.271, 200, true],
];

function buildHealthCheckSamples(durationSeconds: number): MockAiHealthCheckSample[] {
  const durationScale = durationSeconds / 234.2;
  return representativeHealthSamples.map(([application, seconds, responseTimeSeconds, statusCode, success]) => ({
    application,
    secondsIntoScenario: Number((seconds * durationScale).toFixed(1)),
    responseTimeSeconds,
    statusCode,
    success,
  }));
}

const scenarios: MockAiScenario[] = rawScenarios.map(([scenarioId, generation, scenarioType, fitnessScore, durationSeconds, parameters, parentScenarioIds, origin, healthCheckFailureScore, healthCheckResponseTimeScore, krknFailureScore, returnCode]) => {
  const podName = `mock-krkn-scenario-${scenarioId}`;
  const failed = returnCode !== null;
  const [totalChecks, failedChecks] = healthCheckCounts[scenarioId];
  return {
    scenarioId,
    generation,
    scenarioType,
    fitnessScore,
    durationSeconds,
    outcome: failed ? 'Failed' : 'Succeeded',
    podName,
    logText: scenarioLogTextById[scenarioId] ?? '',
    arguments: [
      '--scenario',
      scenarioType,
      ...Object.entries(parameters).flatMap(([name, value]) => [`--${name}`, value]),
    ],
    parameters,
    parentIds: parentScenarioIds.map((id) => scenarioUuids[id]),
    origin,
    healthCheckFailureScore,
    healthCheckResponseTimeScore,
    krknFailureScore,
    ...(returnCode === null ? {} : { returnCode }),
    healthChecks: {
      status: failedChecks === 0 ? 'Healthy' : failedChecks === totalChecks ? 'Failed' : 'Degraded',
      totalChecks,
      failedChecks,
      samples: buildHealthCheckSamples(durationSeconds),
    },
  };
});

const progression: MockAiFitnessPoint[] = [
  { generation: 0, best: 26.798, average: 17.4829 },
  { generation: 1, best: 30.4453, average: 26.6434 },
  { generation: 2, best: 27.9348, average: 20.5581 },
  { generation: 3, best: 22.5432, average: 20.2771 },
  { generation: 4, best: 17.7387, average: 11.8458 },
  { generation: 5, best: 16.6958, average: 13.9042 },
];

const eastTarget = mockAiTargets[0];
const westTarget = mockAiTargets[1];
const mockLog = (message: string) => `Illustrative mock log snippet; no live pod was queried.\n${message}`;

const configYamlFor = (target: MockAiTarget) => buildMockConfigYaml(target, createDefaultConfigDraft(target));

const completedRun: MockAiRun = {
  name: 'robot-shop-exploration',
  runId: '90715e34-b0ff-40cd-b96f-9b6cdd59a033',
  cluster: eastTarget.cluster,
  targetRequestId: eastTarget.targetRequestId,
  configId: 'mock-config-robot-shop-exploration',
  configYaml: configYamlFor(eastTarget),
  phase: 'Succeeded',
  createdAt: '2026-08-18T13:15:30.549208+00:00',
  generations: 6,
  populationSize: 4,
  completedGenerations: 6,
  scenarios,
  progression,
  baselineFitness: 7.3001,
  mainPod: {
    podName: 'mock-krkn-ai-orchestrator-robot-shop-exploration',
    status: 'Succeeded',
    logText: orchestratorLogText,
  },
};

const runningScenarios = scenarios.filter((scenario) => scenario.generation < 2);

const runningRun: MockAiRun = {
  name: 'staging-preview-in-progress',
  runId: 'mock-run-staging-preview-in-progress',
  cluster: eastTarget.cluster,
  targetRequestId: eastTarget.targetRequestId,
  configId: 'mock-config-staging-preview-in-progress',
  configYaml: configYamlFor(eastTarget),
  phase: 'Running',
  createdAt: '2026-09-23T09:20:00Z',
  generations: 6,
  populationSize: 4,
  completedGenerations: 2,
  scenarios: runningScenarios,
  progression: progression.slice(0, 2),
  mainPod: {
    podName: 'mock-krkn-ai-orchestrator-staging-preview-in-progress',
    status: 'Running',
    logText: mockLog('Fixed mock snapshot: two generations are complete.'),
  },
  snapshotLabel: 'Fixed mock snapshot — no polling',
};

const failedRun: MockAiRun = {
  name: 'failed-preview',
  runId: 'mock-run-failed-preview',
  cluster: westTarget.cluster,
  targetRequestId: westTarget.targetRequestId,
  configId: 'mock-config-failed-preview',
  configYaml: configYamlFor(westTarget),
  phase: 'Failed',
  createdAt: '2026-09-23T08:10:00Z',
  generations: 6,
  populationSize: 4,
  completedGenerations: null,
  scenarios: [],
  progression: [],
  mainPod: {
    podName: 'mock-krkn-ai-orchestrator-failed-preview',
    status: 'Failed',
    logText: mockLog('Illustrative main pod exited non-zero.'),
  },
  failureReason: 'Illustrative orchestrator pod exited non-zero',
};

export const mockAiRuns: MockAiRun[] = [completedRun, runningRun, failedRun];

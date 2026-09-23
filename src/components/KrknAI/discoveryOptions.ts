import { copyClusterComponents } from './configModel';
import type { MockAiClusterComponents, MockAiPodComponent, MockAiTarget } from './types';

export interface MockDiscoveryOptions {
  namespacePattern: string;
  podLabelPattern: string;
  nodeLabelPattern: string;
}

export type DiscoveryOptionErrors = Record<keyof MockDiscoveryOptions, string>;

export const defaultMockDiscoveryOptions: MockDiscoveryOptions = {
  namespacePattern: '*',
  podLabelPattern: '*',
  nodeLabelPattern: '*',
};

interface PatternMatcher {
  matchAll: boolean;
  includePatterns: RegExp[];
  excludePatterns: RegExp[];
  error?: string;
  matches: (value: string) => boolean;
}

function compilePattern(pattern: string): RegExp {
  const hasRegexSyntax = /[.*+?^${}()|[\]\\]/.test(pattern);
  const expression = hasRegexSyntax
    ? pattern
    : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^(?:${expression})$`);
}

function createPatternMatcher(pattern: string, defaultMatchAll: boolean): PatternMatcher {
  const trimmedPattern = pattern.trim();
  if (trimmedPattern.length === 0) {
    return {
      matchAll: defaultMatchAll,
      includePatterns: [],
      excludePatterns: [],
      matches: () => defaultMatchAll,
    };
  }

  const parts = trimmedPattern.split(',').map((part) => part.trim()).filter(Boolean);
  const hasWildcard = parts.includes('*');
  const includePatterns: RegExp[] = [];
  const excludePatterns: RegExp[] = [];

  try {
    for (const part of parts) {
      if (part === '*') continue;
      if (part.startsWith('!')) {
        const excludedPattern = part.slice(1);
        if (excludedPattern) excludePatterns.push(compilePattern(excludedPattern));
      } else if (!hasWildcard) {
        includePatterns.push(compilePattern(part));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid regular expression.';
    return { matchAll: false, includePatterns: [], excludePatterns: [], error: message, matches: () => false };
  }

  const matchAll = hasWildcard || (includePatterns.length === 0 && excludePatterns.length > 0);
  return {
    matchAll,
    includePatterns,
    excludePatterns,
    matches: (value) => !excludePatterns.some((matcher) => matcher.test(value))
      && (matchAll || includePatterns.some((matcher) => matcher.test(value))),
  };
}

export function validateMockDiscoveryOptions(options: MockDiscoveryOptions): Partial<DiscoveryOptionErrors> {
  const errors: Partial<DiscoveryOptionErrors> = {};
  const patterns: Array<[keyof MockDiscoveryOptions, string, boolean, string]> = [
    ['namespacePattern', options.namespacePattern, false, 'Namespace'],
    ['podLabelPattern', options.podLabelPattern, true, 'Pod label-key'],
    ['nodeLabelPattern', options.nodeLabelPattern, true, 'Node label-key'],
  ];
  for (const [field, value, defaultMatchAll, label] of patterns) {
    const matcher = createPatternMatcher(value, defaultMatchAll);
    if (matcher.error) errors[field] = `${label} pattern is invalid: ${matcher.error}`;
  }
  return errors;
}

function filteredLabels(labels: Record<string, string> | undefined, matcher: PatternMatcher): Record<string, string> {
  return Object.fromEntries(Object.entries(labels ?? {}).filter(([label]) => matcher.matches(label)));
}

export function discoverMockComponents(target: MockAiTarget, options: MockDiscoveryOptions): {
  components: MockAiClusterComponents;
  errors: Partial<DiscoveryOptionErrors>;
  warnings: string[];
} {
  const errors = validateMockDiscoveryOptions(options);
  const components = copyClusterComponents(target.components);
  if (Object.keys(errors).length > 0) return { components, errors, warnings: [] };

  const namespaceMatcher = createPatternMatcher(options.namespacePattern, false);
  const podLabelMatcher = createPatternMatcher(options.podLabelPattern, true);
  const nodeLabelMatcher = createPatternMatcher(options.nodeLabelPattern, true);
  if (!nodeLabelMatcher.matchAll && nodeLabelMatcher.includePatterns.length > 0
    && !nodeLabelMatcher.matches('kubernetes.io/hostname')) {
    nodeLabelMatcher.includePatterns.push(compilePattern('kubernetes.io/hostname'));
  }

  components.namespaces = components.namespaces
    .filter((namespace) => namespaceMatcher.matches(namespace.name))
    .map((namespace) => ({
      ...namespace,
      pods: namespace.pods.map((pod) => ({ ...pod, labels: filteredLabels(pod.labels, podLabelMatcher) })),
    }));
  components.nodes = components.nodes.map((node) => ({
    ...node,
    labels: filteredLabels(node.labels, nodeLabelMatcher),
  }));

  const warnings = components.namespaces.length === 0
    ? [`No namespaces matched pattern ${JSON.stringify(options.namespacePattern)}.`]
    : [];
  return { components, errors: {}, warnings };
}

function preserveDisabledFlag<T extends { disabled: boolean }>(current: T, previous?: T): T {
  return { ...current, disabled: previous?.disabled ?? current.disabled };
}

function preservePodFlags(pod: MockAiPodComponent, previous?: MockAiPodComponent): MockAiPodComponent {
  const previousContainers = new Map((previous?.containers ?? []).map((container) => [container.name, container]));
  return {
    ...pod,
    disabled: previous?.disabled ?? pod.disabled,
    containers: pod.containers.map((container) => preserveDisabledFlag(container, previousContainers.get(container.name))),
  };
}

export function preserveDisabledComponentFlags(
  components: MockAiClusterComponents,
  previous: MockAiClusterComponents,
): MockAiClusterComponents {
  const previousNamespaces = new Map(previous.namespaces.map((namespace) => [namespace.name, namespace]));
  const previousNodes = new Map(previous.nodes.map((node) => [node.name, node]));

  return {
    namespaces: components.namespaces.map((namespace) => {
      const oldNamespace = previousNamespaces.get(namespace.name);
      const oldPods = new Map((oldNamespace?.pods ?? []).map((pod) => [pod.name, pod]));
      const oldServices = new Map((oldNamespace?.services ?? []).map((service) => [service.name, service]));
      const oldPvcs = new Map((oldNamespace?.pvcs ?? []).map((pvc) => [pvc.name, pvc]));
      return {
        ...namespace,
        disabled: oldNamespace?.disabled ?? namespace.disabled,
        pods: namespace.pods.map((pod) => preservePodFlags(pod, oldPods.get(pod.name))),
        services: namespace.services.map((service) => preserveDisabledFlag(service, oldServices.get(service.name))),
        pvcs: namespace.pvcs.map((pvc) => preserveDisabledFlag(pvc, oldPvcs.get(pvc.name))),
      };
    }),
    nodes: components.nodes.map((node) => preserveDisabledFlag(node, previousNodes.get(node.name))),
  };
}

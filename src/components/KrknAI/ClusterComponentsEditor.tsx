import { Checkbox } from '@patternfly/react-core';
import type { MockAiClusterComponents } from './types';

interface ClusterComponentsEditorProps {
  components: MockAiClusterComponents;
  onChange: (components: MockAiClusterComponents) => void;
}

type ComponentLocation =
  | { kind: 'namespace'; namespaceIndex: number }
  | { kind: 'pod'; namespaceIndex: number; podIndex: number }
  | { kind: 'container'; namespaceIndex: number; podIndex: number; containerIndex: number }
  | { kind: 'service'; namespaceIndex: number; componentIndex: number }
  | { kind: 'pvc'; namespaceIndex: number; componentIndex: number }
  | { kind: 'node'; componentIndex: number };

function withDisabledFlag(components: MockAiClusterComponents, location: ComponentLocation, disabled: boolean): MockAiClusterComponents {
  if (location.kind === 'node') {
    return {
      ...components,
      nodes: components.nodes.map((node, index) => index === location.componentIndex ? { ...node, disabled } : node),
    };
  }

  return {
    ...components,
    namespaces: components.namespaces.map((namespace, namespaceIndex) => {
      if (namespaceIndex !== location.namespaceIndex) return namespace;
      if (location.kind === 'namespace') return { ...namespace, disabled };
      if (location.kind === 'pod') {
        return {
          ...namespace,
          pods: namespace.pods.map((pod, podIndex) => podIndex === location.podIndex ? { ...pod, disabled } : pod),
        };
      }
      if (location.kind === 'container') {
        return {
          ...namespace,
          pods: namespace.pods.map((pod, podIndex) => podIndex === location.podIndex
            ? { ...pod, containers: pod.containers.map((container, containerIndex) => containerIndex === location.containerIndex ? { ...container, disabled } : container) }
            : pod),
        };
      }
      if (location.kind === 'service') {
        return {
          ...namespace,
          services: namespace.services.map((service, index) => index === location.componentIndex ? { ...service, disabled } : service),
        };
      }
      return {
        ...namespace,
        pvcs: namespace.pvcs.map((pvc, index) => index === location.componentIndex ? { ...pvc, disabled } : pvc),
      };
    }),
  };
}

export function ClusterComponentsEditor({ components, onChange }: ClusterComponentsEditorProps) {
  const toggle = (location: ComponentLocation, disabled: boolean) => {
    onChange(withDisabledFlag(components, location, disabled));
  };

  return (
    <div className="krkn-ai-component-editor">
      <p className="krkn-ai-muted">Use the disabled flags to exclude discovered mock components from the generated YAML. Names and discovery metadata remain fixed.</p>
      <div className="krkn-ai-component-namespaces">
        {components.namespaces.map((namespace, namespaceIndex) => (
          <details key={namespace.name} className="krkn-ai-component-namespace">
            <summary>
              <strong>Namespace {namespace.name}</strong> · {namespace.disabled ? 'disabled' : 'enabled'}
            </summary>
            <div className="krkn-ai-component-namespace-content">
              <Checkbox
                id={`krkn-ai-disable-namespace-${namespaceIndex}`}
                label={`Disable namespace ${namespace.name}`}
                isChecked={namespace.disabled}
                onChange={(_event, checked) => toggle({ kind: 'namespace', namespaceIndex }, checked)}
              />
              <fieldset className="krkn-ai-component-group">
                <legend>Pods and containers</legend>
                {namespace.pods.length === 0 && <p className="krkn-ai-muted">No mock pods discovered.</p>}
                {namespace.pods.map((pod, podIndex) => (
                  <div key={pod.name} className="krkn-ai-component-pod">
                    <Checkbox
                      id={`krkn-ai-disable-pod-${namespaceIndex}-${podIndex}`}
                      label={`Disable pod ${pod.name}`}
                      isChecked={pod.disabled}
                      onChange={(_event, checked) => toggle({ kind: 'pod', namespaceIndex, podIndex }, checked)}
                    />
                    <div className="krkn-ai-component-children">
                      <span>Containers</span>
                      {pod.containers.length === 0 && <p className="krkn-ai-muted">No mock containers discovered.</p>}
                      {pod.containers.map((container, containerIndex) => (
                        <Checkbox
                          key={containerIndex}
                          id={`krkn-ai-disable-container-${namespaceIndex}-${podIndex}-${containerIndex}`}
                          label={`Disable container ${container.name} in ${pod.name}`}
                          isChecked={container.disabled}
                          onChange={(_event, checked) => toggle({ kind: 'container', namespaceIndex, podIndex, containerIndex }, checked)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
              <fieldset className="krkn-ai-component-group">
                <legend>Services</legend>
                {namespace.services.length === 0 && <p className="krkn-ai-muted">No mock services discovered.</p>}
                {namespace.services.map((service, componentIndex) => (
                  <Checkbox
                    key={service.name}
                    id={`krkn-ai-disable-service-${namespaceIndex}-${componentIndex}`}
                    label={`Disable service ${service.name}`}
                    isChecked={service.disabled}
                    onChange={(_event, checked) => toggle({ kind: 'service', namespaceIndex, componentIndex }, checked)}
                  />
                ))}
              </fieldset>
              <fieldset className="krkn-ai-component-group">
                <legend>Persistent volume claims</legend>
                {namespace.pvcs.length === 0 && <p className="krkn-ai-muted">No mock PVCs discovered.</p>}
                {namespace.pvcs.map((pvc, componentIndex) => (
                  <Checkbox
                    key={pvc.name}
                    id={`krkn-ai-disable-pvc-${namespaceIndex}-${componentIndex}`}
                    label={`Disable PVC ${pvc.name}`}
                    isChecked={pvc.disabled}
                    onChange={(_event, checked) => toggle({ kind: 'pvc', namespaceIndex, componentIndex }, checked)}
                  />
                ))}
              </fieldset>
            </div>
          </details>
        ))}
      </div>
      <fieldset className="krkn-ai-component-group krkn-ai-node-group">
        <legend>Nodes</legend>
        {components.nodes.length === 0 && <p className="krkn-ai-muted">No mock nodes discovered.</p>}
        {components.nodes.map((node, componentIndex) => (
          <Checkbox
            key={node.name}
            id={`krkn-ai-disable-node-${componentIndex}`}
            label={`Disable node ${node.name}`}
            isChecked={node.disabled}
            onChange={(_event, checked) => toggle({ kind: 'node', componentIndex }, checked)}
          />
        ))}
      </fieldset>
    </div>
  );
}

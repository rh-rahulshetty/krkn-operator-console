import { Card, CardBody, CardTitle, FormGroup, TextInput } from '@patternfly/react-core';
import type { MockDiscoveryOptions } from './discoveryOptions';
import type { DiscoveryOptionErrors } from './discoveryOptions';

interface DiscoveryOptionsEditorProps {
  options: MockDiscoveryOptions;
  errors: Partial<DiscoveryOptionErrors>;
  onChange: (field: keyof MockDiscoveryOptions, value: string) => void;
}

export function DiscoveryOptionsEditor({ options, errors, onChange }: DiscoveryOptionsEditorProps) {
  return (
    <Card>
      <CardTitle>Discovery options</CardTitle>
      <CardBody>
        <p className="krkn-ai-muted">These mock options mirror the Krkn AI discovery request and filter the synthetic inventory locally; no discovery HTTP request is sent. Use <code>*</code> to match everything; comma-separated and exclusion patterns are supported. A blank skip pattern excludes no pods.</p>
        <div className="krkn-ai-config-fields">
          <FormGroup label="Namespace pattern" fieldId="krkn-ai-discovery-namespace-pattern" isRequired>
            <TextInput
              id="krkn-ai-discovery-namespace-pattern"
              value={options.namespacePattern}
              onChange={(_event, value) => onChange('namespacePattern', value)}
              validated={errors.namespacePattern ? 'error' : 'default'}
              aria-invalid={!!errors.namespacePattern}
            />
            {errors.namespacePattern && <p className="krkn-ai-field-error" role="alert">{errors.namespacePattern}</p>}
          </FormGroup>
          <FormGroup label="Pod label-key pattern" fieldId="krkn-ai-discovery-pod-label-pattern" isRequired>
            <TextInput
              id="krkn-ai-discovery-pod-label-pattern"
              value={options.podLabelPattern}
              onChange={(_event, value) => onChange('podLabelPattern', value)}
              validated={errors.podLabelPattern ? 'error' : 'default'}
              aria-invalid={!!errors.podLabelPattern}
            />
            {errors.podLabelPattern && <p className="krkn-ai-field-error" role="alert">{errors.podLabelPattern}</p>}
          </FormGroup>
          <FormGroup label="Node label-key pattern" fieldId="krkn-ai-discovery-node-label-pattern" isRequired>
            <TextInput
              id="krkn-ai-discovery-node-label-pattern"
              value={options.nodeLabelPattern}
              onChange={(_event, value) => onChange('nodeLabelPattern', value)}
              validated={errors.nodeLabelPattern ? 'error' : 'default'}
              aria-invalid={!!errors.nodeLabelPattern}
            />
            {errors.nodeLabelPattern && <p className="krkn-ai-field-error" role="alert">{errors.nodeLabelPattern}</p>}
          </FormGroup>
        </div>
      </CardBody>
    </Card>
  );
}

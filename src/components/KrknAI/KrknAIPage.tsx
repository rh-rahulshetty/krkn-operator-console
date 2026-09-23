import { useState } from 'react';
import { Alert, Button, Card, CardBody, CardTitle, Title } from '@patternfly/react-core';
import { CreateRun } from './CreateRun';
import { RunDetail } from './RunDetail';
import { RunList } from './RunList';
import type { MockAiRun } from './types';
import './KrknAI.css';

interface KrknAIPageProps {
  runs: MockAiRun[];
  onAddRun: (run: MockAiRun) => void;
}

export function KrknAIPage({ runs, onAddRun }: KrknAIPageProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = runs.find((run) => (run.runId ?? run.name) === selectedRunId);

  const handleStart = (run: MockAiRun) => {
    onAddRun(run);
    setIsCreating(false);
    setSelectedRunId(run.runId ?? run.name);
  };

  return (
    <div className="krkn-ai">
      {isCreating ? (
        <CreateRun
          existingNames={runs.map((run) => run.name)}
          onStart={handleStart}
          onCancel={() => setIsCreating(false)}
        />
      ) : selectedRunId ? (
        selectedRun ? (
          <RunDetail run={selectedRun} onBack={() => setSelectedRunId(null)} />
        ) : (
          <section className="krkn-ai-unknown-run" aria-labelledby="krkn-ai-unknown-title">
            <Title id="krkn-ai-unknown-title" headingLevel="h1">Run not found</Title>
            <Alert variant="info" title="Mock preview — no cluster resources will be created" isInline />
            <Card>
              <CardTitle>Unknown mock run ID</CardTitle>
              <CardBody>
                <Alert variant="warning" title="This run is not in the current session list" isInline />
                <Button variant="secondary" onClick={() => setSelectedRunId(null)}>Return to Krkn AI runs</Button>
              </CardBody>
            </Card>
          </section>
        )
      ) : (
        <RunList
          runs={runs}
          onCreate={() => setIsCreating(true)}
          onSelect={setSelectedRunId}
        />
      )}
    </div>
  );
}

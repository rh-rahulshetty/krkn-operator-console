import { Button, Card, CardBody, CardTitle, Label, Title } from '@patternfly/react-core';
import { FitnessChart } from './FitnessChart';
import { ScenarioExplorer } from './ScenarioExplorer';
import { StaticLogText } from './StaticLogText';
import type { MockAiRun } from './types';

interface RunDetailProps {
  run: MockAiRun;
  onBack: () => void;
}

interface MockLogPanelProps {
  title: string;
  description: string;
  logText: string;
}

const formatFitness = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 });

function MockLogPanel({ title, logText, description }: MockLogPanelProps) {
  return (
    <section className="krkn-ai-log-panel" aria-label={title}>
      <h4>{title}</h4>
      <p className="krkn-ai-illustrative-note">{description}</p>
      <StaticLogText logText={logText} />
    </section>
  );
}


export function RunDetail({ run, onBack }: RunDetailProps) {
  const bestFitness = run.progression.length > 0
    ? Math.max(...run.progression.map((point) => point.best))
    : null;
  const averageFitness = run.scenarios.length > 0
    ? run.scenarios.reduce((total, scenario) => total + scenario.fitnessScore, 0) / run.scenarios.length
    : null;

  return (
    <main className="krkn-ai-run-detail">
      <header className="krkn-ai-run-detail__header">
        <Button variant="secondary" onClick={onBack} className="krkn-ai-run-detail__back">Back to runs</Button>
        <p className="krkn-ai-mock-banner">Mock preview — no cluster resources will be created.</p>
        <div className="krkn-ai-run-detail__title-row">
          <div>
            <Title headingLevel="h1" size="2xl">{run.name}</Title>
            <p className="krkn-ai-run-detail__cluster">Cluster: {run.cluster.clusterName}</p>
          </div>
          <Label color={run.phase === 'Succeeded' ? 'green' : run.phase === 'Failed' ? 'red' : run.phase === 'Running' ? 'blue' : 'grey'}>
            {run.phase}
          </Label>
        </div>
        <dl className="krkn-ai-run-detail__metadata">
          <div><dt>Started</dt><dd><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString()}</time></dd></div>
          <div><dt>Scenarios executed</dt><dd>{run.scenarios.length}</dd></div>
          <div><dt>Best fitness</dt><dd>{bestFitness === null ? 'Not available yet' : `${formatFitness(bestFitness)} fitness units`}</dd></div>
          <div><dt>Average fitness</dt><dd>{averageFitness === null ? 'Not available yet' : `${formatFitness(averageFitness)} fitness units`}</dd></div>
        </dl>
        {run.failureReason && <p className="krkn-ai-run-detail__failure">{run.failureReason}</p>}
        {run.snapshotLabel && <p className="krkn-ai-snapshot-label">{run.snapshotLabel}</p>}
      </header>

      <Card className="krkn-ai-run-detail__config">
        <CardTitle><Title headingLevel="h2" size="lg">Run configuration</Title></CardTitle>
        <CardBody>
          <p>Config ID: <code>{run.configId}</code></p>
          <details>
            <summary>View krkn-ai.yaml used for this run</summary>
            {run.configYaml
              ? <pre className="krkn-ai-run-detail__yaml">{run.configYaml}</pre>
              : <p className="krkn-ai-not-available">Not available yet</p>}
          </details>
        </CardBody>
      </Card>

      <Card className="krkn-ai-run-detail__main-logs">
        <CardTitle><Title headingLevel="h2" size="lg">Main pod log</Title></CardTitle>
        <CardBody>
          <dl className="krkn-ai-main-pod__metadata">
            <div><dt>Pod</dt><dd>{run.mainPod.podName ?? 'Not available yet'}</dd></div>
            <div><dt>Status</dt><dd>{run.mainPod.status}</dd></div>
          </dl>
          <MockLogPanel
            title="Main pod output"
            logText={run.mainPod.logText}
            description={run.runId === '90715e34-b0ff-40cd-b96f-9b6cdd59a033'
              ? 'Static copy of the supplied run.log with ANSI formatting rendered — no live pod was queried.'
              : 'Illustrative static log fixture — no live pod was queried.'}
          />
        </CardBody>
      </Card>

      <Card className="krkn-ai-run-detail__fitness">
        <CardBody>
          <FitnessChart points={run.progression} runName={run.name} />
          {run.baselineFitness !== undefined && (
            <p className="krkn-ai-baseline-fitness">
              Illustrative baseline fitness: {formatFitness(run.baselineFitness)} fitness units
            </p>
          )}
        </CardBody>
      </Card>

      <ScenarioExplorer key={run.runId ?? run.name} scenarios={run.scenarios} runPhase={run.phase} />
    </main>
  );
}

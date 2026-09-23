import { useEffect, useState } from 'react';
import { Button, Card, CardBody, CardTitle, Label, Title } from '@patternfly/react-core';
import { FitnessChart } from './FitnessChart';
import type { MockAiRun, MockAiScenario } from './types';

interface RunDetailProps {
  run: MockAiRun;
  onBack: () => void;
}

interface MockLogPanelProps {
  title: string;
  logLines: string[];
}

const formatFitness = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 });

function MockLogPanel({ title, logLines }: MockLogPanelProps) {
  return (
    <section className="krkn-ai-log-panel" aria-label={title}>
      <h4>{title}</h4>
      <p className="krkn-ai-illustrative-note">Illustrative mock log text — no live pod was queried.</p>
      {logLines.length > 0
        ? <pre className="krkn-ai-log-panel__lines">{logLines.join('\n')}</pre>
        : <p className="krkn-ai-not-available">Not available yet</p>}
    </section>
  );
}

interface ScenarioDetailProps {
  scenario: MockAiScenario;
  runPhase: MockAiRun['phase'];
}

function ScenarioDetail({ scenario, runPhase }: ScenarioDetailProps) {
  const parameters = Object.entries(scenario.parameters);
  const metrics = [
    ['Health-check failure score', scenario.healthCheckFailureScore],
    ['Health-check response-time score', scenario.healthCheckResponseTimeScore],
    ['Krkn failure score', scenario.krknFailureScore],
  ] as const;

  return (
    <Card className="krkn-ai-scenario-detail">
      <CardTitle>
        <div className="krkn-ai-scenario-detail__heading">
          <div>
            <Title headingLevel="h3" size="lg">Scenario {scenario.scenarioId}: {scenario.scenarioType}</Title>
            <p className="krkn-ai-scenario-detail__pod">Scenario pod: <code>{scenario.podName}</code></p>
          </div>
          <Label color={scenario.outcome === 'Failed' ? 'red' : 'green'}>{scenario.outcome}</Label>
        </div>
      </CardTitle>
      <CardBody>
        {scenario.outcome === 'Failed' && (
          <p className="krkn-ai-scenario-detail__failure">
            This scenario failed; the overall run phase is {runPhase}.
            {scenario.returnCode === undefined ? '' : ` Illustrative return code: ${scenario.returnCode}.`}
          </p>
        )}
        <dl className="krkn-ai-scenario-detail__summary">
          <div><dt>Generation</dt><dd>{scenario.generation + 1}</dd></div>
          <div><dt>Duration</dt><dd>{scenario.durationSeconds.toLocaleString(undefined, { maximumFractionDigits: 2 })} seconds</dd></div>
          <div><dt>Fitness score</dt><dd>{formatFitness(scenario.fitnessScore)} fitness units</dd></div>
        </dl>

        <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-run-config-${scenario.scenarioId}`}>
          <h4 id={`krkn-ai-run-config-${scenario.scenarioId}`}>Scenario run configuration</h4>
          {parameters.length > 0 ? (
            <dl className="krkn-ai-scenario-detail__parameters">
              {parameters.map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          ) : <p className="krkn-ai-not-available">Not available yet</p>}
          <div className="krkn-ai-scenario-detail__arguments">
            <h5>Allowlisted run arguments</h5>
            <p className="krkn-ai-illustrative-note">The executable, environment, and credentials are intentionally omitted.</p>
            {scenario.arguments.length > 0
              ? <pre className="krkn-ai-log-panel__lines">{scenario.arguments.join(' ')}</pre>
              : <p className="krkn-ai-not-available">Not available yet</p>}
          </div>
        </section>

        <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-fitness-result-${scenario.scenarioId}`}>
          <h4 id={`krkn-ai-fitness-result-${scenario.scenarioId}`}>Fitness function result</h4>
          <p>Total recorded fitness: <strong>{formatFitness(scenario.fitnessScore)} fitness units</strong></p>
          <dl className="krkn-ai-scenario-detail__metrics">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value === undefined ? 'Not available yet' : formatFitness(value)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-lineage-${scenario.scenarioId}`}>
          <h4 id={`krkn-ai-lineage-${scenario.scenarioId}`}>Lineage</h4>
          <dl className="krkn-ai-scenario-detail__lineage">
            <div><dt>Origin</dt><dd>{scenario.origin || 'Not available yet'}</dd></div>
            <div><dt>Parent scenarios</dt><dd>{scenario.parentIds.length > 0 ? scenario.parentIds.join(', ') : 'No parent scenarios (initial)'}</dd></div>
          </dl>
        </section>

        <MockLogPanel title="Scenario pod log" logLines={scenario.logLines} />
      </CardBody>
    </Card>
  );
}

export function RunDetail({ run, onBack }: RunDetailProps) {
  const runKey = run.runId ?? run.name;
  const generationIds = [...new Set([
    ...run.progression.map((point) => point.generation),
    ...run.scenarios.map((scenario) => scenario.generation),
  ])].sort((a, b) => a - b);
  const preferredGeneration = run.phase === 'Succeeded' && generationIds.includes(1)
    ? 1
    : generationIds[0] ?? null;
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(preferredGeneration);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedGeneration(preferredGeneration);
    setSelectedScenarioId(null);
  }, [runKey, preferredGeneration]);

  const generationScenarios = selectedGeneration === null
    ? []
    : run.scenarios
      .filter((scenario) => scenario.generation === selectedGeneration)
      .sort((a, b) => a.scenarioId - b.scenarioId);
  const defaultScenario = generationScenarios.find((scenario) => scenario.outcome === 'Failed')
    ?? generationScenarios.reduce<MockAiScenario | undefined>(
      (best, scenario) => !best || scenario.fitnessScore > best.fitnessScore ? scenario : best,
      undefined,
    );
  const selectedScenario = generationScenarios.find((scenario) => scenario.scenarioId === selectedScenarioId)
    ?? defaultScenario;
  const selectedGenerationPoint = run.progression.find((point) => point.generation === selectedGeneration);
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
          <MockLogPanel title="Main pod output" logLines={run.mainPod.logLines} />
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

      <Card className="krkn-ai-scenario-explorer">
        <CardTitle><Title headingLevel="h2" size="xl">Scenario explorer</Title></CardTitle>
        <CardBody>
          <p className="krkn-ai-scenario-explorer__intro">Select a generation, then choose one scenario execution to inspect.</p>
          {generationIds.length === 0 ? (
            <>
              <p className="krkn-ai-not-available">{run.phase === 'Failed' ? 'Not available yet' : 'No generations yet'}</p>
              <p className="krkn-ai-not-available">{run.phase === 'Failed' ? 'Not available yet' : 'No scenario pods yet'}</p>
            </>
          ) : (
            <>
              <div className="krkn-ai-scenario-explorer__selectors">
                <label htmlFor="krkn-ai-generation-select">
                  <span>Generation</span>
                  <select
                    id="krkn-ai-generation-select"
                    value={selectedGeneration ?? ''}
                    onChange={(event) => {
                      setSelectedGeneration(Number(event.target.value));
                      setSelectedScenarioId(null);
                    }}
                  >
                    {generationIds.map((generation) => {
                      const count = run.scenarios.filter((scenario) => scenario.generation === generation).length;
                      return <option key={generation} value={generation}>Generation {generation + 1} · {count} scenarios</option>;
                    })}
                  </select>
                </label>
                <label htmlFor="krkn-ai-scenario-select">
                  <span>Scenario execution</span>
                  <select
                    id="krkn-ai-scenario-select"
                    value={selectedScenario?.scenarioId ?? ''}
                    disabled={generationScenarios.length === 0}
                    onChange={(event) => setSelectedScenarioId(Number(event.target.value))}
                  >
                    {generationScenarios.map((scenario) => (
                      <option key={scenario.scenarioId} value={scenario.scenarioId}>
                        Scenario {scenario.scenarioId} · {scenario.scenarioType} · {formatFitness(scenario.fitnessScore)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedGenerationPoint && (
                <p className="krkn-ai-selected-generation__fitness">
                  Generation {selectedGenerationPoint.generation + 1}: best {formatFitness(selectedGenerationPoint.best)} · average {formatFitness(selectedGenerationPoint.average)} fitness units
                </p>
              )}
              {generationScenarios.length === 0
                ? <p className="krkn-ai-not-available">No scenario pods yet</p>
                : selectedScenario && <ScenarioDetail scenario={selectedScenario} runPhase={run.phase} />}
            </>
          )}
        </CardBody>
      </Card>
    </main>
  );
}

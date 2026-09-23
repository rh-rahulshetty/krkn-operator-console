import { useEffect, useState } from 'react';
import { Button, Card, CardBody, CardTitle, Label, Title } from '@patternfly/react-core';
import { FitnessChart, ScenarioFitnessChart } from './FitnessChart';
import type { MockAiRun, MockAiScenario } from './types';

interface RunDetailProps {
  run: MockAiRun;
  onBack: () => void;
}

interface MockLogPanelProps {
  title: string;
  logLines: string[];
}

function MockLogPanel({ title, logLines }: MockLogPanelProps) {
  return (
    <section className="krkn-ai-log-panel" aria-label={title}>
      <h3>{title}</h3>
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
  const metrics = [
    ['Health-check failure score', scenario.healthCheckFailureScore],
    ['Health-check response-time score', scenario.healthCheckResponseTimeScore],
    ['Krkn failure score', scenario.krknFailureScore],
  ] as const;
  const parameters = Object.entries(scenario.parameters);

  return (
    <Card className="krkn-ai-scenario-detail">
      <CardTitle>
        <div className="krkn-ai-scenario-detail__heading">
          <Title headingLevel="h3" size="lg">Scenario {scenario.scenarioId}</Title>
          <Label color={scenario.outcome === 'Failed' ? 'red' : 'green'}>
            Illustrative pod status: {scenario.outcome}
          </Label>
        </div>
      </CardTitle>
      <CardBody>
        <p className="krkn-ai-illustrative-note">
          Pod name is illustrative only: <code>{scenario.podName}</code>. No scenario pod is queried or created.
        </p>
        {scenario.outcome === 'Failed' && (
          <p className="krkn-ai-scenario-detail__failure">
            This individual scenario failed; the overall run phase is {runPhase}.
            {scenario.returnCode === undefined ? '' : ` Illustrative return code: ${scenario.returnCode}.`}
          </p>
        )}
        <dl className="krkn-ai-scenario-detail__summary">
          <div><dt>Scenario type</dt><dd>{scenario.scenarioType}</dd></div>
          <div><dt>Fitness score</dt><dd>{scenario.fitnessScore.toLocaleString(undefined, { maximumFractionDigits: 4 })} fitness units</dd></div>
          <div><dt>Duration</dt><dd>{scenario.durationSeconds.toLocaleString(undefined, { maximumFractionDigits: 2 })} seconds</dd></div>
        </dl>

        <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-parameters-${scenario.scenarioId}`}>
          <h4 id={`krkn-ai-parameters-${scenario.scenarioId}`}>Allowlisted parameters</h4>
          {parameters.length > 0 ? (
            <dl className="krkn-ai-scenario-detail__parameters">
              {parameters.map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          ) : <p className="krkn-ai-not-available">Not available yet</p>}
        </section>

        <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-metrics-${scenario.scenarioId}`}>
          <h4 id={`krkn-ai-metrics-${scenario.scenarioId}`}>Health and failure metrics</h4>
          <dl className="krkn-ai-scenario-detail__metrics">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value === undefined ? 'Not available yet' : value.toLocaleString(undefined, { maximumFractionDigits: 4 })}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-lineage-${scenario.scenarioId}`}>
          <h4 id={`krkn-ai-lineage-${scenario.scenarioId}`}>Lineage</h4>
          <dl className="krkn-ai-scenario-detail__lineage">
            <div><dt>Origin</dt><dd>{scenario.origin || 'Not available yet'}</dd></div>
            <div>
              <dt>Parent scenarios</dt>
              <dd>{scenario.parentIds.length > 0 ? scenario.parentIds.join(', ') : 'No parent scenarios (initial)'}</dd>
            </div>
          </dl>
        </section>

        <MockLogPanel title="Illustrative scenario pod log" logLines={scenario.logLines} />
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
          <div><dt>Config</dt><dd>{run.configId}</dd></div>
          <div><dt>Started</dt><dd><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString()}</time></dd></div>
          <div><dt>Configured generations</dt><dd>{run.generations}</dd></div>
          <div><dt>Configured population</dt><dd>{run.populationSize}</dd></div>
        </dl>
        {run.failureReason && <p className="krkn-ai-run-detail__failure">{run.failureReason}</p>}
        {run.snapshotLabel && <p className="krkn-ai-snapshot-label">{run.snapshotLabel}</p>}
      </header>

      <div className="krkn-ai-run-detail__status-grid">
        <Card className="krkn-ai-run-detail__status-card">
          <CardTitle><Title headingLevel="h2" size="lg">Orchestrator</Title></CardTitle>
          <CardBody>
            <dl>
              <div><dt>Illustrative pod</dt><dd>{run.orchestrator.podName ?? 'Not available yet'}</dd></div>
              <div><dt>Status</dt><dd>{run.orchestrator.status}</dd></div>
            </dl>
          </CardBody>
        </Card>
        <Card className="krkn-ai-run-detail__status-card">
          <CardTitle><Title headingLevel="h2" size="lg">Uploader</Title></CardTitle>
          <CardBody>
            <dl><div><dt>Status</dt><dd>{run.uploader.status}</dd></div></dl>
            <MockLogPanel title="Illustrative uploader log" logLines={run.uploader.logLines} />
          </CardBody>
        </Card>
      </div>

      <Card className="krkn-ai-run-detail__main-logs">
        <CardTitle><Title headingLevel="h2" size="lg">Main orchestrator log</Title></CardTitle>
        <CardBody>
          <p className="krkn-ai-illustrative-note">Illustrative main-log panel — these fixture lines are not live pod output.</p>
          {run.orchestrator.logLines.length > 0
            ? <pre className="krkn-ai-log-panel__lines">{run.orchestrator.logLines.join('\n')}</pre>
            : <p className="krkn-ai-not-available">Not available yet</p>}
        </CardBody>
      </Card>

      <Card className="krkn-ai-run-detail__fitness">
        <CardBody>
          {run.progression.length > 0 ? (
            <FitnessChart points={run.progression} runName={run.name} />
          ) : run.phase === 'Failed' ? (
            <section className="krkn-ai-fitness-chart" aria-labelledby="krkn-ai-fitness-heading">
              <h2 id="krkn-ai-fitness-heading">Fitness over generations</h2>
              <p className="krkn-ai-not-available">Not available yet</p>
            </section>
          ) : null}
          {run.baselineFitness !== undefined && (
            <p className="krkn-ai-baseline-fitness">
              Illustrative baseline fitness: {run.baselineFitness.toLocaleString(undefined, { maximumFractionDigits: 4 })} fitness units
            </p>
          )}
        </CardBody>
      </Card>

      <section className="krkn-ai-generations" aria-labelledby="krkn-ai-generations-heading">
        <Title headingLevel="h2" size="xl"><span id="krkn-ai-generations-heading">Generations</span></Title>
        {generationIds.length === 0 ? (
          <p className="krkn-ai-not-available">{run.phase === 'Failed' ? 'Not available yet' : 'No generations yet'}</p>
        ) : (
          <div className="krkn-ai-generation-list" role="group" aria-label="Select a generation">
            {generationIds.map((generation) => {
              const generationPoint = run.progression.find((point) => point.generation === generation);
              const completedScenarios = run.scenarios.filter((scenario) => scenario.generation === generation).length;
              return (
                <button
                  type="button"
                  key={generation}
                  className={`krkn-ai-generation-card ${selectedGeneration === generation ? 'krkn-ai-generation-card--selected' : ''}`}
                  aria-pressed={selectedGeneration === generation}
                  onClick={() => {
                    setSelectedGeneration(generation);
                    setSelectedScenarioId(null);
                  }}
                >
                  <span className="krkn-ai-generation-card__title">Generation {generation + 1}</span>
                  <span>Completed scenarios: {completedScenarios}</span>
                  <span>Best fitness: {generationPoint ? `${generationPoint.best.toLocaleString(undefined, { maximumFractionDigits: 4 })} fitness units` : 'Not available yet'}</span>
                  <span>Average fitness: {generationPoint ? `${generationPoint.average.toLocaleString(undefined, { maximumFractionDigits: 4 })} fitness units` : 'Not available yet'}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedGeneration !== null && (
        <section className="krkn-ai-selected-generation" aria-labelledby="krkn-ai-selected-generation-heading">
          <Title headingLevel="h2" size="xl">
            <span id="krkn-ai-selected-generation-heading">Generation {selectedGeneration + 1} scenarios</span>
          </Title>
          {selectedGenerationPoint && (
            <p className="krkn-ai-selected-generation__fitness">
              Best {selectedGenerationPoint.best.toLocaleString(undefined, { maximumFractionDigits: 4 })} · Average {selectedGenerationPoint.average.toLocaleString(undefined, { maximumFractionDigits: 4 })} fitness units
            </p>
          )}
          {generationScenarios.length === 0 ? (
            <p className="krkn-ai-not-available">No scenario pods yet</p>
          ) : (
            <>
              <ScenarioFitnessChart scenarios={generationScenarios} generation={selectedGeneration} />
              <section className="krkn-ai-scenario-list" aria-labelledby="krkn-ai-scenario-list-heading">
                <h3 id="krkn-ai-scenario-list-heading">Scenario pods</h3>
                <ul className="krkn-ai-scenario-list__items">
                  {generationScenarios.map((scenario) => (
                    <li key={scenario.scenarioId}>
                      <button
                        type="button"
                        className={`krkn-ai-scenario-row ${selectedScenario?.scenarioId === scenario.scenarioId ? 'krkn-ai-scenario-row--selected' : ''}`}
                        aria-pressed={selectedScenario?.scenarioId === scenario.scenarioId}
                        onClick={() => setSelectedScenarioId(scenario.scenarioId)}
                      >
                        <span className="krkn-ai-scenario-row__name">Scenario {scenario.scenarioId}</span>
                        <span>{scenario.scenarioType}</span>
                        <span>{scenario.fitnessScore.toLocaleString(undefined, { maximumFractionDigits: 4 })} fitness units</span>
                        <span>{scenario.outcome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              {selectedScenario && <ScenarioDetail scenario={selectedScenario} runPhase={run.phase} />}
            </>
          )}
        </section>
      )}
      {generationIds.length === 0 && (
        <section className="krkn-ai-selected-generation" aria-labelledby="krkn-ai-scenario-pods-heading">
          <Title headingLevel="h2" size="xl"><span id="krkn-ai-scenario-pods-heading">Scenario pods</span></Title>
          <p className="krkn-ai-not-available">{run.phase === 'Failed' ? 'Not available yet' : 'No scenario pods yet'}</p>
        </section>
      )}
    </main>
  );
}

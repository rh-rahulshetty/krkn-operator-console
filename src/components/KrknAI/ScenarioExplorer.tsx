import { useMemo, useState } from 'react';
import { Label, Modal, ModalVariant, Title } from '@patternfly/react-core';
import { ScenarioHealthCharts } from './ScenarioHealthCharts';
import { StaticLogText } from './StaticLogText';
import type { MockAiRun, MockAiScenario } from './types';

interface ScenarioExplorerProps {
  scenarios: MockAiScenario[];
  runPhase: MockAiRun['phase'];
}

type ScenarioSortKey = 'generation' | 'scenarioId' | 'scenarioType' | 'fitnessScore' | 'outcome' | 'durationSeconds';
type SortDirection = 'asc' | 'desc';

const formatFitness = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 });
const columns: Array<{ key: ScenarioSortKey; label: string }> = [
  { key: 'generation', label: 'Generation' },
  { key: 'scenarioId', label: 'Scenario ID' },
  { key: 'scenarioType', label: 'Scenario name' },
  { key: 'fitnessScore', label: 'Fitness score' },
  { key: 'outcome', label: 'Status' },
  { key: 'durationSeconds', label: 'Duration' },
];

function sortValue(scenario: MockAiScenario, key: ScenarioSortKey): string | number {
  return scenario[key];
}

function ScenarioDetail({ scenario, runPhase }: { scenario: MockAiScenario; runPhase: MockAiRun['phase'] }) {
  const parameters = Object.entries(scenario.parameters);
  const metrics = [
    ['Health-check failure score', scenario.healthCheckFailureScore],
    ['Health-check response-time score', scenario.healthCheckResponseTimeScore],
    ['Krkn failure score', scenario.krknFailureScore],
  ] as const;
  const failureRate = scenario.healthChecks.totalChecks === 0
    ? null
    : scenario.healthChecks.failedChecks / scenario.healthChecks.totalChecks;

  return (
    <div className="krkn-ai-scenario-detail">
      <div className="krkn-ai-scenario-detail__heading">
        <div>
          <p className="krkn-ai-scenario-detail__pod">Scenario pod: <code>{scenario.podName}</code></p>
        </div>
        <div className="krkn-ai-scenario-detail__labels">
          <Label color={scenario.outcome === 'Failed' ? 'red' : 'green'}>{scenario.outcome}</Label>
          <Label color={scenario.healthChecks.status === 'Healthy' ? 'green' : scenario.healthChecks.status === 'Failed' ? 'red' : 'orange'}>
            Health: {scenario.healthChecks.status}
          </Label>
        </div>
      </div>
      {scenario.outcome === 'Failed' && (
        <p className="krkn-ai-scenario-detail__failure">
          This scenario failed; the overall run phase is {runPhase}.
          {scenario.returnCode === undefined ? '' : ` Illustrative return code: ${scenario.returnCode}.`}
        </p>
      )}
      <dl className="krkn-ai-scenario-detail__summary">
        <div><dt>Generation</dt><dd>{scenario.generation + 1}</dd></div>
        <div><dt>Scenario ID</dt><dd>{scenario.scenarioId}</dd></div>
        <div><dt>Duration</dt><dd>{scenario.durationSeconds.toLocaleString(undefined, { maximumFractionDigits: 2 })} seconds</dd></div>
        <div><dt>Fitness score</dt><dd>{formatFitness(scenario.fitnessScore)} fitness units</dd></div>
        <div><dt>Origin</dt><dd>{scenario.origin || 'Not available yet'}</dd></div>
        <div><dt>Parent scenarios</dt><dd>{scenario.parentIds.length > 0 ? scenario.parentIds.join(', ') : 'No parent scenarios (initial)'}</dd></div>
      </dl>

      <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-run-config-${scenario.scenarioId}`}>
        <h3 id={`krkn-ai-run-config-${scenario.scenarioId}`}>Scenario run configuration</h3>
        {parameters.length > 0 ? (
          <dl className="krkn-ai-scenario-detail__parameters">
            {parameters.map(([name, value]) => (
              <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : <p className="krkn-ai-not-available">Not available yet</p>}
        <div className="krkn-ai-scenario-detail__arguments">
          <h4>Allowlisted run arguments</h4>
          <p className="krkn-ai-illustrative-note">The executable, environment, and credentials are intentionally omitted.</p>
          {scenario.arguments.length > 0
            ? <pre className="krkn-ai-log-panel__lines">{scenario.arguments.join(' ')}</pre>
            : <p className="krkn-ai-not-available">Not available yet</p>}
        </div>
      </section>

      <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-fitness-result-${scenario.scenarioId}`}>
        <h3 id={`krkn-ai-fitness-result-${scenario.scenarioId}`}>Fitness function result</h3>
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

      <section className="krkn-ai-scenario-detail__section" aria-labelledby={`krkn-ai-health-${scenario.scenarioId}`}>
        <h3 id={`krkn-ai-health-${scenario.scenarioId}`}>Health-check telemetry</h3>
        <dl className="krkn-ai-scenario-detail__metrics">
          <div><dt>Health status</dt><dd>{scenario.healthChecks.status}</dd></div>
          <div><dt>Total checks</dt><dd>{scenario.healthChecks.totalChecks}</dd></div>
          <div><dt>Failed checks</dt><dd>{scenario.healthChecks.failedChecks}</dd></div>
          <div><dt>Failure rate</dt><dd>{failureRate === null ? 'Not available yet' : `${(failureRate * 100).toFixed(1)}%`}</dd></div>
        </dl>
        <ScenarioHealthCharts scenarioId={scenario.scenarioId} samples={scenario.healthChecks.samples} />
      </section>

      <section className="krkn-ai-log-panel" aria-label="Scenario pod log">
        <h3>Scenario pod log</h3>
        <p className="krkn-ai-illustrative-note">Static copy of the supplied scenario log with ANSI control codes removed — no live pod was queried.</p>
        <StaticLogText logText={scenario.logText} />
      </section>
    </div>
  );
}

export function ScenarioExplorer({ scenarios, runPhase }: ScenarioExplorerProps) {
  const [sortKey, setSortKey] = useState<ScenarioSortKey>('generation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [search, setSearch] = useState('');
  const [generationFilter, setGenerationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedScenario, setSelectedScenario] = useState<MockAiScenario | null>(null);

  const generationOptions = useMemo(() => [...new Set(scenarios.map((scenario) => scenario.generation))].sort((left, right) => left - right), [scenarios]);
  const typeOptions = useMemo(() => [...new Set(scenarios.map((scenario) => scenario.scenarioType))].sort(), [scenarios]);
  const visibleScenarios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = scenarios.filter((scenario) => {
      const matchesSearch = normalizedSearch === ''
        || String(scenario.scenarioId).includes(normalizedSearch)
        || scenario.scenarioType.toLowerCase().includes(normalizedSearch);
      const matchesGeneration = generationFilter === 'all' || scenario.generation === Number(generationFilter);
      const matchesType = typeFilter === 'all' || scenario.scenarioType === typeFilter;
      return matchesSearch && matchesGeneration && matchesType;
    });
    return filtered.sort((left, right) => {
      const leftValue = sortValue(left, sortKey);
      const rightValue = sortValue(right, sortKey);
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));
      if (comparison !== 0) return sortDirection === 'asc' ? comparison : -comparison;
      return left.scenarioId - right.scenarioId;
    });
  }, [generationFilter, scenarios, search, sortDirection, sortKey, typeFilter]);

  if (scenarios.length === 0) {
    return (
      <section className="krkn-ai-scenario-explorer" aria-labelledby="krkn-ai-scenario-explorer-heading">
        <Title headingLevel="h2" size="xl"><span id="krkn-ai-scenario-explorer-heading">Scenario executions</span></Title>
        <p className="krkn-ai-not-available">{runPhase === 'Failed' ? 'Not available yet' : 'No generations yet'}</p>
        <p className="krkn-ai-not-available">{runPhase === 'Failed' ? 'Not available yet' : 'No scenario pods yet'}</p>
      </section>
    );
  }

  return (
    <section className="krkn-ai-scenario-explorer" aria-labelledby="krkn-ai-scenario-explorer-heading">
      <div className="krkn-ai-scenario-explorer__heading">
        <div>
          <Title headingLevel="h2" size="xl"><span id="krkn-ai-scenario-explorer-heading">Scenario executions</span></Title>
          <p className="krkn-ai-scenario-explorer__intro">Sort and filter all observed scenarios. Select a row for full execution details.</p>
        </div>
        <span>{visibleScenarios.length} of {scenarios.length} scenarios</span>
      </div>
      <div className="krkn-ai-scenario-explorer__filters">
        <label htmlFor="krkn-ai-scenario-search">
          <span>Search scenarios</span>
          <input id="krkn-ai-scenario-search" type="search" value={search} placeholder="ID or scenario name" onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label htmlFor="krkn-ai-generation-filter">
          <span>Generation</span>
          <select id="krkn-ai-generation-filter" value={generationFilter} onChange={(event) => setGenerationFilter(event.target.value)}>
            <option value="all">All generations</option>
            {generationOptions.map((generation) => <option key={generation} value={generation}>Generation {generation + 1}</option>)}
          </select>
        </label>
        <label htmlFor="krkn-ai-type-filter">
          <span>Scenario type</span>
          <select id="krkn-ai-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All scenario types</option>
            {typeOptions.map((scenarioType) => <option key={scenarioType} value={scenarioType}>{scenarioType}</option>)}
          </select>
        </label>
      </div>
      <div className="krkn-ai-scenario-table-wrap" tabIndex={0} aria-label="Scrollable scenario executions table">
        <table className="krkn-ai-scenario-table" aria-label="Scenario executions">
          <caption>Observed scenario executions for this Krkn AI run</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" aria-sort={sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === column.key) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortKey(column.key);
                        setSortDirection('asc');
                      }
                    }}
                  >
                    {column.label}<span aria-hidden="true">{sortKey === column.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleScenarios.map((scenario) => (
              <tr
                key={scenario.scenarioId}
                tabIndex={0}
                aria-label={`Open scenario ${scenario.scenarioId} details`}
                onClick={() => setSelectedScenario(scenario)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedScenario(scenario);
                  }
                }}
              >
                <td>{scenario.generation + 1}</td>
                <th scope="row">{scenario.scenarioId}</th>
                <td>{scenario.scenarioType}</td>
                <td>{formatFitness(scenario.fitnessScore)}</td>
                <td><Label color={scenario.outcome === 'Failed' ? 'red' : 'green'}>{scenario.outcome}</Label></td>
                <td>{scenario.durationSeconds.toLocaleString(undefined, { maximumFractionDigits: 2 })}s</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleScenarios.length === 0 && <p className="krkn-ai-scenario-table__empty">No scenarios match the current filters.</p>}
      </div>

      <Modal
        variant={ModalVariant.large}
        title={selectedScenario ? `Scenario ${selectedScenario.scenarioId}: ${selectedScenario.scenarioType}` : 'Scenario details'}
        isOpen={selectedScenario !== null}
        onClose={() => setSelectedScenario(null)}
      >
        {selectedScenario && <ScenarioDetail scenario={selectedScenario} runPhase={runPhase} />}
      </Modal>
    </section>
  );
}

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Label,
} from '@patternfly/react-core';
import type { KeyboardEvent } from 'react';
import type { MockAiRun, MockAiRunPhase } from './types';

interface RunListProps {
  runs: MockAiRun[];
  onCreate: () => void;
  onSelect: (runId: string) => void;
}

const phaseColors: Record<MockAiRunPhase, 'blue' | 'cyan' | 'green' | 'grey' | 'red'> = {
  Pending: 'grey',
  Provisioning: 'cyan',
  Running: 'blue',
  Succeeded: 'green',
  Failed: 'red',
  Cancelled: 'grey',
};


const formatStartTime = (createdAt: string): string => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString();
};

export function RunList({ runs, onCreate, onSelect }: RunListProps) {

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, run: MockAiRun) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(run.runId ?? run.name);
    }
  };

  return (
    <Card className="krkn-ai-run-list">
      <CardTitle>AI runs</CardTitle>
      <CardBody>
        <div className="krkn-ai-run-list__toolbar">
          <p className="krkn-ai-run-list__mock-note">
            Mock preview — no cluster resources will be created.
          </p>
          <Button className="krkn-ai-run-list__create" variant="primary" onClick={onCreate}>
            Create run
          </Button>
        </div>

        {runs.length === 0 ? (
          <p className="krkn-ai-run-list__empty">No mock runs yet.</p>
        ) : (
          <div
            className="krkn-ai-run-list__table-wrap"
            style={{ overflowX: 'auto' }}
          >
            <table className="krkn-ai-run-list__table">
              <caption>Mock AI run progress</caption>
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Cluster</th>
                  <th scope="col">Phase</th>
                  <th scope="col">Started</th>
                  <th scope="col">Best fitness</th>
                  <th scope="col">Generations</th>
                  <th scope="col">Scenarios</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const bestSuccessfulScore = run.scenarios.reduce<number | null>(
                    (best, scenario) => scenario.outcome === 'Succeeded'
                      && Number.isFinite(scenario.fitnessScore)
                      && (best === null || scenario.fitnessScore > best)
                      ? scenario.fitnessScore
                      : best,
                    null,
                  );
                  const hasArtifacts = run.scenarios.length > 0 || run.progression.length > 0;
                  const failedWithoutArtifacts = run.phase === 'Failed' && !hasArtifacts;
                  const generationsProgress = failedWithoutArtifacts || run.completedGenerations === null
                    ? 'Not available yet'
                    : `${run.completedGenerations} / ${run.generations}`;
                  const scenariosProgress = failedWithoutArtifacts
                    ? 'Not available yet'
                    : `${run.scenarios.length} / ${run.generations * run.populationSize}`;

                  return (
                    <tr
                      key={run.runId ?? run.name}
                      className="krkn-ai-run-list__row"
                      tabIndex={0}
                      aria-label={`Open run ${run.name}, ${run.phase}, cluster ${run.cluster.clusterName}`}
                      onClick={() => onSelect(run.runId ?? run.name)}
                      onKeyDown={(event) => handleRowKeyDown(event, run)}
                    >
                      <th scope="row" className="krkn-ai-run-list__name-cell">
                        <span className="krkn-ai-run-list__run-name">{run.name}</span>
                        {run.phase === 'Running' && run.snapshotLabel && (
                          <span className="krkn-ai-run-list__snapshot">
                            <Label color="grey">Fixed snapshot</Label>
                            <span>{run.snapshotLabel}</span>
                          </span>
                        )}
                      </th>
                      <td>{run.cluster.clusterName}</td>
                      <td>
                        <Label color={phaseColors[run.phase]}>{run.phase}</Label>
                      </td>
                      <td>
                        <time dateTime={run.createdAt}>{formatStartTime(run.createdAt)}</time>
                      </td>
                      <td>{bestSuccessfulScore === null ? 'Not available yet' : String(Number(bestSuccessfulScore.toFixed(4)))}</td>
                      <td>{generationsProgress}</td>
                      <td>{scenariosProgress}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

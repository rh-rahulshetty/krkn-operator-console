import type { MockAiFitnessPoint, MockAiScenario } from './types';

interface FitnessChartProps {
  points: MockAiFitnessPoint[];
  runName: string;
}

interface ScenarioFitnessChartProps {
  scenarios: MockAiScenario[];
  generation: number;
}

const formatFitness = (value: number) => value.toLocaleString(undefined, {
  maximumFractionDigits: 4,
});

function getExpandedDomain(values: number[]) {
  const low = Math.min(...values, 0);
  const high = Math.max(...values, 0);
  const span = high - low || 1;
  const padding = span * 0.08;
  return [low - padding, high + padding] as const;
}

export function FitnessChart({ points, runName }: FitnessChartProps) {
  const sortedPoints = [...points].sort((a, b) => a.generation - b.generation);

  if (sortedPoints.length === 0) {
    return (
      <section className="krkn-ai-fitness-chart" aria-labelledby="krkn-ai-fitness-heading">
        <h2 id="krkn-ai-fitness-heading">Fitness over generations</h2>
        <p className="krkn-ai-not-available">Not available yet</p>
      </section>
    );
  }

  const width = 720;
  const height = 330;
  const margin = { top: 24, right: 24, bottom: 64, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const generations = sortedPoints.map((point) => point.generation);
  const [minGeneration, maxGeneration] = [Math.min(...generations), Math.max(...generations)];
  const values = sortedPoints.flatMap((point) => [point.best, point.average]);
  const [minFitness, maxFitness] = getExpandedDomain(values);
  const x = (generation: number) => margin.left + (
    maxGeneration === minGeneration
      ? plotWidth / 2
      : ((generation - minGeneration) / (maxGeneration - minGeneration)) * plotWidth
  );
  const y = (fitness: number) => margin.top + ((maxFitness - fitness) / (maxFitness - minFitness)) * plotHeight;
  const bestPath = sortedPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.generation)} ${y(point.best)}`).join(' ');
  const averagePath = sortedPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.generation)} ${y(point.average)}`).join(' ');
  const yTicks = Array.from({ length: 5 }, (_, index) => maxFitness - ((maxFitness - minFitness) * index) / 4);
  const xTicks = sortedPoints.length <= 6
    ? sortedPoints.map((point) => point.generation)
    : Array.from({ length: 6 }, (_, index) => Math.round(minGeneration + ((maxGeneration - minGeneration) * index) / 5));

  return (
    <section className="krkn-ai-fitness-chart" aria-labelledby="krkn-ai-fitness-heading">
      <h2 id="krkn-ai-fitness-heading">Fitness over generations</h2>
      <figure className="krkn-ai-fitness-chart__figure">
        <svg
          className="krkn-ai-fitness-chart__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Best and average fitness for ${runName} across ${sortedPoints.length} observed generations. Vertical axis is fitness score, not a percentage.`}
          preserveAspectRatio="xMidYMid meet"
        >
          {yTicks.map((tick, index) => {
            const tickY = y(tick);
            return (
              <g key={`y-${index}`} className="krkn-ai-fitness-chart__gridline">
                <line x1={margin.left} x2={width - margin.right} y1={tickY} y2={tickY} />
                <text x={margin.left - 10} y={tickY + 4} textAnchor="end">{formatFitness(tick)}</text>
              </g>
            );
          })}
          {xTicks.map((generation) => (
            <g key={`x-${generation}`} className="krkn-ai-fitness-chart__tick">
              <line
                x1={x(generation)}
                x2={x(generation)}
                y1={height - margin.bottom}
                y2={height - margin.bottom + 5}
              />
              <text x={x(generation)} y={height - margin.bottom + 22} textAnchor="middle">
                {generation + 1}
              </text>
            </g>
          ))}
          <line
            className="krkn-ai-fitness-chart__axis"
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={height - margin.bottom}
          />
          <line
            className="krkn-ai-fitness-chart__axis"
            x1={margin.left}
            x2={width - margin.right}
            y1={height - margin.bottom}
            y2={height - margin.bottom}
          />
          <path className="krkn-ai-fitness-chart__line krkn-ai-fitness-chart__line--best" d={bestPath} />
          <path className="krkn-ai-fitness-chart__line krkn-ai-fitness-chart__line--average" d={averagePath} />
          {sortedPoints.map((point) => (
            <g key={`point-${point.generation}`}>
              <circle
                className="krkn-ai-fitness-chart__point krkn-ai-fitness-chart__point--best"
                cx={x(point.generation)}
                cy={y(point.best)}
                r="4"
              >
                <title>Generation {point.generation + 1} best fitness: {formatFitness(point.best)}</title>
              </circle>
              <circle
                className="krkn-ai-fitness-chart__point krkn-ai-fitness-chart__point--average"
                cx={x(point.generation)}
                cy={y(point.average)}
                r="4"
              >
                <title>Generation {point.generation + 1} average fitness: {formatFitness(point.average)}</title>
              </circle>
            </g>
          ))}
          <text
            className="krkn-ai-fitness-chart__axis-label"
            x={18}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 18 ${margin.top + plotHeight / 2})`}
          >
            Fitness score (fitness units)
          </text>
          <text
            className="krkn-ai-fitness-chart__axis-label"
            x={margin.left + plotWidth / 2}
            y={height - 12}
            textAnchor="middle"
          >
            Generation (displayed 1-based)
          </text>
        </svg>
        <figcaption className="krkn-ai-fitness-chart__legend" aria-label="Chart legend">
          <span className="krkn-ai-fitness-chart__legend-item krkn-ai-fitness-chart__legend-item--best">Best fitness</span>
          <span className="krkn-ai-fitness-chart__legend-item krkn-ai-fitness-chart__legend-item--average">Average fitness</span>
        </figcaption>
      </figure>
      <table className="krkn-ai-fitness-chart__table" aria-label={`Numeric fitness values for ${runName}`}>
        <caption>Observed fitness by generation (fitness units)</caption>
        <thead>
          <tr>
            <th scope="col">Generation</th>
            <th scope="col">Best fitness</th>
            <th scope="col">Average fitness</th>
          </tr>
        </thead>
        <tbody>
          {sortedPoints.map((point) => (
            <tr key={point.generation}>
              <th scope="row">{point.generation + 1}</th>
              <td>{formatFitness(point.best)}</td>
              <td>{formatFitness(point.average)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ScenarioFitnessChart({ scenarios, generation }: ScenarioFitnessChartProps) {
  const generationScenarios = scenarios
    .filter((scenario) => scenario.generation === generation)
    .sort((a, b) => a.scenarioId - b.scenarioId);

  if (generationScenarios.length === 0) {
    return (
      <section className="krkn-ai-scenario-fitness-chart" aria-labelledby="krkn-ai-scenario-fitness-heading">
        <h3 id="krkn-ai-scenario-fitness-heading">Scenario fitness distribution</h3>
        <p className="krkn-ai-not-available">Not available yet</p>
      </section>
    );
  }

  const width = 720;
  const rowHeight = 30;
  const height = Math.max(220, 84 + generationScenarios.length * rowHeight);
  const margin = { top: 22, right: 24, bottom: 58, left: 116 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const [minFitness, maxFitness] = getExpandedDomain(generationScenarios.map((scenario) => scenario.fitnessScore));
  const x = (fitness: number) => margin.left + ((fitness - minFitness) / (maxFitness - minFitness)) * plotWidth;
  const y = (index: number) => margin.top + (generationScenarios.length === 1
    ? plotHeight / 2
    : (index / (generationScenarios.length - 1)) * plotHeight);
  const ticks = Array.from({ length: 5 }, (_, index) => minFitness + ((maxFitness - minFitness) * index) / 4);

  return (
    <section className="krkn-ai-scenario-fitness-chart" aria-labelledby="krkn-ai-scenario-fitness-heading">
      <h3 id="krkn-ai-scenario-fitness-heading">Scenario fitness distribution</h3>
      <figure className="krkn-ai-scenario-fitness-chart__figure">
        <svg
          className="krkn-ai-scenario-fitness-chart__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Fitness score distribution for ${generationScenarios.length} scenarios in generation ${generation + 1}. Scores are fitness units, not percentages.`}
          preserveAspectRatio="xMidYMid meet"
        >
          {ticks.map((tick, index) => (
            <g key={`tick-${index}`} className="krkn-ai-scenario-fitness-chart__gridline">
              <line x1={x(tick)} x2={x(tick)} y1={margin.top} y2={height - margin.bottom} />
              <text x={x(tick)} y={height - margin.bottom + 20} textAnchor="middle">{formatFitness(tick)}</text>
            </g>
          ))}
          <line
            className="krkn-ai-scenario-fitness-chart__axis"
            x1={margin.left}
            x2={width - margin.right}
            y1={height - margin.bottom}
            y2={height - margin.bottom}
          />
          {generationScenarios.map((scenario, index) => (
            <g key={scenario.scenarioId} className="krkn-ai-scenario-fitness-chart__datum">
              <text x={margin.left - 10} y={y(index) + 4} textAnchor="end">Scenario {scenario.scenarioId}</text>
              <circle
                className={`krkn-ai-scenario-fitness-chart__point ${scenario.outcome === 'Failed' ? 'krkn-ai-scenario-fitness-chart__point--failed' : 'krkn-ai-scenario-fitness-chart__point--succeeded'}`}
                cx={x(scenario.fitnessScore)}
                cy={y(index)}
                r="6"
              >
                <title>Scenario {scenario.scenarioId}, {scenario.outcome.toLowerCase()}, fitness {formatFitness(scenario.fitnessScore)}</title>
              </circle>
            </g>
          ))}
          <text
            className="krkn-ai-scenario-fitness-chart__axis-label"
            x={margin.left + plotWidth / 2}
            y={height - 12}
            textAnchor="middle"
          >
            Fitness score (fitness units)
          </text>
          <text
            className="krkn-ai-scenario-fitness-chart__axis-label"
            x={20}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 20 ${margin.top + plotHeight / 2})`}
          >
            Scenario
          </text>
        </svg>
        <figcaption className="krkn-ai-scenario-fitness-chart__legend" aria-label="Scenario outcomes">
          <span className="krkn-ai-scenario-fitness-chart__legend-item krkn-ai-scenario-fitness-chart__legend-item--succeeded">Succeeded scenario</span>
          <span className="krkn-ai-scenario-fitness-chart__legend-item krkn-ai-scenario-fitness-chart__legend-item--failed">Failed scenario</span>
        </figcaption>
      </figure>
    </section>
  );
}

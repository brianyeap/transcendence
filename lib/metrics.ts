import { metrics } from "@opentelemetry/api"

const meter = metrics.getMeter('ft-transcendence')

// gamesStarted.add(1)
export const gamesStarted = meter.createCounter(
	'transcendence_game_started_total',
	{
		description: 'Total number of games started',
	}
)

// gamesCompleted.add(1)
export const gamesCompleted = meter.createCounter(
	'transcendence_games_completed_total',
	{
		description: 'Total number of games completed',
	}
)

// activeGames.add(1)
// activeGames.add(-1)
export const activeGames = meter.createUpDownCounter(
	'transcendence_active_games',
	{
		description: 'Number of games currently in progress',
	}
)

// matchesPlayed.add(1)
export const matchesPlayed = meter.createCounter(
	'transcendence_matches_played_total',
	{
		description: 'Total number of matches played',
	}
)
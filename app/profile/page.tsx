export default function ProfilePage() {
	const userStats = {
		username: "  Somebody, Maybe Nobody!  ",
		gamesPlayed: 12,
		wins: 7, 
		losses: 4,
		draws: 1,
		winPercentage: 58.3,
	};
	return (
		<div>
			<p> {userStats.username} </p>
			<p> Games Played: {userStats.gamesPlayed}</p>
			<p> Wins: {userStats.wins}</p>
			<p> Losses: {userStats.losses}</p>
			<p> Draws: {userStats.draws}</p>
			<p> Win %: {userStats.winPercentage}</p>
		</div>
	);
}
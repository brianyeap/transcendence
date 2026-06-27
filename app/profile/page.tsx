export default function ProfilePage() {
	const userStats = {
		username: "Hello World",
		gamesPlayed: 12,
		wins: 7, 
		losses: 4,
		draws: 1,
		winPercentage: 58.3,
	};
	return (
		<div>
			<p> {userStats.username} </p>
		</div>
	);
}
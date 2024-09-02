function removeFromList(gameName) {
	// Logic to remove the game from the list
	alert(`Remove ${gameName} from the list`);
}

function saveGames() {
	const selectedGames = []; // Add logic to select games
	const password = prompt("Enter a password to encrypt the file:");
	if (!password) {
		alert("Password is required to save the file.");
		return;
	}

	fetch('/save', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ selected_games: selectedGames, password: password })
	})
	.then(response => response.json())
	.then(data => {
		if (data.error) {
			alert(data.error);
		} else {
			alert(data.message);
		}
	});
}
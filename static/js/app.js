document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const fetchButton = document.getElementById('fetch-collection');
    const gamesListContainer = document.getElementById('games-list');
    const gameDetailsContainer = document.getElementById('game-details');
    const selectedGamesListContainer = document.getElementById('selected-games-list');
    const saveButton = document.getElementById('save-selected');
    let selectedGames = [];

    fetchButton.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        if (username) {
            fetch(`/api/collection?username=${username}`)
                .then(response => response.json())
                .then(games => displayGames(username, games));
        }
    });

    function displayGames(username, games) {
        // Clear the games list container
        gamesListContainer.innerHTML = '';
    
        // Convert the games object to an array of game entries and sort them alphabetically by name
        const sortedGames = Object.entries(games).sort((a, b) => a[1].name.localeCompare(b[1].name));
    
        // Loop through each sorted game entry
        for (const [gameId, game] of sortedGames) {
            // Create a new div element for the game
            const gameDiv = document.createElement('div');
            
            // Add the 'game' class to the div
            gameDiv.classList.add('game');
            
            // Set the inner text of the div to the game's name and year published
            gameDiv.innerText = `${game.name} (${game.year_published})`;
            
            // Add a click event listener to the div
            gameDiv.addEventListener('click', function() {
                // Fetch game details from the server
                fetch(`/api/${username}/game_details/${gameId}`)
                    .then(response => response.json()) // Convert the response to JSON
                    .then(details => displayGameDetails(details, gameId)); // Call displayGameDetails with the details and gameId
            });
            
            // Append the div to the games list container
            gamesListContainer.appendChild(gameDiv);
        }
    }

    function displayGameDetails(details, gameId) {
        gameDetailsContainer.innerHTML = `
            <h3>${details.name} (${details.year_published})</h3>
            <img src="${details.thumbnail}" alt="${details.name}">
            <ul>
                <li>Number of plays: ${details.plays}</li>
                <li>Personal rating: ${details.rating}</li>
            </ul>
            <button onclick="window.open('https://www.boardgamegeek.com/boardgame/${gameId}')">See on BoardGameGeek</button>
            <button onclick="addToSelected(${gameId})">Add to Selected</button>
        `;
    }

    window.addToSelected = function(gameId) {
        if (!selectedGames.includes(gameId)) {
            selectedGames.push(gameId);
            updateSelectedGamesList();
        }
    }

    function updateSelectedGamesList() {
        selectedGamesListContainer.innerHTML = '';
        selectedGames.forEach(gameId => {
            const gameDiv = document.createElement('div');
            gameDiv.classList.add('selected-game');
            gameDiv.innerHTML = `
                <span>Game ID: ${gameId}</span>
                <button onclick="removeFromSelected(${gameId})">Remove</button>
            `;
            selectedGamesListContainer.appendChild(gameDiv);
        });
    }

    window.removeFromSelected = function(gameId) {
        selectedGames = selectedGames.filter(id => id !== gameId);
        updateSelectedGamesList();
    }

    saveButton.addEventListener('click', function() {
        fetch('/api/selected_games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ selected_games: selectedGames }),
        })
        .then(response => response.json())
        .then(data => alert('Selected games saved successfully!'));
    });

});

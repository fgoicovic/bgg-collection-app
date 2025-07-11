document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const fetchButton = document.getElementById('fetch-collection');
    const gamesListContainer = document.getElementById('games-list');
    const gameDetailsContainer = document.getElementById('game-details');
    const selectedGamesListContainer = document.getElementById('selected-games-list');
    const saveButton = document.getElementById('save-selected');
    const resyncButton = document.getElementById('resync-collection');
    let selectedGames = [];
    let selectedGamesDetails = [];

    if (fetchButton){
        fetchButton.addEventListener('click', function() {
            const username = usernameInput.value.trim();
            if (username) {
                fetch(`/api/collection?username=${username}`)
                    .then(response => response.json())
                    .then(games => displayGames(username, games));
            }
        });
    }

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
            gameDiv.innerHTML = `${game.name} (${game.year_published})`;
            
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
        console.log(details);
        gameDetailsContainer.innerHTML = `
            <h3>${details.name} (${details.year_published})</h3>
            <img src="${details.thumbnail}" alt="${details.name}">
            <ul>
                <li>Players: ${details.players}</li>
                <li>Playing time: ${details.playing_time} Min</li>
                <li>Number of plays: ${details.plays}</li>
                <li>Personal rating: ${details.rating}</li>
            </ul>
            <button onclick="window.open('https://www.boardgamegeek.com/boardgame/${gameId}')">View on BGG</button>
            <button onclick='addToSelected(${gameId}, ${JSON.stringify(details)})'>Add to Selected</button>
        `;
    }

    window.addToSelected = function(gameId,details) {
        if (!selectedGames.includes(gameId)) {
            selectedGames.push(gameId);
            selectedGamesDetails.push(details);
            updateSelectedGamesList();
        }
    }

    function updateSelectedGamesList() {
        selectedGamesListContainer.innerHTML = '';
        selectedGamesDetails.forEach(game => {
            const gameDiv = document.createElement('div');
            gameDiv.classList.add('game');
            gameDiv.innerHTML = `
                <span>${game.name}</span>
                <button onclick="removeFromSelected(${game.id})">Remove</button>
            `;
            // Add a click event listener to the div
            gameDiv.addEventListener('click', function() {
                const username = usernameInput.value.trim();
                // Fetch game details from the server
                fetch(`/api/${username}/game_details/${game.id}`)
                    .then(response => response.json()) // Convert the response to JSON
                    .then(details => displayGameDetails(details, game.id)); // Call displayGameDetails with the details and gameId
            });
            selectedGamesListContainer.appendChild(gameDiv);
        });
    }

    window.removeFromSelected = function(gameId) {
        selectedGames = selectedGames.filter(id => id !== gameId);
        selectedGamesDetails = selectedGamesDetails.filter(game => game.id !== gameId);
        updateSelectedGamesList();
    }

    saveButton.addEventListener('click', function() {
        // Prompt the user for their name and password
        const userName = prompt('Please enter your name:');
        if (!userName) {
            alert('Name cannot be empty.');
            return;
        }
        const userPassword = prompt('Please enter your password:');
    
        // Check if userName or userPassword is empty
        if (!userPassword) {
            alert('Password cannot be empty.');
            return;
        }

        // Check list of selected games
        if (selectedGames.length === 0) {
            alert('No games selected. Nothing to save.');
            return;
        }
        
        // Fetch the API endpoint with the POST method
        fetch('/api/selected_games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                selected_games: selectedGames,
                user_name: userName,
                user_password: userPassword,
                collection: usernameInput.value.trim()
            }),
        })
        .then(response => response.json())
        .then(data => alert('Selected games saved successfully!'));
    });

    resyncButton.addEventListener('click', function() {
        const userName = usernameInput.value.trim();
        fetch(`/api/collection?username=${userName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }
        )
        .then(response => response.json())
        .then(games => displayGames(userName, games));
    });

});

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
                .then(games => displayGames(games));
        }
    });

    function displayGames(games) {
        gamesListContainer.innerHTML = '';
        games.forEach(game => {
            const gameDiv = document.createElement('div');
            gameDiv.classList.add('game');
            gameDiv.innerText = game.name;
            gameDiv.addEventListener('click', function() {
                fetch(`/api/game_details/${game.id}`)
                    .then(response => response.json())
                    .then(details => displayGameDetails(details, game.id));
            });
            gamesListContainer.appendChild(gameDiv);
        });
    }

    function displayGameDetails(details, gameId) {
        gameDetailsContainer.innerHTML = `
            <h3>${details.name}</h3>
            <img src="${details.image}" alt="${details.name}">
            <p>${details.description}</p>
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

    // Load selected games on page load
    fetch('/api/selected_games')
        .then(response => response.json())
        .then(games => {
            selectedGames = games;
            updateSelectedGamesList();
        });
});

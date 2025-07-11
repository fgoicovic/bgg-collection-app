document.addEventListener('DOMContentLoaded', function() {
    const gamesListContainer = document.getElementById('games-list');
    const ListFilesContainer = document.getElementById('list-files');
    const compareButton = document.getElementById('compare-button');
    let selectedLists = [];

    function displayFiles() {
        fetch('/api/selected-lists')
            .then(response => response.json())
            .then(data => {
                console.log('Data received:', data); // Debugging
                const files = data;
                ListFilesContainer.innerHTML = '';
                for (const file of files) {
                    const fileDiv = document.createElement('div');
                    fileDiv.classList.add('list');
                    fileDiv.innerText = `List: ${file}`;
                    fileDiv.addEventListener('click', () => toggleSelection(fileDiv, file));
                    ListFilesContainer.appendChild(fileDiv);
                }
            })
            .catch(error => {
                console.error('Error fetching files:', error);
            });
    }
    displayFiles();

    function toggleSelection(element, listName) {
        if (element.classList.contains('selected')) {
            element.classList.remove('selected');
            selectedLists = selectedLists.filter(item => item !== listName);
        } else {
            element.classList.add('selected');
            selectedLists.push(listName);
        }
        updateSelectedLists();
    }

    function updateSelectedLists() {
        // Show or hide the compare button based on the number of selected lists
        if (selectedLists.length >= 2) {
            compareButton.style.display = 'block';
        } else {
            compareButton.style.display = 'none';
        }
    }

    async function compareLists() {
        gamesListContainer.innerHTML = '';
        const lists = selectedLists.join(',');
        try {
            const response = await fetch(`/api/compare-selection?lists=${lists}`);
            const data = await response.json();
            console.log('Comparison result:', data); // Debugging
            // if the data is empty, display a message
            if (data.length === 0) {
                const message = document.createElement('div');
                message.innerText = 'No games in common';
                gamesListContainer.appendChild(message);
                return;
            }
            for (const element of data) {
                const gameDiv = document.createElement('div');
                gameDiv.classList.add('selected-game');
                // const name = await gameName(element); // Await the gameName function
                console.log('name:', element); // Debugging
                gameDiv.innerText = element;
                gamesListContainer.appendChild(gameDiv);
            }
        } catch (error) {
            console.error('Error comparing lists:', error); // Debugging
        }
    }
    compareButton.addEventListener('click', compareLists);

    async function gameName(username,gameId) {
        try {
            // check if collection name is provided
            if (username === undefined) {
                const route = `/api/game_details/${gameId}`;
            } else {
                const route = `/api/${username}/game_details/${gameId}`;
            }
            const response = await fetch(route);
            const data = await response.json();
            console.log('Game name:', data); // Debugging
            return data.name;
        } catch (error) {
            console.error('Error fetching game name:', error); // Debugging
            return 'Unknown Game';
        }
    }
});
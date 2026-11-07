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

                    const label = document.createElement('span');
                    label.innerText = `List: ${file}`;
                    label.style.flex = '1';
                    label.addEventListener('click', () => toggleSelection(fileDiv, file));

                    const deleteBtn = document.createElement('button');
                    deleteBtn.classList.add('delete-btn');
                    deleteBtn.innerText = 'Delete';
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete list "${file}"? This cannot be undone.`)) {
                            fetch(`/api/selected-lists/${encodeURIComponent(file)}`, { method: 'DELETE' })
                                .then(r => r.json())
                                .then(result => {
                                    if (result.status === 'success') {
                                        selectedLists = selectedLists.filter(item => item !== file);
                                        updateSelectedLists();
                                        displayFiles();
                                    } else {
                                        alert(`Error deleting list: ${result.error}`);
                                    }
                                });
                        }
                    });

                    const viewBtn = document.createElement('button');
                    viewBtn.classList.add('view-btn');
                    viewBtn.innerText = 'View';
                    viewBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const password = prompt(`Enter password for "${file}":`);
                        if (password === null) return;
                        fetch(`/api/selected-lists/${encodeURIComponent(file)}/games`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password })
                        })
                            .then(r => r.json())
                            .then(result => {
                                if (result.error) {
                                    alert(result.error);
                                    return;
                                }
                                gamesListContainer.innerHTML = '';

                                const header = document.createElement('div');
                                header.style.display = 'flex';
                                header.style.alignItems = 'center';
                                header.style.justifyContent = 'space-between';
                                header.style.marginBottom = '8px';

                                const title = document.createElement('h3');
                                title.style.margin = '0';
                                title.innerText = `${file}'s list (${result.length} game${result.length === 1 ? '' : 's'})`;

                                const closeBtn = document.createElement('button');
                                closeBtn.classList.add('close-btn');
                                closeBtn.innerText = '✕ Close';
                                closeBtn.addEventListener('click', () => { gamesListContainer.innerHTML = ''; });

                                header.appendChild(title);
                                header.appendChild(closeBtn);
                                gamesListContainer.appendChild(header);

                                result.forEach(name => {
                                    const gameDiv = document.createElement('div');
                                    gameDiv.classList.add('selected-game');
                                    gameDiv.innerText = name;
                                    gamesListContainer.appendChild(gameDiv);
                                });
                            });
                    });

                    fileDiv.style.display = 'flex';
                    fileDiv.style.alignItems = 'center';
                    fileDiv.appendChild(label);
                    fileDiv.appendChild(viewBtn);
                    fileDiv.appendChild(deleteBtn);
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
                gameDiv.innerText = element;
                gamesListContainer.appendChild(gameDiv);
            }
            // Add summary text at the bottom
            const summary = document.createElement('div');
            summary.style.marginTop = '16px';
            summary.style.fontWeight = 'bold';
            summary.innerText = `There is a total of ${data.length} game${data.length === 1 ? '' : 's'} in common.`;
            gamesListContainer.appendChild(summary);

            // Add export button
            const exportBtn = document.createElement('button');
            exportBtn.textContent = 'Export List';
            exportBtn.style.marginTop = '12px';
            exportBtn.onclick = function() {
                const fileContent = data.join('\n');
                const blob = new Blob([fileContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'common_games.txt';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 0);
            };
            gamesListContainer.appendChild(exportBtn);
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
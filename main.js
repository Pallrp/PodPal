///<reference path="agent.ts"/>
// #### Templates ####
const playerTemplateEl = document.getElementById('player-container-template');
const listTemplateEl = document.getElementById('list-template');
const solutionTableTemplate = document.getElementById('solution-table-template');
const solutionSeatTemplate = document.getElementById('solution-seat-template');
const powerPillTemplate = document.getElementById('power-pill-template');
// #### Containers ####
const playerContainer = document.getElementById('players-container');
const solutionStage = document.getElementById('staged-solution');
const solutionsList = document.getElementById('solutions-area');
// #### Misc ####
const solutionButton = document.getElementById('solution-button-template');
const stagedSolutionTitleEl = document.getElementById('solution-number');
const loadingSpinner = document.getElementById('loading-spinner');
const searchBtns = document.getElementsByClassName('search-btn');
const playerNameInput = document.getElementById('add-player-name');
const addPlayerButton = document.getElementById('submit-player');
var playerCount = 0;
// Store saved solutions
var savedSolutions = [];
// Track current solution for modifications
var currentSolution = null;
// #### New buttons ####
const addPodButton = document.createElement('button');
addPodButton.id = 'add-pod-button';
addPodButton.textContent = 'Add Pod';
addPodButton.className = 'btn btn-success mt-2';
const removePodButton = document.createElement('button');
removePodButton.id = 'remove-pod-button';
removePodButton.textContent = 'Remove Pod';
removePodButton.className = 'btn btn-danger mt-2';
const reevaluateButton = document.createElement('button');
reevaluateButton.id = 'reevaluate-button';
reevaluateButton.textContent = 'Re-evaluate Solution';
reevaluateButton.className = 'btn btn-warning mt-2';
const saveButton = document.createElement('button');
saveButton.id = 'save-button';
saveButton.textContent = 'Save Solution';
saveButton.className = 'btn btn-primary mt-2';
// Create a progress bar for search feedback
const searchProgressContainer = document.createElement('div');
searchProgressContainer.id = 'search-progress-container';
searchProgressContainer.className = 'd-none';
searchProgressContainer.innerHTML = `
    <div class="progress mt-2">
        <div id="search-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
             role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
    </div>
    <div id="search-stats" class="text-center mt-1 search-stats">
        <small class="text-white">Processing nodes: <span id="nodes-expanded">0</span> | 
        Solutions found: <span id="goals-found">0</span> | 
        Best score: <span id="best-score">∞</span></small>
    </div>
`;
// Create toast container for notifications
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);
// Function to show toast notifications
function showFeedbackToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    // Remove toast after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
// #### Add new button container to the UI ####
function addButtonsToUI() {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'pod-management-buttons';
    buttonsContainer.className = 'mt-3 mb-3 d-flex justify-content-around';
    buttonsContainer.appendChild(addPodButton);
    buttonsContainer.appendChild(removePodButton);
    buttonsContainer.appendChild(reevaluateButton);
    buttonsContainer.appendChild(saveButton);
    // Add the container before the staged solution
    const bottomContainer = document.getElementById('bottom-container');
    if (bottomContainer) {
        bottomContainer.prepend(buttonsContainer);
    }
}
// #### Pod management functions ####
function addPod() {
    if (!currentSolution)
        return;
    // Add an empty pod to the current solution
    currentSolution.seatings.push([]);
    // Re-render the solution
    updateStagedSolution(currentSolution);
}
function removePod() {
    if (!currentSolution || currentSolution.seatings.length <= 1)
        return;
    // Get the last pod
    const lastPod = currentSolution.seatings.pop();
    // Move all players from the removed pod back to unpaired section
    if (lastPod && lastPod.length > 0) {
        for (const playerId of lastPod) {
            // Add them to unparied players list (UI will be updated in updateStagedSolution)
            // We're just handling the data structure here
            // Actual UI update happens in updateStagedSolution
        }
    }
    // Re-render the solution
    updateStagedSolution(currentSolution);
}
function reevaluateSolution() {
    if (!currentSolution)
        return;
    // Calculate new score
    const players = collectPlayers();
    const env = new Environment(players);
    const heuristic = new Heuristic(players.length);
    // Create a state representation from the current solution
    const tables = [];
    currentSolution.seatings.forEach((pod, index) => {
        const table = new Table(index);
        pod.forEach(playerId => {
            table.seatPlayer(playerId);
        });
        tables.push(table);
    });
    // Get all player IDs
    const allPlayerIds = players.map(p => p.id);
    // Determine which players are still unseated
    const seatedPlayerIds = currentSolution.seatings.flat();
    const unseatedPlayerIds = allPlayerIds.filter(id => !seatedPlayerIds.includes(id));
    // Create state with tables and unseated players
    const state = new State(tables, unseatedPlayerIds);
    // Evaluate new score
    const newScore = heuristic.evalState(state);
    currentSolution.score = newScore;
    // Update UI
    updateStagedSolution(currentSolution);
}
function saveSolution() {
    if (!currentSolution)
        return;
    // Create a deep copy of the current solution
    const solutionCopy = {
        seatings: JSON.parse(JSON.stringify(currentSolution.seatings)),
        score: currentSolution.score
    };
    // Add to saved solutions
    savedSolutions.push(solutionCopy);
    // Update the saved solutions list UI
    updateSavedSolutionsList();
}
function updateSavedSolutionsList() {
    // Clear existing buttons
    while (solutionsList.firstChild) {
        solutionsList.removeChild(solutionsList.firstChild);
    }
    // Add a header
    const header = document.createElement('h4');
    header.textContent = 'Saved Solutions';
    header.className = 'text-center mt-2 mb-3';
    solutionsList.appendChild(header);
    // Add buttons for each saved solution
    savedSolutions.forEach((solution, index) => {
        const button = solutionButton.cloneNode(true);
        button.textContent = `Solution #${index + 1} (${solution.score.toFixed(1)})`;
        button.onclick = () => {
            stageSavedSolution(index);
        };
        solutionsList.appendChild(button);
    });
}
function stageSavedSolution(index) {
    if (index >= 0 && index < savedSolutions.length) {
        // Create a deep copy to avoid modifying the saved solution
        currentSolution = {
            seatings: JSON.parse(JSON.stringify(savedSolutions[index].seatings)),
            score: savedSolutions[index].score
        };
        // Update UI
        updateStagedSolution(currentSolution);
    }
}
function updateStagedSolution(solution) {
    // Clear existing solution
    while (solutionStage.firstChild) {
        solutionStage.removeChild(solutionStage.firstChild);
    }
    // Update title with score
    stagedSolutionTitleEl.textContent = `Current Solution (Score: ${solution.score.toFixed(1)})`;
    // Record play history when seating players
    recordPlayedTogether(solution.seatings);
    // Create a container for the tables
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'tables-container';
    solutionStage.appendChild(tablesContainer);
    // Add tables
    solution.seatings.forEach((table, tableIndex) => {
        const tableEl = solutionTableTemplate.cloneNode(true);
        tableEl.id = `solution-table-${tableIndex}`;
        tableEl.removeAttribute('class'); // Remove any template classes
        tableEl.classList.add('new-col-3'); // Add proper classes
        const seatsContainer = tableEl.querySelector('.solution-seats-container');
        // Add table header
        const tableHeader = document.createElement('div');
        tableHeader.className = 'pod-header';
        tableHeader.textContent = `Pod ${tableIndex + 1}`;
        seatsContainer.appendChild(tableHeader);
        // Add seats
        table.forEach(playerId => {
            const player = PLAYERS[playerId];
            if (player) {
                const seatEl = createSeatElement(player);
                seatsContainer.appendChild(seatEl);
            }
            else {
                console.warn(`Player with ID ${playerId} not found in PLAYERS dictionary`);
            }
        });
        // Add empty seats to fill the grid if needed
        const emptySeatsNeeded = 4 - table.length;
        if (emptySeatsNeeded > 0) {
            for (let i = 0; i < emptySeatsNeeded; i++) {
                const emptySeatEl = document.createElement('div');
                emptySeatEl.className = 'solution-seat empty-seat';
                emptySeatEl.textContent = 'Empty';
                emptySeatEl.setAttribute('data-table-id', tableIndex.toString());
                emptySeatEl.setAttribute('data-empty', 'true');
                // Add drop event handlers
                emptySeatEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    emptySeatEl.classList.add('drop-target');
                });
                emptySeatEl.addEventListener('dragleave', () => {
                    emptySeatEl.classList.remove('drop-target');
                });
                emptySeatEl.addEventListener('drop', (e) => {
                    emptySeatEl.classList.remove('drop-target');
                    handlePlayerDrop(e);
                });
                seatsContainer.appendChild(emptySeatEl);
            }
        }
        tablesContainer.appendChild(tableEl);
    });
    // Add empty tables to fill the grid if needed
    const totalTables = solution.seatings.length;
    const emptyTablesNeeded = Math.ceil(totalTables / 3) * 3 - totalTables;
    // Add unsorted players section if there are any
    const unsortedPlayers = Object.values(PLAYERS).filter(player => {
        // Check if this player is in any table
        return !solution.seatings.some(table => table.includes(player.id));
    });
    if (unsortedPlayers.length > 0) {
        const unsortedTableEl = solutionTableTemplate.cloneNode(true);
        unsortedTableEl.id = 'unsorted-players';
        unsortedTableEl.removeAttribute('class'); // Remove any template classes
        unsortedTableEl.classList.add('new-col-3'); // Add proper classes
        const seatsContainer = unsortedTableEl.querySelector('.solution-seats-container');
        // Add table header
        const tableHeader = document.createElement('div');
        tableHeader.className = 'pod-header';
        tableHeader.textContent = 'Unsorted Players';
        seatsContainer.appendChild(tableHeader);
        // Add unsorted players
        unsortedPlayers.forEach(player => {
            const seatEl = createSeatElement(player);
            seatsContainer.appendChild(seatEl);
        });
        // Add empty seats to fill the grid if needed
        const emptySeatsNeeded = 4 - unsortedPlayers.length;
        if (emptySeatsNeeded > 0) {
            for (let i = 0; i < emptySeatsNeeded; i++) {
                const emptySeatEl = document.createElement('div');
                emptySeatEl.className = 'solution-seat empty-seat';
                emptySeatEl.textContent = 'Empty';
                emptySeatEl.setAttribute('data-table-id', '-1'); // -1 for unsorted
                emptySeatEl.setAttribute('data-empty', 'true');
                // Add drop event handlers
                emptySeatEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    emptySeatEl.classList.add('drop-target');
                });
                emptySeatEl.addEventListener('dragleave', () => {
                    emptySeatEl.classList.remove('drop-target');
                });
                emptySeatEl.addEventListener('drop', (e) => {
                    emptySeatEl.classList.remove('drop-target');
                    handlePlayerDrop(e);
                });
                seatsContainer.appendChild(emptySeatEl);
            }
        }
        tablesContainer.appendChild(unsortedTableEl);
    }
    // Add empty tables to complete the grid if needed
    // Calculate how many empty tables we need after adding the unsorted players table
    const filledTables = totalTables + (unsortedPlayers.length > 0 ? 1 : 0);
    const remainingEmptyTables = Math.ceil(filledTables / 3) * 3 - filledTables;
    if (remainingEmptyTables > 0) {
        for (let i = 0; i < remainingEmptyTables; i++) {
            const emptyTableEl = solutionTableTemplate.cloneNode(true);
            emptyTableEl.id = `empty-table-${i}`;
            emptyTableEl.removeAttribute('class');
            emptyTableEl.classList.add('new-col-3', 'empty-table');
            const seatsContainer = emptyTableEl.querySelector('.solution-seats-container');
            // Add table header
            const tableHeader = document.createElement('div');
            tableHeader.className = 'pod-header empty-header';
            tableHeader.textContent = 'Empty Pod';
            seatsContainer.appendChild(tableHeader);
            // Add empty seats
            for (let j = 0; j < 4; j++) {
                const emptySeatEl = document.createElement('div');
                emptySeatEl.className = 'solution-seat empty-seat';
                emptySeatEl.textContent = 'Empty';
                emptySeatEl.setAttribute('data-table-id', `empty-${i}`);
                emptySeatEl.setAttribute('data-empty', 'true');
                // Add drop event handlers
                emptySeatEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    emptySeatEl.classList.add('drop-target');
                });
                emptySeatEl.addEventListener('dragleave', () => {
                    emptySeatEl.classList.remove('drop-target');
                });
                emptySeatEl.addEventListener('drop', (e) => {
                    emptySeatEl.classList.remove('drop-target');
                    handlePlayerDrop(e);
                });
                seatsContainer.appendChild(emptySeatEl);
            }
            tablesContainer.appendChild(emptyTableEl);
        }
    }
    // Update play history indicators
    updatePlayHistoryIndicators();
    // Show feedback toast when solution is loaded
    showFeedbackToast(`Solution loaded with score: ${solution.score.toFixed(1)}`, false);
}
function createSeatElement(player) {
    const seatEl = solutionSeatTemplate.cloneNode(true);
    seatEl.setAttribute('data-player-id', player.id.toString());
    const nameContainer = seatEl.querySelector('.solution-seat-name-container');
    const nameSpan = nameContainer.querySelector('.solution-name');
    nameSpan.textContent = player.name;
    const powerContainer = seatEl.querySelector('.solution-seat-power-container');
    player.power.forEach(power => {
        const powerPill = powerPillTemplate.cloneNode(true);
        powerPill.className = `powerpill ${getPowerClass(power)}`;
        powerPill.setAttribute('value', power.toString()); // Set the value attribute
        powerPill.textContent = getPowerVerboseName(power)[0]; // Just the first letter
        powerContainer.appendChild(powerPill);
    });
    // Add improved drag and drop functionality
    seatEl.setAttribute('draggable', 'true');
    seatEl.addEventListener('dragstart', (e) => {
        seatEl.classList.add('dragging');
        handlePlayerDragStart(e);
    });
    seatEl.addEventListener('dragend', () => {
        seatEl.classList.remove('dragging');
    });
    // Add drop event handlers for player seats too (to allow swapping)
    seatEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        seatEl.classList.add('drop-target');
    });
    seatEl.addEventListener('dragleave', () => {
        seatEl.classList.remove('drop-target');
    });
    seatEl.addEventListener('drop', (e) => {
        seatEl.classList.remove('drop-target');
        handlePlayerDrop(e);
    });
    return seatEl;
}
function handlePlayerDragStart(event) {
    var _a, _b;
    const seat = event.target;
    const playerId = seat.getAttribute('data-player-id');
    const tableId = ((_b = (_a = seat.closest('.solution-seats-container')) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.id.replace('solution-table-', '')) || '-1';
    if (playerId && event.dataTransfer) {
        event.dataTransfer.setData('text/plain', JSON.stringify({
            playerId: playerId,
            sourceTableId: tableId
        }));
    }
}
function handlePlayerDrop(event) {
    var _a, _b;
    event.preventDefault();
    const dropTarget = event.target;
    let targetElement = dropTarget;
    // Handle the case when dropping on a child element
    if (!targetElement.classList.contains('solution-seat') && !targetElement.classList.contains('empty-seat')) {
        targetElement = targetElement.closest('.solution-seat') || targetElement;
    }
    const targetTableId = targetElement.getAttribute('data-table-id') ||
        ((_b = (_a = targetElement.closest('.solution-seats-container')) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.id.replace('solution-table-', '')) ||
        '-1';
    // Get the target player id (for swapping)
    const targetPlayerId = targetElement.getAttribute('data-player-id');
    if (!event.dataTransfer)
        return;
    try {
        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        const playerId = parseInt(data.playerId);
        const sourceTableId = data.sourceTableId;
        if (currentSolution && playerId && sourceTableId) {
            // If dropping on another player (not an empty seat), swap players
            if (targetPlayerId && targetPlayerId !== String(playerId)) {
                swapPlayers(playerId, sourceTableId, parseInt(targetPlayerId), targetTableId);
            }
            else {
                // Regular move
                movePlayerBetweenTables(playerId, sourceTableId, targetTableId);
            }
            // Show feedback toast
            showFeedbackToast('Player moved successfully!');
        }
    }
    catch (e) {
        console.error('Error parsing drag data:', e);
        showFeedbackToast('Error moving player', true);
    }
}
function movePlayerBetweenTables(playerId, sourceTableId, targetTableId) {
    if (!currentSolution)
        return;
    const srcTableIndex = parseInt(sourceTableId);
    const targetTableIndex = parseInt(targetTableId);
    // Remove from source table
    if (srcTableIndex === -1) {
        // Player was in unsorted section
        // Nothing to remove from seatings
    }
    else if (srcTableIndex >= 0 && srcTableIndex < currentSolution.seatings.length) {
        const sourceTable = currentSolution.seatings[srcTableIndex];
        const playerIndex = sourceTable.indexOf(playerId);
        if (playerIndex !== -1) {
            sourceTable.splice(playerIndex, 1);
        }
    }
    // Add to target table
    if (targetTableIndex === -1) {
        // Player is now unsorted
        // Nothing to add to seatings
    }
    else if (targetTableIndex >= 0 && targetTableIndex < currentSolution.seatings.length) {
        const targetTable = currentSolution.seatings[targetTableIndex];
        if (targetTable.length < MAXSEATS && !targetTable.includes(playerId)) {
            targetTable.push(playerId);
        }
    }
    // Update UI
    updateStagedSolution(currentSolution);
}
// Add a new function for swapping players
function swapPlayers(player1Id, table1Id, player2Id, table2Id) {
    if (!currentSolution)
        return;
    const srcTableIndex = parseInt(table1Id);
    const targetTableIndex = parseInt(table2Id);
    // First, remove both players from their tables
    if (srcTableIndex >= 0 && srcTableIndex < currentSolution.seatings.length) {
        const sourceTable = currentSolution.seatings[srcTableIndex];
        const player1Index = sourceTable.indexOf(player1Id);
        if (player1Index !== -1) {
            sourceTable.splice(player1Index, 1);
        }
    }
    let player2Removed = false;
    if (targetTableIndex >= 0 && targetTableIndex < currentSolution.seatings.length) {
        const targetTable = currentSolution.seatings[targetTableIndex];
        const player2Index = targetTable.indexOf(player2Id);
        if (player2Index !== -1) {
            targetTable.splice(player2Index, 1);
            player2Removed = true;
        }
    }
    // Then add them to the opposite tables
    if (targetTableIndex >= 0 && targetTableIndex < currentSolution.seatings.length) {
        const targetTable = currentSolution.seatings[targetTableIndex];
        if (targetTable.length < MAXSEATS && !targetTable.includes(player1Id)) {
            targetTable.push(player1Id);
        }
    }
    if (player2Removed && srcTableIndex >= 0 && srcTableIndex < currentSolution.seatings.length) {
        const sourceTable = currentSolution.seatings[srcTableIndex];
        if (sourceTable.length < MAXSEATS && !sourceTable.includes(player2Id)) {
            sourceTable.push(player2Id);
        }
    }
    // Update UI
    updateStagedSolution(currentSolution);
}
function loadPage() {
    addPowerSelections();
    addButtonEvents();
    bindSearch();
    addFormBehaviour();
    addButtonsToUI();
    setupConfigurationHandlers();
    setupSearchProgressListeners();
    makePowerPillsEditable(); // Add this line
    setupSidebar(); // Setup the sidebar instead of showing welcome message
    // Add search progress container to the page
    const searchArea = document.querySelector('.table-order');
    if (searchArea) {
        searchArea.appendChild(searchProgressContainer);
    }
    // Add event listeners for new buttons
    addPodButton.addEventListener('click', addPod);
    removePodButton.addEventListener('click', removePod);
    reevaluateButton.addEventListener('click', reevaluateSolution);
    saveButton.addEventListener('click', saveSolution);
    // Initialize play history
    initPlayHistory();
    // Load test players from the CSV file
    fetch('players.csv')
        .then(response => {
        if (response.ok) {
            return response.text();
        }
        throw new Error('Failed to load players.csv');
    })
        .then(csvText => {
        // Create a File object from the CSV text
        const csvFile = new File([csvText], 'players.csv', { type: 'text/csv' });
        // Import the players
        importPlayersFromCSV(csvFile).then(() => {
            showFeedbackToast('Test players loaded from CSV file', false);
        });
    })
        .catch(error => {
        console.error('Error loading CSV file:', error);
        // Fallback to loading the sample players
        loadSamplePlayers();
    });
    // Initialize the saved solutions list UI
    updateSavedSolutionsList();
}
// Fallback function to load sample players if CSV fails
function loadSamplePlayers() {
    addPlayer("Actual Brainrot", [Powerlevel.MEDIUM, Powerlevel.CASUAL]);
    addPlayer("Bruhman Lower", [Powerlevel.MEDIUM]);
    addPlayer("Chad.", [Powerlevel.COMP, Powerlevel.HIGH]);
    addPlayer("Flip", [Powerlevel.COMP, Powerlevel.HIGH]);
    addPlayer("Chud", [Powerlevel.COMP, Powerlevel.MEDIUM, Powerlevel.CASUAL, Powerlevel.HIGH]);
    addPlayer("John Doe", [Powerlevel.MEDIUM, Powerlevel.CASUAL]);
    addPlayer("John Die", [Powerlevel.MEDIUM]);
    addPlayer("John Deo", [Powerlevel.MEDIUM, Powerlevel.CASUAL]);
    addPlayer("John Don", [Powerlevel.MEDIUM]);
    addPlayer("Average Player (Derogatory)", [Powerlevel.MEDIUM]);
}
function addFormBehaviour() {
    var _a;
    (_a = document.getElementById('add-player-form')) === null || _a === void 0 ? void 0 : _a.addEventListener("submit", (e) => {
        e.preventDefault();
        addPlayerButton.click();
        playerNameInput.focus();
    });
}
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (!form)
        return;
    // Clear text inputs
    form.querySelectorAll('input[type="text"]').forEach(input => {
        input.value = '';
    });
    // Uncheck checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}
// Add these helper functions for the WL/BL dropdown functionality
// Add new helper function to directly get player data from DOM
function getPlayerIdFromElement(element) {
    const id = element.getAttribute('id');
    if (!id)
        return null;
    // Handle both formats: "player-X" or just "X"
    if (id.startsWith('player-')) {
        return parseInt(id.replace('player-', ''));
    }
    else {
        return parseInt(id);
    }
}
// Update the showPlayerSelectionDropdown function to be more robust
function showPlayerSelectionDropdown(sourcePlayerEl, listType) {
    var _a;
    console.log(`Showing ${listType} dropdown for`, sourcePlayerEl);
    // Remove any existing dropdowns first
    const existingDropdowns = document.querySelectorAll('.player-selection-dropdown');
    existingDropdowns.forEach(dropdown => dropdown.remove());
    // Get the source player ID
    const sourcePlayerId = getPlayerIdFromElement(sourcePlayerEl);
    if (sourcePlayerId === null) {
        console.error("Could not get player ID from element", sourcePlayerEl);
        return;
    }
    console.log(`Player ID: ${sourcePlayerId}`);
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'player-selection-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.zIndex = '1000';
    dropdown.style.backgroundColor = '#fff';
    dropdown.style.border = '1px solid #ddd';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    dropdown.style.padding = '8px';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.width = '200px';
    // Position the dropdown below the button
    const buttonRect = sourcePlayerEl.getBoundingClientRect();
    dropdown.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
    dropdown.style.left = `${buttonRect.left + window.scrollX}px`;
    // Add a header
    const header = document.createElement('div');
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '8px';
    header.style.padding = '4px';
    header.style.borderBottom = '1px solid #ddd';
    header.textContent = listType === 'blacklist' ? 'Add to Blacklist:' : 'Add to Whitelist:';
    dropdown.appendChild(header);
    // Get player elements for populating the dropdown
    const playerElements = document.querySelectorAll('.player-container-instance');
    let hasPlayers = false;
    // Get source player and check if they exist in PLAYERS dictionary
    if (!PLAYERS[sourcePlayerId]) {
        console.error(`Player ${sourcePlayerId} not found in PLAYERS dictionary`);
        // Initialize player if missing (recovery mechanism)
        const playerName = ((_a = sourcePlayerEl.querySelector('.player-name')) === null || _a === void 0 ? void 0 : _a.textContent) || 'Unknown';
        const playerPowerEls = sourcePlayerEl.querySelectorAll('.powerpill');
        const playerPowers = new Set();
        playerPowerEls.forEach(pill => {
            const powerClass = Array.from(pill.classList)
                .find(cls => cls.startsWith('power-'));
            if (powerClass) {
                if (powerClass === 'power-casual')
                    playerPowers.add(Powerlevel.CASUAL);
                else if (powerClass === 'power-medium')
                    playerPowers.add(Powerlevel.MEDIUM);
                else if (powerClass === 'power-high')
                    playerPowers.add(Powerlevel.HIGH);
                else if (powerClass === 'power-comp')
                    playerPowers.add(Powerlevel.COMP);
            }
        });
        if (playerPowers.size === 0)
            playerPowers.add(Powerlevel.MEDIUM);
        PLAYERS[sourcePlayerId] = new Player(sourcePlayerId, playerName, playerPowers);
    }
    // Get existing lists
    const sourcePlayer = PLAYERS[sourcePlayerId];
    // Ensure player has whitelist and blacklist initialized
    if (!sourcePlayer.whitelist)
        sourcePlayer.whitelist = new Set();
    if (!sourcePlayer.blacklist)
        sourcePlayer.blacklist = new Set();
    const oppositeList = listType === 'blacklist' ? sourcePlayer.whitelist : sourcePlayer.blacklist;
    const currentList = listType === 'blacklist' ? sourcePlayer.blacklist : sourcePlayer.whitelist;
    // Add players to dropdown
    playerElements.forEach(playerEl => {
        var _a;
        const targetPlayerId = getPlayerIdFromElement(playerEl);
        if (targetPlayerId !== null && targetPlayerId !== sourcePlayerId) {
            const playerName = ((_a = playerEl.querySelector('.player-name')) === null || _a === void 0 ? void 0 : _a.textContent) || 'Unknown';
            const option = document.createElement('div');
            option.className = 'player-option';
            option.style.padding = '6px 8px';
            option.style.cursor = 'pointer';
            option.style.borderRadius = '3px';
            option.style.marginBottom = '4px';
            option.textContent = playerName;
            // Check if player is in the opposite list
            const isInOppositeList = oppositeList.has(targetPlayerId);
            const isInCurrentList = currentList.has(targetPlayerId);
            if (isInOppositeList) {
                // Grey out players in the opposite list
                option.style.color = '#aaa';
                option.style.backgroundColor = '#f5f5f5';
                option.style.cursor = 'not-allowed';
                option.title = `Cannot add: Player is already in the ${listType === 'blacklist' ? 'whitelist' : 'blacklist'}`;
            }
            else if (isInCurrentList) {
                // Mark players already in this list
                option.style.backgroundColor = '#e6f7ff';
                option.style.color = '#1890ff';
                option.title = `Player is already in the ${listType}`;
            }
            else {
                // Regular players
                option.addEventListener('mouseover', () => {
                    option.style.backgroundColor = '#f0f0f0';
                });
                option.addEventListener('mouseout', () => {
                    option.style.backgroundColor = '';
                });
                option.addEventListener('click', () => {
                    // Simplified direct update of player lists
                    if (listType === 'blacklist') {
                        sourcePlayer.blacklist.add(targetPlayerId);
                        // Update target player too
                        if (!PLAYERS[targetPlayerId].blacklist) {
                            PLAYERS[targetPlayerId].blacklist = new Set();
                        }
                        PLAYERS[targetPlayerId].blacklist.add(sourcePlayerId);
                        // Update the UI
                        updatePlayerListUI(sourcePlayerId, targetPlayerId, 'blacklist');
                    }
                    else {
                        sourcePlayer.whitelist.add(targetPlayerId);
                        // Update target player too
                        if (!PLAYERS[targetPlayerId].whitelist) {
                            PLAYERS[targetPlayerId].whitelist = new Set();
                        }
                        PLAYERS[targetPlayerId].whitelist.add(sourcePlayerId);
                        // Update the UI 
                        updatePlayerListUI(sourcePlayerId, targetPlayerId, 'whitelist');
                    }
                    // Show feedback and close dropdown
                    showFeedbackToast(`Added ${playerName} to ${sourcePlayer.name}'s ${listType}`);
                    dropdown.remove();
                });
            }
            dropdown.appendChild(option);
            hasPlayers = true;
        }
    });
    // Show a message if no players are available
    if (!hasPlayers) {
        const noPlayers = document.createElement('div');
        noPlayers.style.padding = '8px';
        noPlayers.style.color = '#999';
        noPlayers.style.fontStyle = 'italic';
        noPlayers.textContent = 'No other players available';
        dropdown.appendChild(noPlayers);
    }
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-sm btn-secondary w-100 mt-2';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => dropdown.remove());
    dropdown.appendChild(closeBtn);
    // Add to document
    document.body.appendChild(dropdown);
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) &&
            !e.target.closest('.blacklistbutton, .whitelistbutton')) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    });
}
// New function to update the player list UI
function updatePlayerListUI(playerId1, playerId2, listType) {
    var _a, _b;
    const playerEl1 = document.getElementById(`player-${playerId1}`);
    const playerEl2 = document.getElementById(`player-${playerId2}`);
    if (!playerEl1 || !playerEl2)
        return;
    // Get the list container for player 1
    const container1 = playerEl1.querySelector(`.${listType}-container .${listType}`);
    if (!container1)
        return;
    // Get the list container for player 2
    const container2 = playerEl2.querySelector(`.${listType}-container .${listType}`);
    if (!container2)
        return;
    // Create list item for player 2 in player 1's list
    const item1 = document.createElement('div');
    item1.className = 'player-list-item';
    item1.setAttribute('value', String(playerId2));
    item1.innerHTML = `
        <button type="button" class="rm-list-btn">X</button>
        <span class="player-list-name ps-3">${PLAYERS[playerId2].name}</span>
    `;
    // Add remove event listener
    (_a = item1.querySelector('.rm-list-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        item1.remove();
        item2.remove();
        // Update PLAYERS dictionary
        PLAYERS[playerId1][listType].delete(playerId2);
        PLAYERS[playerId2][listType].delete(playerId1);
        showFeedbackToast(`Removed ${PLAYERS[playerId2].name} from ${PLAYERS[playerId1].name}'s ${listType}`);
    });
    // Create list item for player 1 in player 2's list
    const item2 = document.createElement('div');
    item2.className = 'player-list-item';
    item2.setAttribute('value', String(playerId1));
    item2.innerHTML = `
        <button type="button" class="rm-list-btn">X</button>
        <span class="player-list-name ps-3">${PLAYERS[playerId1].name}</span>
    `;
    // Add remove event listener
    (_b = item2.querySelector('.rm-list-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        item1.remove();
        item2.remove();
        // Update PLAYERS dictionary
        PLAYERS[playerId1][listType].delete(playerId2);
        PLAYERS[playerId2][listType].delete(playerId1);
        showFeedbackToast(`Removed ${PLAYERS[playerId1].name} from ${PLAYERS[playerId2].name}'s ${listType}`);
    });
    // Add to DOM
    container1.appendChild(item1);
    container2.appendChild(item2);
    // Make sure containers are visible
    const container1Parent = playerEl1.querySelector(`.${listType}-container`);
    const container2Parent = playerEl2.querySelector(`.${listType}-container`);
    if (container1Parent && container1Parent.classList.contains('d-none')) {
        container1Parent.classList.remove('d-none');
    }
    if (container2Parent && container2Parent.classList.contains('d-none')) {
        container2Parent.classList.remove('d-none');
    }
}
// Update addPlayer function to properly initialize player lists and return the player ID
function addPlayer(name, powerLevels) {
    try {
        let playerEl = playerTemplateEl.cloneNode(true);
        let playerID = "player-" + String(playerCount);
        playerEl.setAttribute("id", playerID);
        let nameEl = playerEl.querySelector(".player-name");
        if (nameEl) {
            nameEl.innerHTML = name;
        }
        let powerContainer = playerEl.querySelector(".player-power-container");
        if (powerContainer) {
            for (let pow of powerLevels) {
                let powerpill = powerPillTemplate.cloneNode(true);
                powerpill.innerHTML = getPowerVerboseName(pow)[0];
                powerpill.classList.add(getPowerClass(pow));
                powerContainer.appendChild(powerpill);
            }
        }
        // Update PLAYERS dictionary with proper initialization of whitelist and blacklist
        let powerSet = new Set(powerLevels);
        let player = new Player(playerCount, name, powerSet);
        player.whitelist = new Set();
        player.blacklist = new Set();
        PLAYERS[playerCount] = player;
        // Add BL/WL button click handlers directly
        const blacklistBtn = playerEl.querySelector('.blacklistbutton');
        const whitelistBtn = playerEl.querySelector('.whitelistbutton');
        // Fix remove player button
        let rmButton = playerEl.querySelector(".rm-player-btn");
        if (rmButton) {
            rmButton.addEventListener("click", (ev) => {
                removePlayer(playerID);
            });
        }
        // Event listeners for BL/WL buttons
        blacklistBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            // Remove any existing dropdowns
            const existingDropdowns = document.querySelectorAll('.player-selection-dropdown');
            existingDropdowns.forEach(dropdown => dropdown.remove());
            // Toggle the blacklist container visibility if it's already shown
            const blacklistContainer = playerEl.querySelector('.blacklist-container');
            if (blacklistContainer && !blacklistContainer.classList.contains('d-none')) {
                blacklistContainer.classList.add('d-none');
                return;
            }
            // Show dropdown
            showPlayerSelectionDropdown(playerEl, 'blacklist');
        });
        whitelistBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            // Remove any existing dropdowns
            const existingDropdowns = document.querySelectorAll('.player-selection-dropdown');
            existingDropdowns.forEach(dropdown => dropdown.remove());
            // Toggle the whitelist container visibility if it's already shown
            const whitelistContainer = playerEl.querySelector('.whitelist-container');
            if (whitelistContainer && !whitelistContainer.classList.contains('d-none')) {
                whitelistContainer.classList.add('d-none');
                return;
            }
            // Show dropdown
            showPlayerSelectionDropdown(playerEl, 'whitelist');
        });
        playerContainer.appendChild(playerEl);
        playerCount++;
        // Return the player ID (before incrementing playerCount)
        return playerCount - 1;
    }
    catch (error) {
        console.error("Error adding player:", error);
        showFeedbackToast(`Error adding player: ${error}`, true);
        return -1;
    }
}
function listsContains(player1, player2) {
    var _a, _b;
    var playerId = getListId(player2);
    let children = (_a = player1.querySelector('.whitelist')) === null || _a === void 0 ? void 0 : _a.children;
    if (children != undefined) {
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains(playerId)) {
                // cannot add whitelisted player to blacklist
                return true;
            }
        }
    }
    children = (_b = player1.querySelector('.blacklist')) === null || _b === void 0 ? void 0 : _b.children;
    if (children != undefined) {
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains(playerId)) {
                // cannot add blacklisted player to blacklist
                return true;
            }
        }
    }
    return false;
}
function addBlackList(playerEl1, playerEl2) {
    if (listsContains(playerEl1, playerEl2)) {
        return;
    }
    addListPlayer('.blacklist', playerEl1, playerEl2);
}
function addWhiteList(playerEl1, playerEl2) {
    if (listsContains(playerEl1, playerEl2)) {
        return;
    }
    addListPlayer('.whitelist', playerEl1, playerEl2);
}
function getListId(playerEl) {
    return "list-" + String(playerEl.getAttribute('id'));
}
function addListPlayer(list, playerEl1, playerEl2) {
    var _a, _b;
    let listElement = playerEl1.querySelector("." + list);
    if (listElement) {
        let playerId1 = playerEl1.getAttribute("id") || "";
        let playerId2 = playerEl2.getAttribute("id") || "";
        if (playerId1 && playerId2) {
            let entries = listElement.querySelectorAll("[value='" + playerId2 + "']");
            for (let i = 0; i < entries.length; i++) {
                return;
            }
            let p1Name = ((_a = playerEl1.querySelector(".player-name")) === null || _a === void 0 ? void 0 : _a.textContent) || "";
            let p2Name = ((_b = playerEl2.querySelector(".player-name")) === null || _b === void 0 ? void 0 : _b.textContent) || "";
            if (!p1Name || !p2Name) {
                return;
            }
            let listTemplate = document.getElementById("list-template");
            let listPlayer = listTemplate.cloneNode(true);
            // Update to use the new player-list-item styling
            listPlayer.classList.add('player-list-item');
            listPlayer.setAttribute("value", playerId2);
            let listPlayerName = listPlayer.querySelector(".player-list-name");
            listPlayerName.innerText = p2Name;
            let rmButton = listPlayer.querySelector(".rm-list-btn");
            rmButton.addEventListener("click", (ev) => {
                let p2El = document.getElementById(playerId2);
                let p1ListEl = rmButton.closest("[value='" + playerId2 + "']");
                if (p2El && p1ListEl) {
                    removeListPlayer(list, playerEl1, p1ListEl, p2El, p2El.querySelector("." + list).querySelector("[value='" + playerId1 + "']"));
                }
            });
            listElement.appendChild(listPlayer);
            // Add player to the opposite player's list
            let list2Element = playerEl2.querySelector("." + list);
            let l2Player = listTemplate.cloneNode(true);
            // Update to use the new player-list-item styling
            l2Player.classList.add('player-list-item');
            l2Player.setAttribute("value", playerId1);
            let l2PlayerName = l2Player.querySelector(".player-list-name");
            l2PlayerName.innerText = p1Name;
            let rm2Button = l2Player.querySelector(".rm-list-btn");
            rm2Button.addEventListener("click", (ev) => {
                let p1El = document.getElementById(playerId1);
                let p2ListEl = rm2Button.closest("[value='" + playerId1 + "']");
                if (p1El && p2ListEl) {
                    removeListPlayer(list, playerEl2, p2ListEl, p1El, p1El.querySelector("." + list).querySelector("[value='" + playerId2 + "']"));
                }
            });
            list2Element.appendChild(l2Player);
            // Update the Player objects in the PLAYERS dictionary
            let player1Id = parseInt(playerId1.replace("player-", ""));
            let player2Id = parseInt(playerId2.replace("player-", ""));
            if (list === "blacklist") {
                PLAYERS[player1Id].blacklist.add(player2Id);
                PLAYERS[player2Id].blacklist.add(player1Id);
                // Show feedback
                showFeedbackToast(`Added ${p2Name} to ${p1Name}'s blacklist`);
            }
            else {
                PLAYERS[player1Id].whitelist.add(player2Id);
                PLAYERS[player2Id].whitelist.add(player1Id);
                // Show feedback
                showFeedbackToast(`Added ${p2Name} to ${p1Name}'s whitelist`);
            }
        }
    }
}
function removeListPlayer(list, pEl1, pListEl1, pEl2, pListEl2) {
    var _a, _b, _c, _d;
    // Get player names for feedback
    const p1Name = ((_a = pEl1.querySelector(".player-name")) === null || _a === void 0 ? void 0 : _a.textContent) || "Player 1";
    const p2Name = ((_b = pEl2.querySelector(".player-name")) === null || _b === void 0 ? void 0 : _b.textContent) || "Player 2";
    // Remove the list elements
    if (pListEl1.parentElement) {
        pListEl1.parentElement.removeChild(pListEl1);
    }
    if (pListEl2.parentElement) {
        pListEl2.parentElement.removeChild(pListEl2);
    }
    // Update the PLAYERS dictionary
    let player1Id = parseInt(((_c = pEl1.getAttribute("id")) === null || _c === void 0 ? void 0 : _c.replace("player-", "")) || "0");
    let player2Id = parseInt(((_d = pEl2.getAttribute("id")) === null || _d === void 0 ? void 0 : _d.replace("player-", "")) || "0");
    if (list === "blacklist") {
        if (PLAYERS[player1Id])
            PLAYERS[player1Id].blacklist.delete(player2Id);
        if (PLAYERS[player2Id])
            PLAYERS[player2Id].blacklist.delete(player1Id);
        // Show feedback
        showFeedbackToast(`Removed ${p2Name} from ${p1Name}'s blacklist`, false);
    }
    else {
        if (PLAYERS[player1Id])
            PLAYERS[player1Id].whitelist.delete(player2Id);
        if (PLAYERS[player2Id])
            PLAYERS[player2Id].whitelist.delete(player1Id);
        // Show feedback
        showFeedbackToast(`Removed ${p2Name} from ${p1Name}'s whitelist`, false);
    }
}
function toggleListVisibility(listEl) {
    listEl.classList.toggle('d-none');
}
function dropListPlayer(event) {
    var _a, _b;
    event.preventDefault();
    let sourceId = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
    if (sourceId) {
        const playerDragged = document.getElementById(sourceId);
        let trg = event.target;
        if (!Boolean(playerDragged.classList.contains('player-container-instance'))) {
            return;
        }
        if (trg.closest('#players-container') != null) {
            var addFunction;
            if (trg.closest('.listcontainer') != null) {
                // dropped in list container
                if ((_b = trg.closest('.listcontainer')) === null || _b === void 0 ? void 0 : _b.classList.contains('whitelist-container')) {
                    addFunction = addWhiteList;
                }
                else {
                    addFunction = addBlackList;
                }
            }
            else if (trg.classList.contains('listbutton')) {
                // dropped on buttons
                if (trg.classList.contains('blacklistbutton')) {
                    addFunction = addBlackList;
                }
                else {
                    addFunction = addWhiteList;
                }
            }
            else {
                // bad drop
                return;
            }
            const playerDropped = trg.closest('.player-container-instance');
            addFunction(playerDragged, playerDropped);
        }
    }
}
function dragListPlayer(event) {
    var _a;
    (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData("text/plain", event.target.id);
}
var Solutions = [];
var solutionScores = [];
function newSolution(seatings, score) {
    // Update current solution
    currentSolution = { seatings, score };
    // Update UI
    updateStagedSolution(currentSolution);
}
function dragStagedPlayer(event) {
    var _a;
    let playerEl = event.target;
    (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData("text/plain", playerEl.id);
}
function dropStagedPlayer(event) {
    var _a;
    event.preventDefault();
    var playerEl, toTable;
    if ((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData("text/plain")) {
        playerEl = document.getElementById(event.dataTransfer.getData('text/plain'));
        if (playerEl.classList.contains("solution-seat")) {
            var tableSeatsContainer = event.target.closest(".solution-seats-container");
            if (tableSeatsContainer && !tableSeatsContainer.contains(playerEl)) {
                toTable = tableSeatsContainer;
                toTable.appendChild(playerEl);
            }
        }
    }
}
function stageSolution(solutionIndex) {
    var _a;
    stagedSolutionTitleEl.innerHTML = "Solution #" + String(solutionIndex + 1) + " - score: " + solutionScores[solutionIndex];
    solutionStage.innerHTML = "";
    let tempId = 0;
    for (let tableArray of Solutions[solutionIndex]) {
        if (tableArray.length === 0) {
            continue;
        }
        let newSolutionTable = solutionTableTemplate.cloneNode(true);
        newSolutionTable.removeAttribute('id');
        let solutionSeats = newSolutionTable.querySelector('.solution-seats-container');
        solutionStage.appendChild(newSolutionTable);
        solutionSeats.addEventListener('drop', dropStagedPlayer);
        solutionSeats.addEventListener('dragover', (ev) => { ev.preventDefault(); });
        for (let seat of tableArray) {
            let newSolutionSeat = solutionSeatTemplate.cloneNode(true);
            newSolutionSeat.setAttribute('id', 'staged-' + String(tempId));
            tempId++;
            let playerEl = document.getElementById('player-' + String(seat));
            let playerName;
            if (playerEl) {
                playerName = String((_a = playerEl.querySelector('.player-name')) === null || _a === void 0 ? void 0 : _a.innerHTML);
            }
            else {
                playerName = "Error";
            }
            let seatNameEl = newSolutionSeat.querySelector('.solution-name');
            if (seatNameEl) {
                seatNameEl.innerHTML = playerName;
            }
            // set powerlevel
            let powerContainer = playerEl.querySelector(".player-power-container");
            let powerList = [];
            for (let i = 0; i < powerContainer.children.length; i++) {
                let powerSelection = powerContainer.children[i];
                powerList.push(Number(powerSelection.getAttribute("value")));
            }
            powerList.sort();
            let powerPillsContainer = newSolutionSeat.querySelector('.solution-seat-power-container');
            for (let power of powerList) {
                let newPill = powerPillTemplate.cloneNode(true);
                newPill.removeAttribute("id");
                newPill.classList.add(getPowerClass(power));
                powerPillsContainer.appendChild(newPill);
            }
            // add drag events    
            newSolutionSeat.setAttribute('draggable', 'true');
            newSolutionSeat.addEventListener('dragstart', dragStagedPlayer);
            newSolutionSeat.addEventListener('dragover', (ev) => { ev.preventDefault(); });
            // add to seat
            solutionSeats.appendChild(newSolutionSeat);
        }
    }
}
function resetSolutions() {
    solutionStage.innerHTML = ""; // clean staged solution
    solutionsList.innerHTML = ""; // clean solution buttons
    stagedSolutionTitleEl.innerHTML = ""; // clean solution number title
    Solutions = []; // clear cached solutions
    solutionScores = [];
}
function toggleLoad() {
    loadingSpinner.classList.toggle('d-none');
    for (let i = 0; i < searchBtns.length; i++) {
        searchBtns[i].classList.toggle('d-none');
    }
}
function bindSearch() {
    var _a, _b;
    (_a = document.getElementById('activate-search-agent')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        newSearch("astar");
    });
    (_b = document.getElementById('activate-random-agent')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        newSearch("random");
    });
}
function newSearch(agent) {
    // Reset and show progress UI
    searchProgressContainer.classList.remove('d-none');
    const progressBar = document.getElementById('search-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.classList.add('progress-bar-animated');
        progressBar.classList.remove('bg-success', 'bg-danger');
    }
    document.getElementById('nodes-expanded').textContent = '0';
    document.getElementById('goals-found').textContent = '0';
    document.getElementById('best-score').textContent = '∞';
    // Show loading spinner
    loadingSpinner.classList.remove('d-none');
    // Disable search buttons during search
    Array.from(searchBtns).forEach((btn) => {
        btn.disabled = true;
    });
    // Run search in next event loop to allow UI to update
    setTimeout(() => {
        try {
            doSearch(agent);
            // Re-enable search buttons
            Array.from(searchBtns).forEach((btn) => {
                btn.disabled = false;
            });
        }
        catch (error) {
            console.error('Search error:', error);
            // Re-enable search buttons on error
            Array.from(searchBtns).forEach((btn) => {
                btn.disabled = false;
            });
            // Show error in progress bar
            if (progressBar) {
                progressBar.classList.remove('progress-bar-animated');
                progressBar.classList.add('bg-danger');
                progressBar.style.width = '100%';
            }
            // Show error message
            showFeedbackToast('Search failed: ' + error.message, true);
        }
    }, 50);
}
// Setup handlers for the configuration modal
function setupConfigurationHandlers() {
    var _a, _b, _c;
    // Setup weight input sliders
    const weightInputs = {
        powerImbalance: document.getElementById('powerImbalanceWeight'),
        powerDiversity: document.getElementById('powerDiversityWeight'),
        powerDiff: document.getElementById('powerDiffWeight'),
        blacklist: document.getElementById('blacklistWeight'),
        emptySeat: document.getElementById('emptySeatWeight'),
        unseated: document.getElementById('unseatedWeight'),
        playHistory: document.getElementById('playHistoryWeight')
    };
    // Setup weight value displays
    const weightValues = {
        powerImbalance: document.getElementById('powerImbalanceValue'),
        powerDiversity: document.getElementById('powerDiversityValue'),
        powerDiff: document.getElementById('powerDiffValue'),
        blacklist: document.getElementById('blacklistValue'),
        emptySeat: document.getElementById('emptySeatValue'),
        unseated: document.getElementById('unseatedValue'),
        playHistory: document.getElementById('playHistoryValue')
    };
    // Initialize sliders with current weight values
    const currentWeights = getHeuristicWeights();
    weightInputs.powerImbalance.value = currentWeights.powerImbalance.toString();
    weightInputs.powerDiversity.value = currentWeights.powerDiversity.toString();
    weightInputs.powerDiff.value = currentWeights.powerDiff.toString();
    weightInputs.blacklist.value = currentWeights.blacklist.toString();
    weightInputs.emptySeat.value = currentWeights.emptySeat.toString();
    weightInputs.unseated.value = currentWeights.unseated.toString();
    weightInputs.playHistory.value = currentWeights.playHistory.toString();
    // Setup event listeners for sliders
    weightInputs.powerImbalance.addEventListener('input', () => {
        weightValues.powerImbalance.textContent = weightInputs.powerImbalance.value;
    });
    weightInputs.powerDiversity.addEventListener('input', () => {
        weightValues.powerDiversity.textContent = weightInputs.powerDiversity.value;
    });
    weightInputs.powerDiff.addEventListener('input', () => {
        weightValues.powerDiff.textContent = weightInputs.powerDiff.value;
    });
    weightInputs.blacklist.addEventListener('input', () => {
        weightValues.blacklist.textContent = weightInputs.blacklist.value;
    });
    weightInputs.emptySeat.addEventListener('input', () => {
        weightValues.emptySeat.textContent = weightInputs.emptySeat.value;
    });
    weightInputs.unseated.addEventListener('input', () => {
        weightValues.unseated.textContent = weightInputs.unseated.value;
    });
    weightInputs.playHistory.addEventListener('input', () => {
        weightValues.playHistory.textContent = weightInputs.playHistory.value;
    });
    // Setup Apply button
    const applyWeightsBtn = document.getElementById('apply-weights-btn');
    if (applyWeightsBtn) {
        applyWeightsBtn.addEventListener('click', () => {
            // Apply weight changes
            setHeuristicWeights({
                powerImbalance: parseInt(weightInputs.powerImbalance.value),
                powerDiversity: parseInt(weightInputs.powerDiversity.value),
                powerDiff: parseFloat(weightInputs.powerDiff.value),
                blacklist: parseInt(weightInputs.blacklist.value),
                emptySeat: parseInt(weightInputs.emptySeat.value),
                unseated: parseInt(weightInputs.unseated.value),
                playHistory: parseInt(weightInputs.playHistory.value)
            });
            showFeedbackToast('Heuristic weights updated successfully', false);
        });
    }
    // Setup Reset button
    const resetWeightsBtn = document.getElementById('reset-weights-btn');
    if (resetWeightsBtn) {
        resetWeightsBtn.addEventListener('click', () => {
            // Reset to default weights
            const defaultWeights = {
                powerImbalance: 10,
                powerDiversity: 0,
                powerDiff: 0.1,
                blacklist: 50,
                emptySeat: 30,
                unseated: 1,
                playHistory: 5
            };
            // Update the UI
            weightInputs.powerImbalance.value = defaultWeights.powerImbalance.toString();
            weightInputs.powerDiversity.value = defaultWeights.powerDiversity.toString();
            weightInputs.powerDiff.value = defaultWeights.powerDiff.toString();
            weightInputs.blacklist.value = defaultWeights.blacklist.toString();
            weightInputs.emptySeat.value = defaultWeights.emptySeat.toString();
            weightInputs.unseated.value = defaultWeights.unseated.toString();
            weightInputs.playHistory.value = defaultWeights.playHistory.toString();
            // Update the displayed values
            weightValues.powerImbalance.textContent = defaultWeights.powerImbalance.toString();
            weightValues.powerDiversity.textContent = defaultWeights.powerDiversity.toString();
            weightValues.powerDiff.textContent = defaultWeights.powerDiff.toString();
            weightValues.blacklist.textContent = defaultWeights.blacklist.toString();
            weightValues.emptySeat.textContent = defaultWeights.emptySeat.toString();
            weightValues.unseated.textContent = defaultWeights.unseated.toString();
            weightValues.playHistory.textContent = defaultWeights.playHistory.toString();
            // Apply default weights
            setHeuristicWeights(defaultWeights);
        });
    }
    // Handle History Tab
    (_a = document.getElementById('export-history-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        exportPlayHistory();
        showFeedbackToast('Play history exported successfully', false);
    });
    (_b = document.getElementById('clear-history-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all play history? This cannot be undone.')) {
            clearPlayHistory();
            showFeedbackToast('Play history cleared', false);
        }
    });
    (_c = document.getElementById('import-history')) === null || _c === void 0 ? void 0 : _c.addEventListener('change', (e) => {
        const fileInput = e.target;
        if (fileInput.files && fileInput.files.length > 0) {
            importPlayHistory(fileInput.files[0]);
            showFeedbackToast('Play history imported', false);
            fileInput.value = ''; // Clear the input for future imports
        }
    });
    // Add play history visualization to the history tab
    const historyTab = document.getElementById('history');
    if (historyTab) {
        const historyVisualization = document.createElement('div');
        historyVisualization.id = 'history-visualization';
        historyVisualization.className = 'mt-4';
        const historyTitle = document.createElement('h5');
        historyTitle.textContent = 'Current Play History';
        historyVisualization.appendChild(historyTitle);
        const historyContent = document.createElement('div');
        historyContent.id = 'history-content';
        historyContent.className = 'history-content';
        historyVisualization.appendChild(historyContent);
        historyTab.appendChild(historyVisualization);
        // Add button to refresh history visualization
        const refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.className = 'btn btn-info mt-2';
        refreshButton.textContent = 'Refresh History View';
        refreshButton.addEventListener('click', updateHistoryVisualization);
        historyTab.appendChild(refreshButton);
    }
}
// Update the addButtonEvents function to handle static checkboxes
function addButtonEvents() {
    addPlayerButton.addEventListener("click", (ev) => {
        let playerName = playerNameInput.value.trim();
        let playerPower = [];
        // Get all checked power level checkboxes - now targeting the direct IDs
        document.querySelectorAll('#power-level-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
            const powerLevel = parseInt(checkbox.value);
            if (!isNaN(powerLevel)) {
                playerPower.push(powerLevel);
            }
        });
        console.log(`Adding player: ${playerName} with power levels: ${playerPower}`);
        if (playerName && playerPower.length > 0) {
            addPlayer(playerName, playerPower);
            // Clear form
            playerNameInput.value = '';
            document.querySelectorAll('#power-level-checkboxes input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            // Focus on name input for next player
            playerNameInput.focus();
        }
        else {
            showFeedbackToast("Please enter a name and select at least one power level", true);
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    loadPage();
});
function addPowerSelections() {
    // We now have static checkboxes, so we just need to add event listeners
    // Add color classes to the checkboxes
    document.querySelectorAll('#power-level-checkboxes input[type="checkbox"]').forEach(checkbox => {
        const powerLevel = parseInt(checkbox.value);
        if (!isNaN(powerLevel)) {
            // Add power level class to label
            const label = checkbox.closest('label');
            if (label) {
                label.classList.add(getPowerClass(powerLevel));
            }
        }
    });
}
const Powerlevel = {
    CASUAL: 1,
    MEDIUM: 2,
    HIGH: 3,
    COMP: 4
};
function getPowerClass(powerLevel) {
    let powerStr = "power-";
    let level = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):
            level = "casual";
            break;
        case (Powerlevel.MEDIUM):
            level = "medium";
            break;
        case (Powerlevel.HIGH):
            level = "high";
            break;
        case (Powerlevel.COMP):
            level = "comp";
            break;
        default:
            level = "err";
            break;
    }
    return powerStr + level;
}
function getPowerVerboseName(powerLevel) {
    let powerStr = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):
            powerStr = "Casual";
            break;
        case (Powerlevel.MEDIUM):
            powerStr = "Medium";
            break;
        case (Powerlevel.HIGH):
            powerStr = "High";
            break;
        case (Powerlevel.COMP):
            powerStr = "CEDH";
            break;
        default:
            powerStr = "Error";
            break;
    }
    return powerStr;
}
function removePlayer(playerId) {
    let p = document.getElementById(playerId);
    if (!p)
        return;
    // Get player ID for updating PLAYERS dictionary
    const playerIdNum = getPlayerIdFromElement(p);
    if (playerIdNum !== null && PLAYERS[playerIdNum]) {
        // Delete from PLAYERS dictionary
        delete PLAYERS[playerIdNum];
    }
    // Remove from DOM
    p.remove();
}
function sortPlayers() {
    let playerList = playerContainer.children;
    let playerArray = Array.from(playerList);
    playerArray = playerArray.sort((a, b) => {
        var _a, _b;
        let aName = (_a = a.querySelector('.player-name')) === null || _a === void 0 ? void 0 : _a.innerHTML;
        let bName = (_b = b.querySelector('.player-name')) === null || _b === void 0 ? void 0 : _b.innerHTML;
        // Get power levels for comparison
        const aPowerContainer = a.querySelector('.player-power-container');
        const bPowerContainer = b.querySelector('.player-power-container');
        // If we want to sort by power level first, uncomment this section
        /*
        const aPowerLevel = getHighestPowerLevel(aPowerContainer);
        const bPowerLevel = getHighestPowerLevel(bPowerContainer);
        
        // If power levels are different, sort by power
        if (aPowerLevel !== bPowerLevel) {
            return bPowerLevel - aPowerLevel; // Higher power levels first
        }
        */
        // Otherwise, sort by name
        if (aName && bName) {
            aName = aName.trim();
            bName = bName.trim();
            return ('' + aName).localeCompare(bName);
        }
        return 0;
    });
    // Clear and re-add in sorted order
    while (playerContainer.firstChild) {
        playerContainer.removeChild(playerContainer.firstChild);
    }
    playerArray.forEach(player => {
        playerContainer.appendChild(player);
    });
}
// Helper function to get the highest power level from a player
function getHighestPowerLevel(powerContainer) {
    if (!powerContainer)
        return 0;
    let highestPower = 0;
    const powerPills = powerContainer.querySelectorAll('.powerpill');
    powerPills.forEach(pill => {
        const powerClassMatch = Array.from(pill.classList)
            .find(cls => cls.startsWith('power-'));
        if (powerClassMatch) {
            switch (powerClassMatch) {
                case 'power-casual':
                    highestPower = Math.max(highestPower, Powerlevel.CASUAL);
                    break;
                case 'power-medium':
                    highestPower = Math.max(highestPower, Powerlevel.MEDIUM);
                    break;
                case 'power-high':
                    highestPower = Math.max(highestPower, Powerlevel.HIGH);
                    break;
                case 'power-comp':
                    highestPower = Math.max(highestPower, Powerlevel.COMP);
                    break;
            }
        }
    });
    return highestPower;
}
// Add event listeners for search progress
function setupSearchProgressListeners() {
    // Listen for progress updates during search
    document.addEventListener('searchProgressUpdate', (event) => {
        const progress = event.detail.progress;
        // Show progress container if hidden
        if (searchProgressContainer.classList.contains('d-none')) {
            searchProgressContainer.classList.remove('d-none');
        }
        // Update progress bar
        const progressBar = document.getElementById('search-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress.progressPercent}%`;
            progressBar.setAttribute('aria-valuenow', progress.progressPercent.toString());
        }
        // Update stats
        document.getElementById('nodes-expanded').textContent = progress.nodesExpanded.toString();
        document.getElementById('goals-found').textContent = progress.goalsFound.toString();
        document.getElementById('best-score').textContent =
            progress.bestScore === Infinity ? '∞' : progress.bestScore.toFixed(1);
    });
    // Listen for search completion
    document.addEventListener('searchComplete', (event) => {
        // Hide loading spinner
        if (!loadingSpinner.classList.contains('d-none')) {
            loadingSpinner.classList.add('d-none');
        }
        // Update progress bar to complete state
        const progressBar = document.getElementById('search-progress-bar');
        if (progressBar) {
            progressBar.classList.remove('progress-bar-animated');
            // Change color based on success or failure
            const progress = event.detail.progress;
            if (progress.goalsFound > 0) {
                progressBar.classList.remove('bg-danger');
                progressBar.classList.add('bg-success');
                showFeedbackToast(`Search completed successfully! Found ${progress.goalsFound} solution(s).`, false);
            }
            else {
                progressBar.classList.remove('bg-success');
                progressBar.classList.add('bg-danger');
                // Provide more helpful feedback about why the search failed
                const message = progress.nodesExpanded >= 100000
                    ? "Search timed out. Try reducing the number of players or adjusting constraints."
                    : "No valid solutions found. Try relaxing some constraints or adding more tables.";
                showFeedbackToast(message, true);
            }
        }
        // Hide progress container after a delay
        setTimeout(() => {
            searchProgressContainer.classList.add('d-none');
            // Reset progress bar
            if (progressBar) {
                progressBar.classList.remove('bg-success', 'bg-danger');
                progressBar.classList.add('progress-bar-animated');
                progressBar.style.width = '0%';
                progressBar.setAttribute('aria-valuenow', '0');
            }
        }, 5000); // Longer delay to ensure user sees the result
    });
}
// Function to update visual indicators for play history
function updatePlayHistoryIndicators() {
    // This function is now disabled to remove all visual indicators
    // The play history is still tracked in the data, but not visually displayed
    return;
    /* Original code commented out
    // Clear any existing indicators
    document.querySelectorAll('.play-history-indicator, .player-connection').forEach(el => el.remove());
    
    // For each solution table, check player pairings
    const tables = document.querySelectorAll('.solution-seats-container');
    
    tables.forEach(table => {
        const seats = table.querySelectorAll('.solution-seat:not(.empty-seat)');
        const seatArray = Array.from(seats);
        
        // Check each pair of players
        for (let i = 0; i < seatArray.length; i++) {
            for (let j = i + 1; j < seatArray.length; j++) {
                const seat1 = seatArray[i] as HTMLElement;
                const seat2 = seatArray[j] as HTMLElement;
                
                // Get player IDs
                const playerId1 = parseInt(seat1.getAttribute('data-player-id') || '-1');
                const playerId2 = parseInt(seat2.getAttribute('data-player-id') || '-1');
                
                if (playerId1 === -1 || playerId2 === -1) continue;
                
                // Check play history
                const playCount = getPlayCount(playerId1, playerId2);
                if (playCount > 0) {
                    // Add indicators to both seats (small dots)
                    addPlayHistoryIndicator(seat1, playCount);
                    addPlayHistoryIndicator(seat2, playCount);
                    
                    // Visual connections are now disabled
                    // createPlayerConnection(seat1, seat2, playCount);
                }
            }
        }
    });
    */
}
// Helper function to get play count between players
function getPlayCount(playerId1, playerId2) {
    // Check direct relationship
    if (playerPlayHistory[playerId1] && playerPlayHistory[playerId1][playerId2]) {
        return playerPlayHistory[playerId1][playerId2];
    }
    // Check reverse relationship
    if (playerPlayHistory[playerId2] && playerPlayHistory[playerId2][playerId1]) {
        return playerPlayHistory[playerId2][playerId1];
    }
    return 0;
}
// Helper function to add indicator to a seat
function addPlayHistoryIndicator(seat, playCount) {
    // This function is now disabled to remove the visual indicators
    // The play history is still tracked in the data, but not visually displayed
    return;
    /* Original code commented out
    const indicator = document.createElement('div');
    indicator.className = 'play-history-indicator';
    indicator.title = `Played together ${playCount} times`;
    
    // Style based on frequency
    if (playCount >= 3) {
        indicator.classList.add('frequent');
    } else if (playCount >= 2) {
        indicator.classList.add('moderate');
    }
    
    seat.appendChild(indicator);
    */
}
// Helper function to create a visual connection between players
function createPlayerConnection(seat1, seat2, playCount) {
    // This function is now disabled to remove the visual connections
    // The play history is still tracked in the data, but not visually displayed
    return;
    /* Original code commented out
    const rect1 = seat1.getBoundingClientRect();
    const rect2 = seat2.getBoundingClientRect();
    
    const connection = document.createElement('div');
    connection.className = 'player-connection';
    
    // Style based on frequency
    if (playCount >= 3) {
        connection.classList.add('frequent');
    } else if (playCount >= 2) {
        connection.classList.add('moderate');
    }
    
    // Position the connection line
    const x1 = rect1.left + rect1.width / 2;
    const y1 = rect1.top + rect1.height / 2;
    const x2 = rect2.left + rect2.width / 2;
    const y2 = rect2.top + rect2.height / 2;
    
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    connection.style.width = `${length}px`;
    connection.style.left = `${x1}px`;
    connection.style.top = `${y1}px`;
    connection.style.transform = `rotate(${angle}deg)`;
    
    document.body.appendChild(connection);
    */
}
// Function to update the history visualization
function updateHistoryVisualization() {
    const historyContent = document.getElementById('history-content');
    if (!historyContent)
        return;
    // Clear existing content
    historyContent.innerHTML = '';
    // Check if we have history data
    const historyEntries = Object.entries(playerPlayHistory);
    if (historyEntries.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'text-muted';
        emptyMessage.textContent = 'No play history data available yet.';
        historyContent.appendChild(emptyMessage);
        return;
    }
    // Create a table for the history data
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover';
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const playerHeader = document.createElement('th');
    playerHeader.textContent = 'Player';
    headerRow.appendChild(playerHeader);
    const playedWithHeader = document.createElement('th');
    playedWithHeader.textContent = 'Played With';
    headerRow.appendChild(playedWithHeader);
    const timesHeader = document.createElement('th');
    timesHeader.textContent = 'Times';
    headerRow.appendChild(timesHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    // Table body
    const tbody = document.createElement('tbody');
    // Collect and sort play history data
    const playHistoryData = [];
    for (const [playerId1, playedWith] of historyEntries) {
        const player1 = PLAYERS[parseInt(playerId1)];
        if (!player1)
            continue; // Skip if player no longer exists
        for (const [playerId2, count] of Object.entries(playedWith)) {
            const player2 = PLAYERS[parseInt(playerId2)];
            if (!player2)
                continue; // Skip if player no longer exists
            playHistoryData.push({
                player1: player1.name,
                player2: player2.name,
                count: Number(count) // Explicitly convert to number to fix TypeScript error
            });
        }
    }
    // Sort by count (highest first)
    playHistoryData.sort((a, b) => b.count - a.count);
    // Add rows to the table
    playHistoryData.forEach(entry => {
        const row = document.createElement('tr');
        const player1Cell = document.createElement('td');
        player1Cell.textContent = entry.player1;
        row.appendChild(player1Cell);
        const player2Cell = document.createElement('td');
        player2Cell.textContent = entry.player2;
        row.appendChild(player2Cell);
        const countCell = document.createElement('td');
        countCell.textContent = entry.count.toString();
        // Color-code based on frequency
        if (entry.count >= 3) {
            countCell.className = 'text-danger font-weight-bold';
        }
        else if (entry.count >= 2) {
            countCell.className = 'text-warning';
        }
        row.appendChild(countCell);
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    historyContent.appendChild(table);
}
// Function to show welcome message with improvements summary
function showWelcomeMessage() {
    var _a;
    const welcomeToast = document.createElement('div');
    welcomeToast.className = 'welcome-toast';
    welcomeToast.innerHTML = `
        <div class="welcome-header">
            <h4>Welcome to the Improved PodPal</h4>
            <button type="button" class="close-btn">&times;</button>
        </div>
        <div class="welcome-content">
            <h5>Key Improvements:</h5>
            <ul>
                <li><span class="highlight">Search Algorithm:</span> More efficient pod arrangement with real-time progress tracking</li>
                <li><span class="highlight">Play History:</span> Track and visualize who has played together</li>
                <li><span class="highlight">User Interface:</span> Improved visual design and feedback</li>
                <li><span class="highlight">Player Management:</span> Better blacklist/whitelist system</li>
            </ul>
            <p>Get started by adding players and clicking "Cook" to arrange them into balanced pods!</p>
        </div>
    `;
    document.body.appendChild(welcomeToast);
    // Add close button functionality
    (_a = welcomeToast.querySelector('.close-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        welcomeToast.classList.add('closing');
        setTimeout(() => welcomeToast.remove(), 500);
    });
    // Auto close after 10 seconds
    setTimeout(() => {
        if (document.body.contains(welcomeToast)) {
            welcomeToast.classList.add('closing');
            setTimeout(() => welcomeToast.remove(), 500);
        }
    }, 10000);
}
// Function to show search optimization tips
function showSearchOptimizationTips() {
    var _a;
    const tipsToast = document.createElement('div');
    tipsToast.className = 'tips-toast';
    tipsToast.innerHTML = `
        <div class="tips-header">
            <h4>Search Optimization Tips</h4>
            <button type="button" class="close-btn">&times;</button>
        </div>
        <div class="tips-content">
            <ul>
                <li>Use <strong>blacklists</strong> sparingly - they constrain the search space</li>
                <li>Players with <strong>similar power levels</strong> will be grouped together</li>
                <li>The <strong>Configure</strong> button lets you adjust how the algorithm weighs different factors</li>
                <li>For large groups, the search may take longer but can be interrupted</li>
                <li>You can always <strong>drag and drop</strong> players to manually adjust pods</li>
            </ul>
        </div>
    `;
    document.body.appendChild(tipsToast);
    // Add close button functionality
    (_a = tipsToast.querySelector('.close-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        tipsToast.classList.add('closing');
        setTimeout(() => tipsToast.remove(), 500);
    });
    // Auto close after 8 seconds
    setTimeout(() => {
        if (document.body.contains(tipsToast)) {
            tipsToast.classList.add('closing');
            setTimeout(() => tipsToast.remove(), 500);
        }
    }, 8000);
}
// Function to make power pills editable
function makePowerPillsEditable() {
    // Add click event handlers to all power pills
    document.addEventListener('click', (event) => {
        const target = event.target;
        // Check if we clicked on a power pill in a player row
        if (target.classList.contains('powerpill') && target.closest('.player-power-container')) {
            // Get the player container
            const playerContainer = target.closest('.player-container-instance');
            if (!playerContainer)
                return;
            // Get player ID from container
            const playerId = getPlayerIdFromElement(playerContainer);
            if (playerId === null)
                return;
            // Create power pill editor if it doesn't exist
            let editor = document.querySelector('.power-pill-editor');
            if (!editor) {
                editor = createPowerPillEditor(playerId);
                document.body.appendChild(editor);
            }
            else {
                // If editor exists, update it for this player
                updatePowerPillEditor(editor, playerId);
            }
            // Position editor near the clicked power pill
            const rect = target.getBoundingClientRect();
            editor.setAttribute('style', `top: ${rect.bottom + 5}px; left: ${rect.left}px`);
            // Prevent default behavior and stop propagation
            event.preventDefault();
            event.stopPropagation();
        }
    });
    // Close editor when clicking outside
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!target.closest('.power-pill-editor') && !target.classList.contains('powerpill')) {
            const editor = document.querySelector('.power-pill-editor');
            if (editor) {
                editor.remove();
            }
        }
    });
}
// Create the power pill editor UI
function createPowerPillEditor(playerId) {
    const editor = document.createElement('div');
    editor.className = 'power-pill-editor';
    editor.setAttribute('data-player-id', playerId.toString());
    // Get player's current power levels
    const player = PLAYERS[playerId];
    if (!player)
        return editor;
    // Create pill for each power level
    const powerLevels = [
        { value: Powerlevel.COMP, name: "CEDH", shortName: "C" },
        { value: Powerlevel.HIGH, name: "High", shortName: "H" },
        { value: Powerlevel.MEDIUM, name: "Mid", shortName: "M" },
        { value: Powerlevel.CASUAL, name: "Casual", shortName: "C" }
    ];
    powerLevels.forEach(power => {
        const pill = document.createElement('div');
        pill.className = `powerpill ${getPowerClass(power.value)}`;
        pill.textContent = power.shortName;
        pill.setAttribute('data-power-level', power.value.toString());
        pill.setAttribute('title', power.name);
        // Mark as active if player has this power level
        if (player.power.has(power.value)) {
            pill.classList.add('active');
        }
        // Add click handler to toggle power level
        pill.addEventListener('click', (event) => {
            togglePlayerPowerLevel(playerId, power.value);
            event.stopPropagation();
        });
        editor.appendChild(pill);
    });
    return editor;
}
// Update existing editor for a different player
function updatePowerPillEditor(editor, playerId) {
    editor.setAttribute('data-player-id', playerId.toString());
    // Get player's current power levels
    const player = PLAYERS[playerId];
    if (!player)
        return;
    // Update active state for each pill
    editor.querySelectorAll('.powerpill').forEach(pill => {
        const powerLevel = parseInt(pill.getAttribute('data-power-level') || '0');
        if (player.power.has(powerLevel)) {
            pill.classList.add('active');
        }
        else {
            pill.classList.remove('active');
        }
    });
}
// Toggle a power level for a player
function togglePlayerPowerLevel(playerId, powerLevel) {
    // Get the player
    const player = PLAYERS[playerId];
    if (!player)
        return;
    // Find the player element in the DOM
    const playerEl = document.getElementById(`player-${playerId}`);
    if (!playerEl)
        return;
    // Find the power container
    const powerContainer = playerEl.querySelector('.player-power-container');
    if (!powerContainer)
        return;
    // Toggle the power level in the player object
    if (player.power.has(powerLevel)) {
        // Don't remove if it's the last power level
        if (player.power.size > 1) {
            player.power.delete(powerLevel);
        }
        else {
            showFeedbackToast("Cannot remove last power level", true);
            return;
        }
    }
    else {
        player.power.add(powerLevel);
    }
    // Update the power pills in the UI
    updatePlayerPowerPills(playerEl, player);
    // Find and update the power pill editor
    const editor = document.querySelector('.power-pill-editor');
    if (editor) {
        updatePowerPillEditor(editor, playerId);
    }
    // Update player in PLAYERS dictionary
    PLAYERS[playerId] = player;
    // Show success toast
    showFeedbackToast(`Updated power levels for ${player.name}`, false);
}
// Update the power pills displayed for a player
function updatePlayerPowerPills(playerEl, player) {
    const powerContainer = playerEl.querySelector('.player-power-container');
    if (!powerContainer)
        return;
    // Clear existing pills
    powerContainer.innerHTML = '';
    // Add updated pills
    Array.from(player.power).sort((a, b) => b - a).forEach(powerLevel => {
        const pill = document.createElement('div');
        pill.className = `powerpill ${getPowerClass(powerLevel)}`;
        pill.textContent = getPowerVerboseName(powerLevel)[0];
        powerContainer.appendChild(pill);
    });
}
// Function to handle sidebar toggle functionality
function setupSidebar() {
    const sidebar = document.getElementById('info-sidebar');
    const container = document.querySelector('.container');
    const toggleBtn = document.getElementById('toggle-info-btn');
    const toggleIcon = toggleBtn === null || toggleBtn === void 0 ? void 0 : toggleBtn.querySelector('.toggle-icon');
    if (!sidebar || !container || !toggleBtn || !toggleIcon) {
        console.error('Sidebar elements not found');
        return;
    }
    // Set initial state - expanded by default
    let isCollapsed = false;
    // Function to toggle sidebar
    function toggleSidebar() {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            container.classList.add('sidebar-collapsed');
            toggleIcon.textContent = '▶';
        }
        else {
            sidebar.classList.remove('collapsed');
            container.classList.remove('sidebar-collapsed');
            toggleIcon.textContent = '◀';
        }
    }
    // Add click event to toggle button
    toggleBtn.addEventListener('click', toggleSidebar);
    // Auto-collapse after 10 seconds on first load
    setTimeout(() => {
        if (!isCollapsed) {
            toggleSidebar();
        }
    }, 10000);
}
//# sourceMappingURL=main.js.map
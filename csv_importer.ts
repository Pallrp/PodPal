///<reference path="main.ts"/>

/**
 * CSV Player Importer for PodPal
 * 
 * This module handles importing player data from CSV files.
 * CSV Format:
 * Name,CEDH,High,Mid,Casual,Blacklist,Whitelist
 * "Player Name",true,true,false,false,"Blacklisted Player","Whitelisted Player"
 */

interface CSVPlayerData {
    name: string;
    powerLevels: {
        cedh: boolean;
        high: boolean;
        mid: boolean;
        casual: boolean;
    };
    blacklist: string[];
    whitelist: string[];
}

/**
 * Parse CSV data into player objects
 */
function parseCSVData(csvText: string): CSVPlayerData[] {
    // Split by lines and remove empty lines
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    
    // Check if we have at least a header line
    if (lines.length < 1) {
        console.error("CSV file is empty or has no header");
        return [];
    }
    
    // Parse header to verify format
    const header = parseCSVLine(lines[0]);
    if (!validateCSVHeader(header)) {
        console.error("CSV header is invalid, expected: Name,CEDH,High,Mid,Casual,Blacklist,Whitelist");
        return [];
    }
    
    const players: CSVPlayerData[] = [];
    
    // Skip header (start at index 1)
    for (let i = 1; i < lines.length; i++) {
        try {
            const line = lines[i];
            const values = parseCSVLine(line);
            
            // Ensure we have enough values
            if (values.length < 7) {
                console.warn(`Line ${i+1} has insufficient values, skipping: ${line}`);
                continue;
            }
            
            const player: CSVPlayerData = {
                name: values[0].trim(),
                powerLevels: {
                    cedh: values[1].toLowerCase() === 'true',
                    high: values[2].toLowerCase() === 'true',
                    mid: values[3].toLowerCase() === 'true',
                    casual: values[4].toLowerCase() === 'true',
                },
                blacklist: parseList(values[5]),
                whitelist: parseList(values[6])
            };
            
            // Add player if they have a name and at least one power level
            if (player.name && (player.powerLevels.cedh || player.powerLevels.high || 
                player.powerLevels.mid || player.powerLevels.casual)) {
                players.push(player);
            } else {
                console.warn(`Line ${i+1} has invalid data, skipping: ${line}`);
            }
        } catch (error) {
            console.error(`Error parsing line ${i+1}: ${error}`);
        }
    }
    
    return players;
}

/**
 * Parse a CSV line, handling quoted fields correctly
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
}

/**
 * Parse comma-separated list from a field, handling quoted names
 */
function parseList(field: string): string[] {
    if (!field.trim()) return [];
    
    // Split by comma and trim each item
    return field.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

/**
 * Validate CSV header format
 */
function validateCSVHeader(header: string[]): boolean {
    const expectedHeader = ['Name', 'CEDH', 'High', 'Mid', 'Casual', 'Blacklist', 'Whitelist'];
    
    // Check if header has the right number of columns
    if (header.length < expectedHeader.length) {
        return false;
    }
    
    // Check that the essential columns are present (first 5)
    for (let i = 0; i < 5; i++) {
        if (header[i].toLowerCase() !== expectedHeader[i].toLowerCase()) {
            return false;
        }
    }
    
    return true;
}

/**
 * Import players from CSV file
 */
async function importPlayersFromCSV(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const csvText = event.target?.result as string;
                if (!csvText) {
                    console.error("Failed to read CSV file");
                    showFeedbackToast("Failed to read CSV file", true);
                    resolve(false);
                    return;
                }
                
                const players = parseCSVData(csvText);
                
                if (players.length === 0) {
                    showFeedbackToast("No valid players found in CSV file", true);
                    resolve(false);
                    return;
                }
                
                // Clear existing players
                clearAllPlayers();
                
                // Add players from CSV
                let addedCount = 0;
                const playerNameMap: Record<string, number> = {};
                
                // First pass: add all players to get their IDs
                players.forEach(player => {
                    const powerLevels: number[] = [];
                    if (player.powerLevels.cedh) powerLevels.push(Powerlevel.COMP);
                    if (player.powerLevels.high) powerLevels.push(Powerlevel.HIGH);
                    if (player.powerLevels.mid) powerLevels.push(Powerlevel.MEDIUM);
                    if (player.powerLevels.casual) powerLevels.push(Powerlevel.CASUAL);
                    
                    const playerId = addPlayerWithId(player.name, powerLevels);
                    if (playerId !== -1) {
                        playerNameMap[player.name] = playerId;
                        addedCount++;
                    }
                });
                
                // Second pass: add blacklists and whitelists
                players.forEach(player => {
                    const playerId = playerNameMap[player.name];
                    if (playerId === undefined) return;
                    
                    // Add blacklists
                    player.blacklist.forEach(targetName => {
                        const targetId = playerNameMap[targetName];
                        if (targetId !== undefined) {
                            addPlayerToList(playerId, targetId, 'blacklist');
                        } else {
                            console.warn(`Blacklist target not found: ${targetName}`);
                        }
                    });
                    
                    // Add whitelists
                    player.whitelist.forEach(targetName => {
                        const targetId = playerNameMap[targetName];
                        if (targetId !== undefined) {
                            addPlayerToList(playerId, targetId, 'whitelist');
                        } else {
                            console.warn(`Whitelist target not found: ${targetName}`);
                        }
                    });
                });
                
                showFeedbackToast(`Successfully imported ${addedCount} players from CSV`, false);
                resolve(true);
            } catch (error) {
                console.error("Error importing players from CSV:", error);
                showFeedbackToast(`Error importing players: ${error}`, true);
                resolve(false);
            }
        };
        
        reader.onerror = () => {
            console.error("Error reading CSV file");
            showFeedbackToast("Error reading CSV file", true);
            resolve(false);
        };
        
        reader.readAsText(file);
    });
}

// Add these functions to modify UI elements
function clearAllPlayers(): void {
    const playerContainer = document.getElementById('players-container');
    if (playerContainer) {
        while (playerContainer.firstChild) {
            playerContainer.removeChild(playerContainer.firstChild);
        }
    }
    
    // Reset player count
    playerCount = 0;
    
    // Clear PLAYERS dictionary
    PLAYERS = {};
}

// Interface with main.ts to add players
// Returns the player ID if successful, -1 otherwise
function addPlayerWithId(name: string, powerLevels: number[]): number {
    // Create a new player element
    const playerEl = document.createElement('div');
    playerEl.className = 'player-container-instance row d-flex my-1';
    
    // Generate a unique ID
    const playerId = playerCount++;
    playerEl.id = `player-${playerId}`;
    
    // Set player name
    const nameContainer = document.createElement('span');
    nameContainer.className = 'player-name-container col-6';
    const nameP = document.createElement('p');
    nameP.className = 'ps-2 player-name m-0';
    nameP.textContent = name;
    nameContainer.appendChild(nameP);
    playerEl.appendChild(nameContainer);
    
    // Set power levels
    const powerContainer = document.createElement('span');
    powerContainer.className = 'col-3 player-power-container';
    
    // Sort power levels from highest to lowest
    powerLevels.sort((a, b) => b - a);
    
    // Add power pills
    powerLevels.forEach(power => {
        const powerPill = document.createElement('div');
        powerPill.className = `powerpill ${getPowerClass(power)}`;
        powerPill.setAttribute('value', power.toString()); // Set the value attribute
        powerPill.textContent = getPowerVerboseName(power)[0]; // First letter only
        powerContainer.appendChild(powerPill);
    });
    
    playerEl.appendChild(powerContainer);
    
    // Add blacklist/whitelist buttons
    const blacklistBtn = document.createElement('button');
    blacklistBtn.className = 'col-1 blacklistbutton listbutton';
    blacklistBtn.type = 'button';
    blacklistBtn.textContent = 'BL';
    playerEl.appendChild(blacklistBtn);
    
    const whitelistBtn = document.createElement('button');
    whitelistBtn.className = 'col-1 whitelistbutton listbutton';
    whitelistBtn.type = 'button';
    whitelistBtn.textContent = 'WL';
    playerEl.appendChild(whitelistBtn);
    
    // Add remove button
    const rmContainer = document.createElement('span');
    rmContainer.className = 'col-1 player-rm-container';
    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'rm-player-btn btn-remove';
    rmBtn.textContent = 'X';
    rmContainer.appendChild(rmBtn);
    playerEl.appendChild(rmContainer);
    
    // Add blacklist/whitelist containers
    const blacklistContainer = document.createElement('div');
    blacklistContainer.className = 'd-none blacklist-container listcontainer row';
    const blacklistCol1 = document.createElement('div');
    blacklistCol1.className = 'col-1 white';
    const blacklistCol2 = document.createElement('div');
    blacklistCol2.className = 'col-11';
    const blacklistInner = document.createElement('div');
    blacklistInner.className = 'blacklist listcontainer-inner';
    blacklistCol2.appendChild(blacklistInner);
    blacklistContainer.appendChild(blacklistCol1);
    blacklistContainer.appendChild(blacklistCol2);
    playerEl.appendChild(blacklistContainer);
    
    const whitelistContainer = document.createElement('div');
    whitelistContainer.className = 'd-none whitelist-container listcontainer row';
    const whitelistCol1 = document.createElement('div');
    whitelistCol1.className = 'col-1 white';
    const whitelistCol2 = document.createElement('div');
    whitelistCol2.className = 'col-11';
    const whitelistInner = document.createElement('div');
    whitelistInner.className = 'whitelist listcontainer-inner';
    whitelistCol2.appendChild(whitelistInner);
    whitelistContainer.appendChild(whitelistCol1);
    whitelistContainer.appendChild(whitelistCol2);
    playerEl.appendChild(whitelistContainer);
    
    // Add to players container
    const playersContainer = document.getElementById('players-container');
    if (playersContainer) {
        playersContainer.appendChild(playerEl);
        
        // Add event listeners
        blacklistBtn.addEventListener('click', () => {
            showPlayerSelectionDropdown(playerEl, 'blacklist');
        });
        
        whitelistBtn.addEventListener('click', () => {
            showPlayerSelectionDropdown(playerEl, 'whitelist');
        });
        
        rmBtn.addEventListener('click', () => {
            removePlayer(playerEl.id);
        });
    }
    
    return playerId;
}

// Add a player to another player's blacklist or whitelist
function addPlayerToList(sourcePlayerId: number, targetPlayerId: number, listType: 'blacklist' | 'whitelist'): void {
    try {
        // Find the source player element
        const sourcePlayerEl = document.getElementById(`player-${sourcePlayerId}`);
        const targetPlayerEl = document.getElementById(`player-${targetPlayerId}`);
        
        if (!sourcePlayerEl || !targetPlayerEl) {
            console.warn(`Player elements not found for IDs ${sourcePlayerId} and ${targetPlayerId}`);
            return;
        }
        
        // Add to the appropriate list
        if (listType === 'blacklist') {
            addBlackList(sourcePlayerEl, targetPlayerEl);
        } else {
            addWhiteList(sourcePlayerEl, targetPlayerEl);
        }
    } catch (error) {
        console.error(`Error adding player ${targetPlayerId} to ${listType} of player ${sourcePlayerId}:`, error);
    }
}

// Event listener for CSV file import button
document.addEventListener('DOMContentLoaded', () => {
    const importButton = document.createElement('button');
    importButton.id = 'import-csv-button';
    importButton.className = 'btn btn-info mt-2';
    importButton.textContent = 'Import CSV';
    
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.id = 'csv-file-input';
    importInput.accept = '.csv';
    importInput.style.display = 'none';
    
    importButton.addEventListener('click', () => {
        importInput.click();
    });
    
    importInput.addEventListener('change', async (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            const file = target.files[0];
            await importPlayersFromCSV(file);
            target.value = ''; // Reset the input
        }
    });
    
    // Add to form container
    const formContainer = document.getElementById('form-container');
    if (formContainer) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-3';
        buttonContainer.appendChild(importButton);
        buttonContainer.appendChild(importInput);
        formContainer.appendChild(buttonContainer);
    }
}); 
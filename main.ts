///<reference path="agent.ts"/>

const playerTemplateEl = (document.getElementById('player-container-template') as HTMLElement);
const playerContainer = (document.getElementById('players-container') as HTMLElement);
const listTemplateEl = (document.getElementById('list-template') as HTMLElement);
const solutionTableTemplate = (document.getElementById('solution-table-template') as HTMLElement);
const solutionSeatTemplate = (document.getElementById('solution-seat-template') as HTMLElement);
const solutionStage = (document.getElementById('staged-solution') as HTMLElement);
const solutionsList = (document.getElementById('solutions-area') as HTMLElement);
const solutionButton = (document.getElementById('solution-button-template') as HTMLElement);
const stagedSolutionTitleEl = (document.getElementById('solution-number') as HTMLElement);
const loadingSpinner = (document.getElementById('loading-spinner') as HTMLElement);
const searchBtns = (document.getElementsByClassName('search-btn') as HTMLCollection);
var playerCount = 0;

function loadPage() : void {
    addPowerSelections();
    addButtonEvents();
    bindSearch();
    addPlayer("Actual Brainrot", Powerlevel.MEDIUM);
    addPlayer("Bruhman Lower", Powerlevel.MEDIUM);
    addPlayer("Chad.", Powerlevel.COMP);
    addPlayer("Flip", Powerlevel.COMP);
    addPlayer("Chud", Powerlevel.COMP);
    addPlayer("John Doe", Powerlevel.MEDIUM);
    addPlayer("John Die", Powerlevel.MEDIUM);
    addPlayer("John Deo", Powerlevel.MEDIUM);
    addPlayer("John Don", Powerlevel.MEDIUM);
    addPlayer("Average Player (Derogatory)", Powerlevel.MEDIUM);
    addPlayer("John Rizzman", Powerlevel.COMP);
    addPlayer("Maximus Timmy", Powerlevel.CASUAL);
    addPlayer("Scrat", Powerlevel.HIGH);
    addPlayer("Scrut", Powerlevel.HIGH);
    addPlayer("Skibidi", Powerlevel.HIGH);
    addPlayer("Zoomer Zubar", Powerlevel.CASUAL);
    addPlayer("Casual", Powerlevel.CASUAL);
    addPlayer("Filthy Casual", Powerlevel.CASUAL);
}

function clearForm(formId:string) : void {
    let form = document.getElementById(formId);
    if (form !== null) {
        form.querySelectorAll('input').forEach((target) => {
            target.value = "";
        });
        form.querySelectorAll('select').forEach((target) => {
            target.querySelectorAll('option').forEach((optTarget) => {
                optTarget.selected = false;
            });
        });
    }
}

function addButtonEvents() : void {
    let addPlayerButton = document.getElementById('submit-player');
    if (addPlayerButton !== null) {
        addPlayerButton.addEventListener("click", (ev) => {
            let playerName = (document.getElementById('add-player-name') as HTMLInputElement).value;
            let playerPower = (document.getElementById('add-player-power') as HTMLOptionElement).value;
            console.log(playerName + "-" + playerPower);
            if (playerName && playerPower) {

                addPlayer(playerName, Number(playerPower));
                clearForm('add-player-form');
            }
        });
    }
}

function addPowerSelections() : void {
    let powerSelect = document.getElementById("add-player-power");
    if (powerSelect !== null) {
        for (const [key, value] of Object.entries(Powerlevel)) {
            let powerName:string = getPowerVerboseName(value);
            let optionEl:HTMLElement = document.createElement('option');
            optionEl.setAttribute('value', String(value));
            optionEl.innerHTML = powerName;
            powerSelect.appendChild(optionEl);
        }
    }
}

const Powerlevel = {
    CASUAL: 1,
    MEDIUM: 2,
    HIGH: 3,
    COMP: 4
};

function getPowerClass(powerLevel:number) : string {
    let powerStr = "power-"
    let level = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):   level = "casual";   break;
        case (Powerlevel.MEDIUM):   level = "medium";   break;
        case (Powerlevel.HIGH):     level = "high";     break;
        case (Powerlevel.COMP):     level = "comp";     break;
        default:                    level = "err";      break;
    }
    return powerStr + level;
}

function getPowerVerboseName(powerLevel:number) : string {
    let powerStr = ""
    switch (powerLevel) {
        case (Powerlevel.CASUAL):   powerStr = "Casual"; break;
        case (Powerlevel.MEDIUM):   powerStr = "Medium";        break;
        case (Powerlevel.HIGH):     powerStr = "High";          break;
        case (Powerlevel.COMP):     powerStr = "CEDH";          break;
        default:                    powerStr = "Error";         break;
    }
    return powerStr;
}

function removePlayer(playerId:string) : void {
    let p = (document.getElementById(playerId) as HTMLElement);
    let listId = getListId(p);
    // remove player
    p.remove();
    // remove all list elements
    let listElems = document.getElementsByClassName(listId)
    while (listElems.length > 0) {
        listElems[0].parentNode?.removeChild(listElems[0]);
    }
}

function sortPlayers() :void {
    let playerList = playerContainer.children;
    let playerArray = Array.from(playerList);
    playerArray = playerArray.sort((a, b) => {
        let aName = a.querySelector('.player-name')?.innerHTML;
        let bName = b.querySelector('.player-name')?.innerHTML;
        if (aName && bName) {
            aName = aName.trim();
            bName = bName.trim();
            return ('' + bName).localeCompare(aName);
        }
        return 0;
    });
    playerArray.reduce((prev:null|Element, next) => {
        if (prev == null) {
            playerContainer.insertBefore(playerContainer.children[0], next)
        } else {
            playerContainer.insertBefore(next, prev);
        }
        return next;
    }, null);
}

function addPlayer(name:string, powerLevel:number) : void {
    playerCount++;
    let newPlayerEl = (playerTemplateEl.cloneNode(true) as HTMLElement);
    // replace template id
    let newId = "player-" + playerCount;
    newPlayerEl.setAttribute('id', newId);
    // add attributes
    (newPlayerEl.querySelector('.player-name') as HTMLElement).innerHTML = name;

    let levelCls = getPowerClass(powerLevel);
    let levelName = getPowerVerboseName(powerLevel);
    let powerContainer = (newPlayerEl.querySelector('.player-power-container') as HTMLElement);
    powerContainer.classList.add(levelCls);
    powerContainer.innerHTML = levelName;
    powerContainer.setAttribute('value', String(powerLevel));
    
    // add remove button functionalities
    newPlayerEl.querySelector('.rm-player-btn')?.addEventListener("click", function (ev) {
        removePlayer(newId);
    });
    let blacklist:HTMLElement, whitelist:HTMLElement;
    blacklist = (newPlayerEl.querySelector('.blacklist-container') as HTMLElement);
    whitelist = (newPlayerEl.querySelector('.whitelist-container') as HTMLElement);
    newPlayerEl.querySelector('.blacklistbutton')?.addEventListener("click", function (ev) {
        toggleListVisibility(blacklist)
    });
    newPlayerEl.querySelector('.whitelistbutton')?.addEventListener("click", function (ev) {
        toggleListVisibility(whitelist)
    });

    // Add drag & drop white/blacklist functionalities
    newPlayerEl.setAttribute('draggable', 'true');
    newPlayerEl.addEventListener('dragstart', dragListPlayer);
    newPlayerEl.addEventListener('dragover', (ev) => {ev.preventDefault()});
    newPlayerEl.addEventListener('drop', dropListPlayer);

    // add node to player list
    playerContainer.appendChild(newPlayerEl);
    sortPlayers();
}

function listsContains(player1:HTMLElement, player2:HTMLElement): boolean {
    
    var playerId:string = getListId(player2);
    let children = player1.querySelector('.whitelist')?.children;
    if (children != undefined) {
        for (let i=0; i<children.length; i++){
            if (children[i].classList.contains(playerId)) {
                // cannot add whitelisted player to blacklist
                return true;
            }
        }
    }
    children = player1.querySelector('.blacklist')?.children;
    if (children != undefined) {
        for (let i=0; i<children.length; i++){
            if (children[i].classList.contains(playerId)) {
                // cannot add blacklisted player to blacklist
                return true;
            }
        }
    }
    return false;
}

function addBlackList(playerEl1:HTMLElement, playerEl2:HTMLElement) : void {
    if (listsContains(playerEl1, playerEl2)) {
        return;
    }
    addListPlayer('.blacklist', playerEl1, playerEl2);
}

function addWhiteList(playerEl1:HTMLElement, playerEl2:HTMLElement) : void {
    if (listsContains(playerEl1, playerEl2)) {
        return;
    }
    addListPlayer('.whitelist', playerEl1, playerEl2);
}

function getListId(playerEl:HTMLElement) : string {
    return "list-" + String(playerEl.getAttribute('id'));
}

function addListPlayer(
    list:string,
    playerEl1:HTMLElement,
    playerEl2:HTMLElement
) : void {
    let newListP1:HTMLElement = (listTemplateEl.cloneNode(true) as HTMLElement);
    let newListP2:HTMLElement = (listTemplateEl.cloneNode(true) as HTMLElement);
    // set attributes
    (newListP1.querySelector('.player-list-name') as HTMLElement).innerHTML = String(playerEl1.querySelector('.player-name')?.innerHTML);
    newListP1.classList.add(getListId(playerEl1));
    newListP1.setAttribute('value', String(playerEl2.getAttribute('id')));
    (newListP2.querySelector('.player-list-name') as HTMLElement).innerHTML = String(playerEl2.querySelector('.player-name')?.innerHTML);
    newListP2.classList.add(getListId(playerEl2));
    newListP2.setAttribute('value', String(playerEl1.getAttribute('id')));
    // add remove button event
    (newListP1.querySelector('.rm-list-btn') as HTMLElement).addEventListener(
        'click', (ev) => {removeListPlayer(list, playerEl1, newListP1, playerEl2, newListP2);}
    );
    (newListP2.querySelector('.rm-list-btn') as HTMLElement).addEventListener(
        'click', (ev) => {removeListPlayer(list, playerEl1, newListP1, playerEl2, newListP2);}
    );
    // add to eachother list
    playerEl1.querySelector(list)?.appendChild(newListP2);
    playerEl2.querySelector(list)?.appendChild(newListP1);
    // increment counters
    let listbutton1 = (playerEl1.querySelector(list+'button') as HTMLElement);
    let listbutton2 = (playerEl2.querySelector(list+'button') as HTMLElement);
    for (let listbtn of Array.from([listbutton1, listbutton2])) {
        let listHTML:string = listbtn.innerHTML;
        let listNum:string|undefined,
            listStr:string;
        [listStr, listNum] = listHTML.split(":");
        if (listNum === undefined) {
            listNum = "0";
        }
        listHTML = listStr + ":" + String(Number(listNum) + 1);
        listbtn.innerHTML = listHTML;
    }
}

function removeListPlayer(
    list:string,
    pEl1:HTMLElement,
    pListEl1:HTMLElement,
    pEl2:HTMLElement,
    pListEl2:HTMLElement
) : void {
    pListEl1.remove();
    pListEl2.remove();
    // decrement button counter
    
    let listbutton1 = (pEl1.querySelector(list+'button') as HTMLElement);
    let listbutton2 = (pEl2.querySelector(list+'button') as HTMLElement);
    for (let listbtn of Array.from([listbutton1, listbutton2])) {
        let listHTML:string = listbtn.innerHTML;
        let listNum:string|undefined,
            listStr:string;
        [listStr, listNum] = listHTML.split(":");
        listNum = String(Number(listNum) - 1);
        if (listNum === "0") {
            listHTML = listStr;
        } else {
            listHTML = listStr + ":" + listNum;
        }
        listbtn.innerHTML = listHTML;
    }
}

function toggleListVisibility(listEl:HTMLElement) : void {
    listEl.classList.toggle('d-none');
}

function dropListPlayer(event:DragEvent) : void {
    event.preventDefault();
    let sourceId:string|undefined = event.dataTransfer?.getData('text/plain');
    if (sourceId) {
        const playerDragged = (document.getElementById(sourceId) as HTMLElement);
        let trg = (event.target as HTMLElement);
        if (!Boolean(playerDragged.classList.contains('player-container-instance'))) {
            return;
        }
        if (trg.closest('#players-container') != null) {
            var addFunction:(player1El:HTMLElement, player2El:HTMLElement) => void;
            if (trg.closest('.listcontainer') != null) {
                // dropped in list container
                if (trg.closest('.listcontainer')?.classList.contains('whitelist-container')) {
                    addFunction = addWhiteList;
                } else {
                    addFunction = addBlackList;
                }
            } else if (trg.classList.contains('listbutton')) {
                // dropped on buttons
                if (trg.classList.contains('blacklistbutton')) {
                    addFunction = addBlackList;
                } else {
                    addFunction = addWhiteList;
                }
            } else {
                // bad drop
                return;
            }
            const playerDropped = (trg.closest('.player-container-instance') as HTMLElement);
            addFunction(playerDragged, playerDropped)
        }
    }
}

function dragListPlayer(event:DragEvent) : void {
    event.dataTransfer?.setData("text/plain", (event.target as HTMLElement).id);
}

var Solutions:Array<Array<Array<number>>> = [];
var solutionScores:Array<number> = [];
function newSolution(seatings:Array<Array<number>>, score:number) : void {
    Solutions.push(seatings);
    solutionScores.push(score);
    let i:number = Solutions.length - 1;
    let newButton:HTMLElement = (solutionButton.cloneNode(true) as HTMLElement);
    newButton.setAttribute('id', String(i));
    newButton.innerHTML += String(i + 1) + " - score: " + String(score);
    newButton.addEventListener('click', (ev) => {stageSolution(i)});
    solutionsList.appendChild(newButton);
    if (solutionStage.innerHTML === "") {
        stageSolution(i);
    }

}

function dragStagedPlayer(event:DragEvent) : void {
    let playerEl:HTMLElement = (event.target as HTMLElement);
    event.dataTransfer?.setData("text/plain", playerEl.id);
}

function dropStagedPlayer(event:DragEvent) : void {
    event.preventDefault();
    var playerEl:HTMLElement, toTable:HTMLElement;
    if (event.dataTransfer?.getData("text/plain")) {
        playerEl = (document.getElementById(event.dataTransfer.getData('text/plain')) as HTMLElement);
        if (playerEl.classList.contains("solution-seat")) {
            var tableSeatsContainer = (event.target as HTMLElement).closest(".solution-seats-container");
            if (tableSeatsContainer && !tableSeatsContainer.contains(playerEl)) {
                toTable = (tableSeatsContainer as HTMLElement);
                toTable.appendChild(playerEl);
            }
        }
    }
}

function stageSolution(solutionIndex:number) : void {
    stagedSolutionTitleEl.innerHTML = "Solution #" + String(solutionIndex + 1) + " - score: " + solutionScores[solutionIndex];
    solutionStage.innerHTML = "";
    let tempId = 0;
    for (let tableArray of Solutions[solutionIndex]) {
        if (tableArray.length === 0) {
            continue;
        }
        let newSolutionTable:HTMLElement = (solutionTableTemplate.cloneNode(true) as HTMLElement);
        newSolutionTable.removeAttribute('id');
        let solutionSeats = (newSolutionTable.querySelector('.solution-seats-container') as HTMLElement);
        solutionStage.appendChild(newSolutionTable);
        solutionSeats.addEventListener('drop', dropStagedPlayer);
        solutionSeats.addEventListener('dragover', (ev) => {ev.preventDefault();});

        for (let seat of tableArray) {
            let newSolutionSeat:HTMLElement = (solutionSeatTemplate.cloneNode(true) as HTMLElement);
            newSolutionSeat.setAttribute('id', 'staged-' + String(tempId));
            tempId++;
            let playerEl = (document.getElementById('player-' + String(seat)) as HTMLElement);
            let playerName:string;
            if (playerEl) {
                playerName = String(playerEl.querySelector('.player-name')?.innerHTML);
            } else {
                playerName = "Error";
            }
            let seatNameEl = newSolutionSeat.querySelector('.solution-name')
            if (seatNameEl) {
                seatNameEl.innerHTML = playerName;
            }
            // set powerlevel
            let playerPower = (playerEl.querySelector('.player-power-container') as HTMLElement).getAttribute("value");
            newSolutionSeat.classList.add(
                getPowerClass(Number(playerPower))
            );
            // add drag events    
            newSolutionSeat.setAttribute('draggable', 'true');
            newSolutionSeat.addEventListener('dragstart', dragStagedPlayer);
            newSolutionSeat.addEventListener('dragover', (ev) => {ev.preventDefault();});

            // add to seat
            solutionSeats.appendChild(newSolutionSeat);
        }

    }
}

function resetSolutions() : void {
    solutionStage.innerHTML = ""; // clean staged solution
    solutionsList.innerHTML = ""; // clean solution buttons
    stagedSolutionTitleEl.innerHTML = ""; // clean solution number title
    Solutions = []; // clear cached solutions
    solutionScores = [];
}

function toggleLoad() : void {
    loadingSpinner.classList.toggle('d-none');
    for (let i = 0; i < searchBtns.length; i++) {
        searchBtns[i].classList.toggle('d-none');
    }
}

function bindSearch() : void {
    document.getElementById('activate-search-agent')?.addEventListener('click', () => {
        newSearch("astar");        
    });
    document.getElementById('activate-random-agent')?.addEventListener('click', () => {
        newSearch("random");
    })
}

function newSearch(agent:string) : void {
    toggleLoad();
    resetSolutions(); // reset before search
    setTimeout(() => {
        doSearch(agent);
        toggleLoad();
    }, 10);
}

document.addEventListener('DOMContentLoaded', () => {
    loadPage();

});

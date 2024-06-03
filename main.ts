function loadPage() : undefined {
    addPowerSelections();
    addButtonEvents();
    addPlayer("Maximus Timmy", Powerlevel.CASUAL);
    addPlayer("Zoomer Zubar", Powerlevel.CASUAL);
    addPlayer("Bruhman Lower", Powerlevel.MEDIUM);
    addPlayer("Actual Brainrot", Powerlevel.MEDIUM);
    addPlayer("Scrat", Powerlevel.HIGH);
    addPlayer("Scrut", Powerlevel.HIGH);
    addPlayer("Skibidi", Powerlevel.HIGH);
    addPlayer("John Doe", Powerlevel.MEDIUM);
    addPlayer("John Rizzman", Powerlevel.COMP);
    addPlayer("Chad.", Powerlevel.COMP);
}

function clearForm(formId:string) {
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

function addButtonEvents() {
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

function addPowerSelections() {
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
const playerTemplateEl = (document.getElementById('player-container-template') as HTMLElement);
const playerContainer = (document.getElementById('players-container') as HTMLElement);
const listTemplateEl = (document.getElementById('list-template') as HTMLElement);
var playerCount = 0;

const Powerlevel = {
    CASUAL: 1,
    MEDIUM: 2,
    HIGH: 3,
    COMP: 4
};

function getPowerClass(powerLevel:number) {
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

function getPowerVerboseName(powerLevel:number):string {
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

function removePlayer(playerId:string):undefined {
    let p = document.getElementById(playerId)
    if (p !== null) {
        p.remove();
    }
}

function sortPlayers() {
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

function addPlayer(name:string, powerLevel:number) {
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
    newPlayerEl.addEventListener('dragover', dropListPlayer);

    // add node to player list
    playerContainer.appendChild(newPlayerEl);
    sortPlayers();
}

function addBlackList(playerEl1:HTMLElement, playerEl2:HTMLElement) {
    addListPlayer('blacklist', playerEl1, playerEl2);
}


function addWhiteList(playerEl1:HTMLElement, playerEl2:HTMLElement) {
    addListPlayer('whitelist', playerEl1, playerEl2);
}

function addListPlayer(list:string, playerEl1:HTMLElement, playerEl2:HTMLElement) {
    let newListP1:HTMLElement = (listTemplateEl.cloneNode() as HTMLElement);
    let newListP2:HTMLElement = (listTemplateEl.cloneNode() as HTMLElement);
    // set attributes
    (newListP1.querySelector('.player-list-name') as HTMLElement).innerHTML = String(playerEl1.querySelector('.player-name')?.innerHTML);
    newListP1.setAttribute('value', String(playerEl2.getAttribute('id')));
    (newListP2.querySelector('.player-list-name') as HTMLElement).innerHTML = String(playerEl2.querySelector('.player-name')?.innerHTML);
    newListP2.setAttribute('value', String(playerEl1.getAttribute('id')));
    // add remove button event
    (newListP1.querySelector('.rm-list-btn') as HTMLElement).addEventListener(
        'click', (ev) => {removeListPlayer(playerEl1, playerEl2);}
    );
    (newListP2.querySelector('.rm-list-btn') as HTMLElement).addEventListener(
        'click', (ev) => {removeListPlayer(playerEl1, playerEl2);}
    );
    // add to eachother list

}

function toggleListVisibility(listEl:HTMLElement) {
    listEl.classList.toggle('d-none');
}

function removeListPlayer(p1El:HTMLElement, p2El:HTMLElement) {

}

function dropListPlayer(event:Event) {

}

function dragListPlayer(event:DragEvent) {
}

loadPage();